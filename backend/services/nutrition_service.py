import os
import httpx
import time
from typing import List, Dict, Any, Optional

class NutritionService:
    """
    Service for fetching nutrition data from Spoonacular API
    Optimized for faster responses with connection pooling and retry logic
    """
    
    def __init__(self):
        self.api_key = os.getenv("SPOONACULAR_API_KEY")
        if not self.api_key:
            raise ValueError("SPOONACULAR_API_KEY not found in environment variables")
        
        self.base_url = "https://api.spoonacular.com/recipes/analyze"
        
        # Use httpx with connection pooling for better performance
        self.client = httpx.Client(
            timeout=httpx.Timeout(25.0, connect=5.0),  # Reduced timeout, faster failure
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            follow_redirects=True
        )
        
        # Nutrient name mapping for faster lookup
        self.nutrient_map = {
            "calories": ["calories", "energy"],
            "protein": ["protein"],
            "carbs": ["carbohydrate", "carbs", "carbohydrates"],
            "fats": ["fat", "total fat"],
            "fiber": ["fiber", "dietary fiber"],
            "sugar": ["sugar", "sugars"]
        }
        
        print("NutritionService initialized with Spoonacular API (optimized)")
    
    def __del__(self):
        """Clean up HTTP client on destruction"""
        if hasattr(self, 'client'):
            try:
                self.client.close()
            except:
                pass
    
    def _format_ingredients_for_spoonacular(self, ingredients: List[Dict[str, Any]]) -> List[str]:
        """
        Format ingredients list for Spoonacular API
        
        Args:
            ingredients: List of ingredient dicts with name, quantity, unit
        
        Returns:
            List of formatted ingredient strings
        """
        formatted = []
        for ing in ingredients:
            name = ing.get("name", "")
            quantity = ing.get("quantity", "")
            unit = ing.get("unit", "")
            
            if unit:
                formatted.append(f"{quantity} {unit} {name}")
            else:
                formatted.append(f"{quantity} {name}")
        
        return formatted
    
    def _format_instructions(self, steps: List[Dict[str, Any]]) -> str:
        """
        Format recipe steps into instruction string
        
        Args:
            steps: List of step dicts with step_number and instruction
        
        Returns:
            Formatted instruction string
        """
        instructions = []
        for step in sorted(steps, key=lambda x: x.get("step_number", 0)):
            instruction = step.get("instruction", "")
            if instruction:
                instructions.append(instruction)
        
        return ". ".join(instructions) + "."
    
    def _extract_nutrition_data(self, nutrients: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Extract nutrition data from nutrients list using optimized lookup
        
        Args:
            nutrients: List of nutrient dicts from Spoonacular API
        
        Returns:
            Dictionary with nutrition values
        """
        nutrition_dict = {
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fats": 0,
            "fiber": 0,
            "sugar": 0
        }
        
        # Create reverse lookup: nutrient name -> nutrition key
        name_to_key = {}
        for key, names in self.nutrient_map.items():
            for name in names:
                name_to_key[name] = key
        
        # Extract macronutrients with optimized lookup
        for nutrient in nutrients:
            name = nutrient.get("name", "").lower().strip()
            amount = nutrient.get("amount", 0)
            
            # Direct lookup in map
            for mapped_name, key in name_to_key.items():
                if mapped_name in name:
                    nutrition_dict[key] = round(amount, 2)
                    break  # Found match, move to next nutrient
        
        return nutrition_dict
    
    def get_recipe_nutrition(
        self,
        ingredients: List[Dict[str, Any]],
        steps: List[Dict[str, Any]],
        title: str,
        servings: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get nutrition data from Spoonacular API with retry logic and connection pooling
        
        Args:
            ingredients: List of ingredient dicts
            steps: List of step dicts
            title: Recipe title
            servings: Number of servings
        
        Returns:
            Dictionary with nutrition data, or None if API call fails
        """
        print(f"Fetching nutrition data from Spoonacular for: {title}")
        
        # Format ingredients and instructions once
        formatted_ingredients = self._format_ingredients_for_spoonacular(ingredients)
        instructions = self._format_instructions(steps)
        
        # Prepare payload
        payload = {
            "title": title,
            "servings": servings,
            "ingredients": formatted_ingredients,
            "instructions": instructions
        }
        
        # API parameters
        params = {
            "apiKey": self.api_key,
            "includeNutrition": "true"
        }
        
        max_retries = 2
        for attempt in range(max_retries):
            try:
                # Make API call with connection pooling
                response = self.client.post(
                    self.base_url,
                    json=payload,
                    params=params
                )
                
                print(f"Spoonacular API response status: {response.status_code} (attempt {attempt + 1})")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Extract nutrition information
                    nutrition = data.get("nutrition", {})
                    nutrients = nutrition.get("nutrients", [])
                    
                    if not nutrients:
                        print("Warning: No nutrients found in API response")
                        return None
                    
                    # Extract nutrition data using optimized method
                    nutrition_dict = self._extract_nutrition_data(nutrients)
                    
                    print(f"Nutrition data extracted successfully: {nutrition_dict}")
                    return nutrition_dict
                    
                elif response.status_code == 429:  # Rate limited
                    wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s
                    print(f"Rate limited, waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                elif response.status_code == 402:  # Quota exceeded
                    print("Spoonacular API quota exceeded")
                    return None
                else:
                    print(f"Spoonacular API returned error: {response.status_code}")
                    if attempt < max_retries - 1:
                        time.sleep(1)  # Brief wait before retry
                        continue
                    return None
            
            except httpx.TimeoutException:
                print(f"Spoonacular API request timed out (attempt {attempt + 1})")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                return None
            except httpx.RequestError as e:
                print(f"Spoonacular API request failed: {str(e)} (attempt {attempt + 1})")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                return None
            except Exception as e:
                print(f"Error processing nutrition data: {str(e)} (attempt {attempt + 1})")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                return None
        
        return None

# Global instance - will be initialized on first use
_nutrition_service_instance: Optional[NutritionService] = None

def get_nutrition_service() -> NutritionService:
    """Get or create the global nutrition service instance"""
    global _nutrition_service_instance
    if _nutrition_service_instance is None:
        _nutrition_service_instance = NutritionService()
    return _nutrition_service_instance

# Don't instantiate at import time - let it be lazy-loaded when needed
# nutrition_service = get_nutrition_service()  # Removed to prevent import-time errors

