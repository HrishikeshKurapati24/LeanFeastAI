from typing import Optional
import requests
import time
import base64
from urllib.parse import quote

class ImageService:
    """
    Service for generating recipe images using pollinations.ai API with flux model
    """
    
    def __init__(self):
        print("ImageService initialized with pollinations.ai flux model")
    
    def generate_recipe_image(
        self,
        meal_name: str,
        description: str
    ) -> Optional[str]:
        """
        Generate an image for a recipe using pollinations.ai API with flux model
        
        Args:
            meal_name: Name of the meal
            description: Description of the meal (kept for backward compatibility, not used)
        
        Returns:
            Base64 encoded image string, or None if generation fails
        """
        print(f"Generating image for recipe: {meal_name}")
        
        base_prompt = (
            f"Top-down professional food photography of {meal_name}, "
            f"natural colors, realistic textures, authentic ingredients, "
            f"soft natural lighting, high detail, 8k ultra-realistic, "
            f"dish only, no extra objects, no text, no labels"
        )
        
        # Generate seed for unique results
        seed = int(time.time())
        
        # URL encode the prompt for use in URL path (pollinations.ai requires prompt in path)
        encoded_prompt = quote(base_prompt, safe='')
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        
        params = {
            "model": "flux",
            "width": 1024,
            "height": 1024,
            "seed": seed,
            "nologo": "true"
        }
        
        try:
            # Send GET request
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                # Convert binary image data to base64
                image_base64 = base64.b64encode(response.content).decode()
                print(f"Image generation successful for: {meal_name}")
                return image_base64
            else:
                print(f"Error: Status {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Failed to generate image for {meal_name}: {e}")
            return None

# Global instance - will be initialized on first use
_image_service_instance: Optional[ImageService] = None

def get_image_service() -> ImageService:
    """Get or create the global image service instance"""
    global _image_service_instance
    if _image_service_instance is None:
        _image_service_instance = ImageService()
    return _image_service_instance

# Don't instantiate at import time - let it be lazy-loaded when needed
# image_service = get_image_service()  # Removed to prevent import-time errors
