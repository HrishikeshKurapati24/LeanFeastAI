import os
import time
from typing import Dict, List, Any, Optional, Literal
from pydantic import BaseModel, Field, ValidationError
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.output_parsers import PydanticOutputParser
from langchain_core.exceptions import LangChainException
import json

# Pydantic model for structured recipe output
class RecipeStep(BaseModel):
    step_number: int = Field(description="Step number")
    instruction: str = Field(description="Step instruction")
    step_type: Literal["active", "passive", "wait"] = Field(
        description="Step type classification: 'active' (user performs actions like chopping, stirring), 'passive' (requires monitoring like simmering, baking), or 'wait' (pure waiting with no engagement like resting, marinating)"
    )

class Ingredient(BaseModel):
    name: str = Field(description="Ingredient name")
    quantity: str = Field(description="Quantity with unit (e.g., '2 cups', '500g')")
    unit: Optional[str] = Field(description="Unit of measurement", default=None)

class RecipeOutput(BaseModel):
    title: str = Field(description="Name of the meal")
    description: str = Field(description="Description of the meal")
    prep_time: int = Field(description="Preparation time in minutes")
    cook_time: int = Field(description="Cooking time in minutes")
    ingredients: List[Ingredient] = Field(description="List of ingredients with quantities")
    steps: List[RecipeStep] = Field(description="List of cooking steps")
    tags: List[str] = Field(description="Tags like vegan, gluten-free, spicy, etc.")
    serving_size: int = Field(description="Number of servings")

class Change(BaseModel):
    type: str = Field(description="Type of change (e.g., 'substitution', 'modification', 'nutrition')")
    description: str = Field(description="Description of the change made")
    emoji: str = Field(description="Emoji representing the change")

class OptimizedRecipeOutput(BaseModel):
    original: RecipeOutput = Field(description="Original recipe parsed from description")
    optimized: RecipeOutput = Field(description="Optimized recipe")
    changes: List[Change] = Field(description="List of changes made during optimization")

class RecipeService:
    """
    Service for generating recipes using LangChain and Gemini API
    Optimized with retry logic and better error handling
    """
    
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Initialize Gemini LLM
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=self.gemini_api_key,
            temperature=0.7,
            timeout=60.0  # 60 second timeout for LLM calls
        )
        
        # Initialize output parser
        self.output_parser = PydanticOutputParser(pydantic_object=RecipeOutput)
        
        # Initialize output parser for optimization
        self.optimize_output_parser = PydanticOutputParser(pydantic_object=OptimizedRecipeOutput)
        
        # Cache prompt templates (built once, reused)
        self._prompt_template_cache = None
        self._optimize_prompt_template_cache = None
        self._replace_ingredients_prompt_template_cache = None
        
        print("RecipeService initialized with Gemini model (optimized)")
    
    def _build_prompt_template(self) -> PromptTemplate:
        """Build LangChain prompt template for recipe generation (cached)"""
        if self._prompt_template_cache is not None:
            return self._prompt_template_cache
        
        template = """You are an expert Indian chef and recipe creator. Generate a detailed, accurate, 
and flavorful recipe strictly based on the User Requirements.

-----------------------------------
USER INPUT
-----------------------------------
User Requirements:
{user_requirements_section}

User Profile & Preferences:
- Dietary Preferences: {dietary_preferences}
- Health Goals: {goals}
- Allergies & Intolerances: {allergies}

{retry_feedback_section}

-----------------------------------
REFERENCE RECIPE CONTEXT (LOW PRIORITY)
-----------------------------------
The following recipes are provided ONLY for inspiration on:
- general cooking techniques
- sequencing of steps
- texture expectations
- heat control
- preparation methods

{similar_recipes_context}

You MUST NOT use reference recipes for:
- ingredient selection
- ingredient proportion
- substitutions (e.g., cauliflower rice, tofu, almond flour, etc.)
- cuisine switching
- title changes
- altering the structure or identity of the user’s requested dish

Reference recipes are *style cues only*, NOT ingredient sources.

-----------------------------------
HARD RULES
-----------------------------------

1. **User Request Dominates**
   The User Requirements fully define the dish type, structure, cuisine, and core ingredients.
   NOTHING overrides the user’s intent.

2. **Ingredient Integrity**
   Use only ingredients that logically belong to the dish requested.
   DO NOT add flavors or ingredients unrelated to the dish.
   *(Example: No chilies in ice cream, no chocolate in biryani, no tadka in smoothies.)*

3. **Health Goals (Soft Rule)**
   Apply subtly and without altering the fundamental identity of the dish.
   DO NOT turn classic dishes into “diet versions” unless the user asks.
   *(Example: Do NOT use cauliflower rice unless requested.)*

5. **Allergy Compliance (Hard Rule)**
   Completely avoid all listed allergens, including derivatives.

6. **TITLE PROTECTION RULE**
   The recipe title must match the user’s requested dish name as closely as possible.
   DO NOT add labels like:
   - low-carb
   - high-protein
   - keto
   - vegan
   - healthy
   - gluten-free  
   unless the user uses these exact terms in the request.

7. **Technique Appropriateness**
   Use techniques that naturally fit the dish type.
   Example:  
   - Ice cream → freezing/churning  
   - Pasta → boiling + sauce  
   - Biryani → layering + dum  
   - Stir-fry → high heat sauté  
   - Smoothie → blending  
   DO NOT apply unrelated techniques (e.g., dum to pasta).

8. **No Ingredient Leakage**
   Do NOT import ingredients from reference recipes.
   Only use what the user logically implied or explicitly stated.

9. **Authenticity Protection**
   If the user requests a traditional or regional dish (e.g., "Hyderabadi Mutton Biryani"),
   follow the authentic structure of that dish unless they ask for a variation.

10. **STEP TYPE CLASSIFICATION RULES (CRITICAL)**
   Each step MUST have exactly one step_type: "active", "passive", or "wait".
   
   **Active Steps** (step_type: "active"):
   - Require continuous user action and engagement
   - Examples: chopping vegetables, stirring continuously, mixing ingredients, kneading dough, flipping items
   - User must be actively performing the action throughout the step
   
   **Passive Steps** (step_type: "passive"):
   - Require monitoring or occasional checking, but minimal active engagement
   - Examples: simmering, baking in oven, slow cooking, braising
   - User needs to monitor but doesn't need to perform continuous actions
   
   **Wait Steps** (step_type: "wait"):
   - Pure waiting periods with no user engagement needed
   - Examples: resting dough, marinating, cooling, letting something sit
   - User can step away completely during this time
   
   **CRITICAL: Split Mixed Steps**
   - If a step contains both active action AND waiting/monitoring, SPLIT IT into separate atomic steps
   - Example: "Chop onions, then let them rest for 10 minutes" → 
     * Step 1: "Chop onions" (step_type: "active")
     * Step 2: "Let onions rest for 10 minutes" (step_type: "wait")
   - Example: "Add spices and stir for 2 minutes, then let simmer for 15 minutes" →
     * Step 1: "Add spices and stir for 2 minutes" (step_type: "active")
     * Step 2: "Let simmer for 15 minutes" (step_type: "passive")
   
   **DO NOT** combine different engagement types in a single step. Each step must be atomic and have exactly one step_type.

11. **Clarity & Structure**
   - Clear ingredient list with quantities
   - Realistic prep_time and cook_time
   - Step-by-step instructions with proper step_type classification
   - Tags based ONLY on actual recipe content (NOT influencing title or recipe structure)

-----------------------------------
OUTPUT FORMAT
-----------------------------------
{format_instructions}

Generate the recipe now:"""
        
        self._prompt_template_cache = PromptTemplate(
            template=template,
            input_variables=[
                "user_requirements_section",
                "dietary_preferences",
                "goals", "allergies", "similar_recipes_context", "retry_feedback_section"
            ],
            partial_variables={"format_instructions": self.output_parser.get_format_instructions()}
        )
        return self._prompt_template_cache
    
    def _format_similar_recipes(self, similar_recipes: List[Dict[str, Any]]) -> str:
        """Format similar recipes as context for the prompt, filtering by similarity threshold (0.75)"""
        if not similar_recipes:
            return "No similar recipes found. Create a new recipe from scratch."
        
        # Filter recipes with similarity_score >= 0.75
        filtered_recipes = [
            recipe for recipe in similar_recipes 
            if recipe.get('similarity_score', 0.0) >= 0.75
        ]
        
        if not filtered_recipes:
            return "No similar recipes found. Create a new recipe from scratch."
        
        formatted = []
        for i, recipe in enumerate(filtered_recipes[:3], 1):  # Use top 3 similar recipes above threshold
            formatted.append(f"""
Recipe {i}: {recipe.get('title', 'Unknown')}
Description: {recipe.get('description', '')}
Ingredients: {', '.join(recipe.get('ingredients', [])[:10])}
Tags: {', '.join(recipe.get('tags', []))}
""")
        
        return "\n".join(formatted)
    
    def generate_recipe(
        self,
        form_data: Dict[str, Any],
        similar_recipes: List[Dict[str, Any]],
        user_preferences: Optional[Dict[str, Any]] = None,
        retry_feedback: Optional[List[str]] = None
    ) -> RecipeOutput:
        """
        Generate a recipe using Gemini API via LangChain
        
        Args:
            form_data: Form data from user request
            similar_recipes: List of similar recipes from similarity search
        
        Returns:
            RecipeOutput object with structured recipe data
        """
        print("Generating recipe with Gemini...")
        
        try:
            # Format similar recipes context
            similar_recipes_context = self._format_similar_recipes(similar_recipes)
            print(f"Using {len(similar_recipes)} similar recipes as context")

            # Format user preferences
            dietary_prefs = user_preferences.get("dietary_preferences", []) if user_preferences else []
            goals = user_preferences.get("goals", []) if user_preferences else []
            allergies = user_preferences.get("allergies", []) if user_preferences else []
            
            print(f"User preferences - Dietary: {dietary_prefs}, Goals: {goals}, Allergies: {allergies}")
            
            # Build prompt
            prompt_template = self._build_prompt_template()
            
            # Format retry feedback if provided
            retry_feedback_section = ""
            if retry_feedback and len(retry_feedback) > 0:
                feedback_lines = "\n".join([f"- {issue}" for issue in retry_feedback])
                retry_feedback_section = f"""IMPORTANT - Previous Attempt Issues to Fix:
{feedback_lines}

Please adjust the recipe to address these issues while maintaining all other requirements."""
            
            # Build user requirements section dynamically, only including non-null fields
            requirements_lines = []
            
            # Description is always required
            description = form_data.get("description", "")
            if description:
                requirements_lines.append(f"- Description: {description}")
            
            # Only add other fields if they are not None
            meal_name = form_data.get("meal_name")
            if meal_name:
                requirements_lines.append(f"- Meal Name: {meal_name}")
            
            serving_size = form_data.get("serving_size")
            if serving_size is not None:
                requirements_lines.append(f"- Serving Size: {serving_size}")
            
            meal_type = form_data.get("meal_type")
            if meal_type:
                requirements_lines.append(f"- Meal Type: {meal_type}")
            
            flavor_controls = form_data.get("flavor_controls")
            if flavor_controls:
                requirements_lines.append(f"- Flavor Profile: {json.dumps(flavor_controls)}")
            
            cooking_skill_level = form_data.get("cooking_skill_level")
            if cooking_skill_level:
                requirements_lines.append(f"- Cooking Skill Level: {cooking_skill_level}")
            
            time_constraints = form_data.get("time_constraints")
            if time_constraints:
                requirements_lines.append(f"- Time Constraints: {time_constraints}")
            
            calorie_range = form_data.get("calorie_range")
            if calorie_range:
                requirements_lines.append(f"- Calorie Range: {calorie_range}")
            
            protein_target = form_data.get("protein_target_per_serving")
            if protein_target is not None:
                requirements_lines.append(f"- Target Protein per Serving (g): {protein_target} g per serving")
            
            user_requirements_section = "\n".join(requirements_lines) if requirements_lines else "- Description: (User will provide description)"
            
            # Prepare prompt variables (handle null/empty values)
            prompt_vars = {
                "user_requirements_section": user_requirements_section,
                "similar_recipes_context": similar_recipes_context if similar_recipes_context and similar_recipes_context != "None" else "None",
                "dietary_preferences": ", ".join(dietary_prefs) if dietary_prefs else "Not provided",
                "goals": ", ".join(goals) if goals else "Not provided",
                "allergies": ", ".join(allergies) if allergies else "None",
                "retry_feedback_section": retry_feedback_section if retry_feedback_section else "",
            }
            
            # Format prompt
            formatted_prompt = prompt_template.format(**prompt_vars)
            
            # Generate recipe with retry logic
            max_retries = 2
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    print(f"Sending prompt to Gemini... (attempt {attempt + 1})")
                    
                    # Generate recipe
                    response = self.llm.invoke(formatted_prompt)
                    
                    print("Received response from Gemini")
                    print(f"Response content length: {len(response.content)}")
                    
                    # Parse response
                    try:
                        recipe_output = self.output_parser.parse(response.content)
                        print("Recipe structure parsed successfully")
                        print(f"Recipe title: {recipe_output.title}")
                        print(f"Recipe has {len(recipe_output.ingredients)} ingredients and {len(recipe_output.steps)} steps")
                        print("Recipe generation completed")
                        return recipe_output
                    except ValidationError as parse_error:
                        # Validation errors shouldn't be retried - the LLM response is invalid
                        print(f"Error parsing recipe output (validation error): {str(parse_error)}")
                        print(f"Raw response: {response.content[:500]}")
                        raise ValueError(f"Failed to parse recipe output: {str(parse_error)}")
                    except Exception as parse_error:
                        # Other parsing errors might be retried if it's a format issue
                        print(f"Error parsing recipe output: {str(parse_error)}")
                        if attempt < max_retries - 1:
                            print(f"Retrying due to parsing error (attempt {attempt + 1})...")
                            time.sleep(1)
                            continue
                        print(f"Raw response: {response.content[:500]}")
                        raise ValueError(f"Failed to parse recipe output: {str(parse_error)}")
                
                except (LangChainException, ConnectionError, TimeoutError) as e:
                    # Transient errors - retry with exponential backoff
                    last_error = e
                    print(f"Transient error during recipe generation (attempt {attempt + 1}): {str(e)}")
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s
                        print(f"Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise
                except Exception as e:
                    # Non-retryable errors (like API key issues, invalid requests)
                    print(f"Non-retryable error during recipe generation: {str(e)}")
                    raise
            
            # If we get here, all retries failed
            if last_error:
                raise last_error
            raise Exception("Recipe generation failed after retries")
        
        except Exception as e:
            print(f"Error generating recipe: {str(e)}")
            raise
    
    def _build_optimize_prompt_template(self) -> PromptTemplate:
        """Build LangChain prompt template for recipe optimization (cached)"""
        if self._optimize_prompt_template_cache is not None:
            return self._optimize_prompt_template_cache
        
        template = """You are an expert Indian chef and recipe optimizer. Analyze the provided recipe and create an optimized version based on the optimization goal.

Original Recipe Description:
{recipe_description}

Optimization Goal:
{optimization_goal}

Additional Notes:
{additional_notes}

IMPORTANT INSTRUCTIONS:
1. Parse the original recipe from the description, extracting:
   - Ingredients with quantities
   - Cooking steps/instructions
   - Any nutrition information if mentioned
   - Meal type, prep time, cook time, serving size

2. Apply the optimization goal with MINIMAL changes:
   - Make ONLY the necessary changes to meet the optimization objective
   - Preserve as much of the original recipe as possible
   - Keep the same cooking method and technique unless absolutely necessary
   - Maintain the essence, flavor profile, and character of the original recipe
   - Only modify ingredients that directly contribute to achieving the optimization goal
   
   Examples:
   - "Lower calories" → Reduce fats/oils slightly, use slightly leaner proteins, reduce high-calorie ingredients minimally
   - "Make it vegan" → Replace only animal products with plant-based alternatives, keep everything else the same
   - "Increase protein" → Add protein-rich ingredients or slightly increase protein portions, minimal other changes
   - "Make it gluten-free" → Replace only gluten-containing ingredients with gluten-free alternatives
   - "Reduce carbs" → Reduce or replace only high-carb ingredients, keep other aspects unchanged
   - "Make it healthier" → Make minimal substitutions (e.g., whole wheat instead of white flour), keep recipe structure
   - Custom goals → Follow the specific optimization goal with minimal necessary changes

3. Consider additional notes for specific requirements, but still keep changes minimal

4. Ensure the optimized recipe:
   - Maintains the essence and flavor profile of the original (as close as possible)
   - Is still delicious and appealing
   - Has clear, detailed instructions
   - Uses the same cooking techniques and methods when possible
   - Preserves step_type classification for each step (active, passive, or wait) unless the optimization requires changing the step's engagement level

5. List all changes made with:
   - Type of change (substitution, modification, nutrition, etc.)
   - Clear description of what was changed and why
   - An appropriate emoji representing the change

6. CRITICAL: Make MINIMAL changes - only modify what is absolutely necessary to achieve the optimization goal. Preserve everything else from the original recipe.

{format_instructions}

Generate the optimized recipe now:"""
        
        self._optimize_prompt_template_cache = PromptTemplate(
            template=template,
            input_variables=[
                "recipe_description",
                "optimization_goal",
                "additional_notes"
            ],
            partial_variables={"format_instructions": self.optimize_output_parser.get_format_instructions()}
        )
        return self._optimize_prompt_template_cache
    
    def optimize_recipe(
        self,
        recipe_description: str,
        optimization_goal: str,
        additional_notes: Optional[str] = None
    ) -> OptimizedRecipeOutput:
        """
        Optimize a recipe using Gemini API via LangChain
        
        Args:
            recipe_description: Description of the original recipe
            optimization_goal: Goal for optimization (e.g., "Lower calories", "Make it vegan")
            additional_notes: Additional notes for optimization
        
        Returns:
            OptimizedRecipeOutput object with original, optimized, and changes
        """
        print("Optimizing recipe with Gemini...")
        
        try:
            print(f"Optimization goal: {optimization_goal}")
            print(f"Additional notes: {additional_notes or 'None'}")
            
            # Build prompt
            prompt_template = self._build_optimize_prompt_template()
            
            # Prepare prompt variables
            prompt_vars = {
                "recipe_description": recipe_description,
                "optimization_goal": optimization_goal,
                "additional_notes": additional_notes or "None",
            }
            
            # Format prompt
            formatted_prompt = prompt_template.format(**prompt_vars)
            
            # Generate optimized recipe with retry logic
            max_retries = 2
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    print(f"Sending optimization prompt to Gemini... (attempt {attempt + 1})")
                    
                    # Generate optimized recipe
                    response = self.llm.invoke(formatted_prompt)
                    
                    print("Received response from Gemini")
                    print(f"Response content length: {len(response.content)}")
                    
                    # Parse response
                    try:
                        optimized_output = self.optimize_output_parser.parse(response.content)
                        print("Optimized recipe structure parsed successfully")
                        print(f"Original recipe: {optimized_output.original.title}")
                        print(f"Optimized recipe: {optimized_output.optimized.title}")
                        print(f"Number of changes: {len(optimized_output.changes)}")
                        print("Recipe optimization completed")
                        return optimized_output
                    except ValidationError as parse_error:
                        # Validation errors shouldn't be retried
                        print(f"Error parsing optimized recipe output (validation error): {str(parse_error)}")
                        print(f"Raw response: {response.content[:500]}")
                        raise ValueError(f"Failed to parse optimized recipe output: {str(parse_error)}")
                    except Exception as parse_error:
                        # Other parsing errors might be retried
                        print(f"Error parsing optimized recipe output: {str(parse_error)}")
                        if attempt < max_retries - 1:
                            print(f"Retrying due to parsing error (attempt {attempt + 1})...")
                            time.sleep(1)
                            continue
                        print(f"Raw response: {response.content[:500]}")
                        raise ValueError(f"Failed to parse optimized recipe output: {str(parse_error)}")
                
                except (LangChainException, ConnectionError, TimeoutError) as e:
                    # Transient errors - retry with exponential backoff
                    last_error = e
                    print(f"Transient error during recipe optimization (attempt {attempt + 1}): {str(e)}")
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s
                        print(f"Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise
                except Exception as e:
                    # Non-retryable errors
                    print(f"Non-retryable error during recipe optimization: {str(e)}")
                    raise
            
            # If we get here, all retries failed
            if last_error:
                raise last_error
            raise Exception("Recipe optimization failed after retries")
        
        except Exception as e:
            print(f"Error optimizing recipe: {str(e)}")
            raise
    
    def _build_replace_ingredients_prompt_template(self) -> PromptTemplate:
        """Build LangChain prompt template for ingredient replacement (cached)"""
        if self._replace_ingredients_prompt_template_cache is not None:
            return self._replace_ingredients_prompt_template_cache
        
        template = """You are an expert Indian chef. Replace specific ingredients in the provided recipe based on the replacement reason, while maintaining the recipe's overall structure, flavor profile, and cooking method.

Original Recipe:
Title: {recipe_title}
Description: {recipe_description}
Ingredients:
{ingredients_list}
Steps:
{steps_list}
Prep Time: {prep_time} minutes
Cook Time: {cook_time} minutes
Serving Size: {serving_size}

Ingredients to Replace (by index):
{ingredients_to_replace}

Replacement Reason:
{replacement_reason}

IMPORTANT INSTRUCTIONS:
1. Replace ONLY the specified ingredients with appropriate alternatives based on the replacement reason
2. Keep ALL other ingredients unchanged
3. Adjust cooking steps ONLY if necessary due to ingredient substitutions (e.g., different cooking times or techniques)
4. Maintain the same recipe structure, flavor profile, and cooking method
5. Preserve prep_time, cook_time, and serving_size unless the replacement requires significant changes
6. Ensure the replacement ingredients are suitable substitutes that maintain the dish's character
7. Update ingredient quantities if needed to maintain proper ratios
8. Keep the recipe title and description the same unless the replacement significantly changes the dish
9. Preserve step_type classification (active, passive, or wait) for each step unless the ingredient substitution requires changing the step's engagement level

{format_instructions}

Generate the updated recipe with replaced ingredients:"""
        
        self._replace_ingredients_prompt_template_cache = PromptTemplate(
            template=template,
            input_variables=[
                "recipe_title",
                "recipe_description",
                "ingredients_list",
                "steps_list",
                "prep_time",
                "cook_time",
                "serving_size",
                "ingredients_to_replace",
                "replacement_reason"
            ],
            partial_variables={"format_instructions": self.output_parser.get_format_instructions()}
        )
        return self._replace_ingredients_prompt_template_cache
    
    def replace_ingredients(
        self,
        recipe_data: Dict[str, Any],
        ingredient_indices: List[int],
        replacement_reason: str
    ) -> RecipeOutput:
        """
        Replace specific ingredients in a recipe using Gemini API via LangChain
        
        Args:
            recipe_data: Dictionary containing the original recipe data
            ingredient_indices: List of indices (0-based) of ingredients to replace
            replacement_reason: Reason for replacement (e.g., "Need vegan alternatives", "Allergic to dairy")
        
        Returns:
            RecipeOutput object with updated recipe data
        """
        print("Replacing ingredients with Gemini...")
        
        try:
            # Extract recipe information
            recipe_title = recipe_data.get("title", "Recipe")
            recipe_description = recipe_data.get("description", "")
            ingredients = recipe_data.get("ingredients", [])
            steps = recipe_data.get("steps", [])
            prep_time = recipe_data.get("prep_time", 15)
            cook_time = recipe_data.get("cook_time", 20)
            serving_size = recipe_data.get("serving_size", 1)
            
            # Validate ingredient indices
            if not ingredient_indices or any(idx < 0 or idx >= len(ingredients) for idx in ingredient_indices):
                raise ValueError(f"Invalid ingredient indices: {ingredient_indices}. Recipe has {len(ingredients)} ingredients.")
            
            # Format ingredients list
            ingredients_list = []
            for i, ing in enumerate(ingredients):
                if isinstance(ing, dict):
                    name = ing.get("name", "")
                    quantity = ing.get("quantity", "")
                    unit = ing.get("unit", "")
                    if unit:
                        ingredients_list.append(f"{i}. {quantity} {unit} {name}")
                    else:
                        ingredients_list.append(f"{i}. {quantity} {name}")
                else:
                    ingredients_list.append(f"{i}. {ing}")
            
            # Format steps list
            steps_list = []
            for step in steps:
                if isinstance(step, dict):
                    step_num = step.get("step_number", len(steps_list) + 1)
                    instruction = step.get("instruction", step.get("text", ""))
                    steps_list.append(f"{step_num}. {instruction}")
                else:
                    steps_list.append(f"{len(steps_list) + 1}. {step}")
            
            # Format ingredients to replace
            ingredients_to_replace = []
            for idx in sorted(ingredient_indices):
                if idx < len(ingredients):
                    ing = ingredients[idx]
                    if isinstance(ing, dict):
                        name = ing.get("name", "")
                        quantity = ing.get("quantity", "")
                        unit = ing.get("unit", "")
                        if unit:
                            ingredients_to_replace.append(f"Index {idx}: {quantity} {unit} {name}")
                        else:
                            ingredients_to_replace.append(f"Index {idx}: {quantity} {name}")
                    else:
                        ingredients_to_replace.append(f"Index {idx}: {ing}")
            
            print(f"Replacing {len(ingredient_indices)} ingredient(s): {', '.join(ingredients_to_replace)}")
            print(f"Replacement reason: {replacement_reason}")
            
            # Build prompt
            prompt_template = self._build_replace_ingredients_prompt_template()
            
            # Prepare prompt variables
            prompt_vars = {
                "recipe_title": recipe_title,
                "recipe_description": recipe_description,
                "ingredients_list": "\n".join(ingredients_list),
                "steps_list": "\n".join(steps_list),
                "prep_time": prep_time,
                "cook_time": cook_time,
                "serving_size": serving_size,
                "ingredients_to_replace": "\n".join(ingredients_to_replace),
                "replacement_reason": replacement_reason,
            }
            
            # Format prompt
            formatted_prompt = prompt_template.format(**prompt_vars)
            
            # Generate updated recipe with retry logic
            max_retries = 2
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    print(f"Sending ingredient replacement prompt to Gemini... (attempt {attempt + 1})")
                    
                    # Generate updated recipe
                    response = self.llm.invoke(formatted_prompt)
                    
                    print("Received response from Gemini")
                    print(f"Response content length: {len(response.content)}")
                    
                    # Parse response
                    try:
                        updated_recipe = self.output_parser.parse(response.content)
                        print("Updated recipe structure parsed successfully")
                        print(f"Updated recipe title: {updated_recipe.title}")
                        print(f"Updated recipe has {len(updated_recipe.ingredients)} ingredients and {len(updated_recipe.steps)} steps")
                        print("Ingredient replacement completed")
                        return updated_recipe
                    except ValidationError as parse_error:
                        # Validation errors shouldn't be retried
                        print(f"Error parsing updated recipe output (validation error): {str(parse_error)}")
                        print(f"Raw response: {response.content[:500]}")
                        raise ValueError(f"Failed to parse updated recipe output: {str(parse_error)}")
                    except Exception as parse_error:
                        # Other parsing errors might be retried
                        print(f"Error parsing updated recipe output: {str(parse_error)}")
                        if attempt < max_retries - 1:
                            print(f"Retrying due to parsing error (attempt {attempt + 1})...")
                            time.sleep(1)
                            continue
                        print(f"Raw response: {response.content[:500]}")
                        raise ValueError(f"Failed to parse updated recipe output: {str(parse_error)}")
                
                except (LangChainException, ConnectionError, TimeoutError) as e:
                    # Transient errors - retry with exponential backoff
                    last_error = e
                    print(f"Transient error during ingredient replacement (attempt {attempt + 1}): {str(e)}")
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s
                        print(f"Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise
                except Exception as e:
                    # Non-retryable errors
                    print(f"Non-retryable error during ingredient replacement: {str(e)}")
                    raise
            
            # If we get here, all retries failed
            if last_error:
                raise last_error
            raise Exception("Ingredient replacement failed after retries")
        
        except Exception as e:
            print(f"Error replacing ingredients: {str(e)}")
            raise

# Global instance - will be initialized on first use
_recipe_service_instance: Optional[RecipeService] = None

def get_recipe_service() -> RecipeService:
    """Get or create the global recipe service instance"""
    global _recipe_service_instance
    if _recipe_service_instance is None:
        _recipe_service_instance = RecipeService()
    return _recipe_service_instance

# Don't instantiate at import time - let it be lazy-loaded when needed
# recipe_service = get_recipe_service()  # Removed to prevent import-time errors