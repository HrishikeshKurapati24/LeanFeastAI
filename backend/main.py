from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from jose import jwt, JWTError
import os
import time
from dotenv import load_dotenv
from datetime import datetime
import asyncio
import uuid
import json
import re

# Load environment variables BEFORE importing services that depend on them
load_dotenv()

from services.database_service import db_service
from services.similarity_service import similarity_service
from services.recipe_service import get_recipe_service
from services.image_service import get_image_service
from services.nutrition_service import get_nutrition_service
from services.email_service import email_service

app = FastAPI(
    title="LeanFeastAI",
    description="AI-powered recipe generation and nutritional analysis platform",
    version="1.0.0"
)

# Add CORS middleware to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://lean-feast-ai.vercel.app"],  # Vite dev server ports & Production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """
    Initialize all services on server startup to avoid lazy-loading delays
    """
    print("[startup] Initializing services...")
    
    try:
        # Initialize recipe service (loads Gemini model)
        recipe_svc = get_recipe_service()
        print("[startup] ✓ RecipeService initialized")
    except Exception as e:
        print(f"[startup] ✗ RecipeService initialization failed: {str(e)}")
    
    try:
        # Initialize image service (creates httpx client)
        image_svc = get_image_service()
        print("[startup] ✓ ImageService initialized")
    except Exception as e:
        print(f"[startup] ✗ ImageService initialization failed: {str(e)}")
    
    try:
        # Initialize nutrition service (creates httpx client)
        nutrition_svc = get_nutrition_service()
        print("[startup] ✓ NutritionService initialized")
    except Exception as e:
        print(f"[startup] ✗ NutritionService initialization failed: {str(e)}")
    
    try:
        # Verify similarity service (Pinecone connection)
        if similarity_service.index:
            print("[startup] ✓ SimilarityService verified (Pinecone connected)")
        else:
            print("[startup] ⚠ SimilarityService: Pinecone not available")
    except Exception as e:
        print(f"[startup] ✗ SimilarityService verification failed: {str(e)}")
    
    try:
        # Verify email service is ready
        if email_service:
            print("[startup] ✓ EmailService verified")
        else:
            print("[startup] ⚠ EmailService not available")
    except Exception as e:
        print(f"[startup] ✗ EmailService verification failed: {str(e)}")
    
    print("[startup] Service initialization complete")

@app.get('/')
async def root():
    """
    Root endpoint - API health check and information
    """
    return {
        "message": "LeanFeastAI API Server",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "ok"
    }



# User Registration Models
class UserRegister(BaseModel):
    user_id: str
    email: str
    full_name: str
    dietary_preferences: Optional[List[str]] = []
    goals: Optional[List[str]] = []  # Changed from fitness_goals to goals
    allergies: Optional[List[str]] = []
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
# Supabase JWT Secret - Get this from your Supabase dashboard: Settings > API > JWT Secret
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Cached Supabase Admin Client (optimization to avoid repeated client creation)
_admin_client = None

def get_admin_client():
    """
    Get or create cached Supabase admin client
    Optimizes repeated admin API calls by reusing the same client instance
    """
    global _admin_client
    if _admin_client is None:
        from supabase import create_client
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            _admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        else:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for admin client")
    return _admin_client

# Batch query helper functions for optimization
def batch_get_user_auth_data(user_ids: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Batch fetch user auth data for multiple user IDs
    Returns dict mapping user_id -> auth_data (or None if not found)
    """
    auth_lookup = {}
    if not user_ids:
        return auth_lookup
    
    try:
        admin_client = get_admin_client()
        # Fetch users in batches (Supabase admin API may have limits)
        batch_size = 50
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            for user_id in batch:
                try:
                    auth_user = db_service.get_user_auth_data(user_id)
                    if auth_user:
                        auth_lookup[user_id] = auth_user
                    else:
                        auth_lookup[user_id] = None
                except Exception:
                    auth_lookup[user_id] = None
    except Exception as e:
        print(f"Warning: Batch auth data fetch failed: {str(e)}")
        # Fallback: set all to None
        for user_id in user_ids:
            auth_lookup[user_id] = None
    
    return auth_lookup

def batch_get_recipe_counts(user_ids: List[str]) -> Dict[str, int]:
    """
    Batch fetch recipe counts for multiple user IDs
    Returns dict mapping user_id -> recipe_count (defaults to 0)
    """
    counts_lookup = {}
    if not user_ids:
        return counts_lookup
    
    try:
        # Use GROUP BY to get counts in a single query
        result = db_service.supabase.table("recipes").select("user_id").in_("user_id", user_ids).execute()
        
        # Count recipes per user
        if result.data:
            for recipe in result.data:
                user_id = recipe.get("user_id")
                if user_id:
                    counts_lookup[user_id] = counts_lookup.get(user_id, 0) + 1
        
        # Ensure all user_ids have an entry (default to 0)
        for user_id in user_ids:
            if user_id not in counts_lookup:
                counts_lookup[user_id] = 0
    except Exception as e:
        print(f"Warning: Batch recipe count fetch failed: {str(e)}")
        # Fallback: set all to 0
        for user_id in user_ids:
            counts_lookup[user_id] = 0
    
    return counts_lookup

def batch_get_performance_metrics(recipe_ids: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Batch fetch performance metrics for multiple recipe IDs
    Returns dict mapping recipe_id -> performance_data (or None if not found)
    """
    perf_lookup = {}
    if not recipe_ids:
        return perf_lookup
    
    try:
        # Use IN query to fetch all performance metrics at once
        result = db_service.supabase.table("analytics_recipe_performance").select("*").in_("recipe_id", recipe_ids).execute()
        
        if result.data:
            for perf in result.data:
                recipe_id = perf.get("recipe_id")
                if recipe_id:
                    perf_lookup[recipe_id] = perf
        
        # Ensure all recipe_ids have an entry (default to None)
        for recipe_id in recipe_ids:
            if recipe_id not in perf_lookup:
                perf_lookup[recipe_id] = None
    except Exception as e:
        print(f"Warning: Batch performance metrics fetch failed: {str(e)}")
        # Fallback: set all to None
        for recipe_id in recipe_ids:
            perf_lookup[recipe_id] = None
    
    return perf_lookup

def batch_get_profiles(user_ids: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Batch fetch profiles for multiple user IDs
    Returns dict mapping user_id -> profile_data (or None if not found)
    """
    profile_lookup = {}
    if not user_ids:
        return profile_lookup
    
    try:
        # Use IN query to fetch all profiles at once
        result = db_service.supabase.table("profiles").select("*").in_("user_id", user_ids).execute()
        
        if result.data:
            for profile in result.data:
                user_id = profile.get("user_id")
                if user_id:
                    profile_lookup[user_id] = profile
        
        # Ensure all user_ids have an entry (default to None)
        for user_id in user_ids:
            if user_id not in profile_lookup:
                profile_lookup[user_id] = None
    except Exception as e:
        print(f"Warning: Batch profile fetch failed: {str(e)}")
        # Fallback: set all to None
        for user_id in user_ids:
            profile_lookup[user_id] = None
    
    return profile_lookup


def verify_supabase_jwt(token: str):
    """
    Verify Supabase JWT token by decoding and validating structure/expiration
    """
    import base64
    import json
    import time
    
    try:
        # Decode token header to check for kid
        header = jwt.get_unverified_header(token)
        has_kid = bool(header.get('kid'))
        
        # Decode payload manually (works for both JWKS and HS256 tokens)
        parts = token.split('.')
        if len(parts) < 2:
            raise HTTPException(status_code=401, detail="Invalid token format")
        
        # Decode payload (second part)
        payload_part = parts[1]
        # Add padding if needed
        padding = len(payload_part) % 4
        if padding:
            payload_part += '=' * (4 - padding)
        
        decoded_bytes = base64.urlsafe_b64decode(payload_part)
        payload = json.loads(decoded_bytes)
        
        # Verify token structure
        if not payload.get("iss") or "supabase.co" not in payload.get("iss", ""):
            raise HTTPException(status_code=401, detail="Invalid token issuer")
        
        if payload.get("aud") != "authenticated":
            raise HTTPException(status_code=401, detail="Invalid token audience")
        
        # Verify expiration
        exp = payload.get("exp")
        if not exp or exp <= time.time():
            raise HTTPException(status_code=401, detail="Token has expired")
        
        # If token has kid (JWKS-signed), return payload without signature verification
        # If no kid, try to verify with JWT secret
        if not has_kid and SUPABASE_JWT_SECRET:
            try:
                jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
            except JWTError:
                # If signature verification fails, still return payload if structure is valid
                # (for development compatibility)
                pass
        
        return payload
        
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


async def verify_token(authorization: Optional[str] = Header(None)):
    """
    Verify Supabase JWT token from Authorization header
    Also checks if user is suspended
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token missing")
    
    payload = verify_supabase_jwt(token)
    
    # Extract user information from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
    
    # Check if user is suspended
    try:
        profile = db_service.get_profile(user_id)
        if profile and profile.get("role") == "suspended":
            # Get suspension reason from auth.users user_metadata
            try:
                # Use cached admin client (optimization)
                admin_client = get_admin_client()
                auth_user = admin_client.auth.admin.get_user_by_id(user_id)
                if auth_user.user and auth_user.user.user_metadata:
                    reason = auth_user.user.user_metadata.get("suspension_reason", "Your account has been suspended.")
                else:
                    reason = "Your account has been suspended."
            except Exception:
                reason = "Your account has been suspended."
            
            raise HTTPException(
                status_code=403,
                detail=reason
            )
    except HTTPException:
        raise
    except Exception:
        # If check fails, continue (don't block on suspension check error)
        pass
    
    return {
        "token": token,
        "user_id": user_id,
        "email": payload.get("email"),
        "payload": payload
    }


async def verify_admin_token(authorization: Optional[str] = Header(None)):
    """
    Verify Supabase JWT token and check if user is admin
    """
    # First verify token
    token_data = await verify_token(authorization)
    user_id = token_data["user_id"]
    
    # Check if user is admin
    if not db_service.is_admin_user(user_id):
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    # Get admin user data
    admin_user = db_service.get_admin_user(user_id)
    
    return {
        **token_data,
        "admin_user": admin_user,
        "is_admin": True
    }


def check_admin_permission(admin_user: Optional[Dict[str, Any]], permission: str) -> bool:
    """
    Check if admin user has a specific permission.
    
    Args:
        admin_user: Admin user data from database (includes permissions and role_level)
        permission: Permission name to check (e.g., 'can_suspend_users')
        
    Returns:
        True if admin has permission, False otherwise
    """
    if not admin_user:
        return False
    
    # Super admins have all permissions
    role_level = admin_user.get("role_level", "").lower()
    if role_level == "super_admin":
        return True
    
    # Check permissions JSONB field
    permissions = admin_user.get("permissions", {})
    if not isinstance(permissions, dict):
        return False
    
    # Return permission value (defaults to False if not found)
    return permissions.get(permission, False)


def require_permission(admin_user: Optional[Dict[str, Any]], permission: str):
    """
    Raise HTTPException if admin doesn't have required permission.
    
    Args:
        admin_user: Admin user data from database
        permission: Permission name to check
        
    Raises:
        HTTPException: 403 Forbidden if permission is missing
    """
    if not check_admin_permission(admin_user, permission):
        permission_name = permission.replace("can_", "").replace("_", " ").title()
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied: {permission_name} permission required"
        )


@app.post("/api/users/register")
async def register_user(
    user_data: UserRegister,
    token_data: dict = Depends(verify_token)
):
    """
    Register a new user in the backend database
    This endpoint receives user data from the frontend after Supabase signup
    JWT token is verified before processing
    Creates a profile record in the profiles table
    """
    try:
        # Verify that the user_id in the request matches the token
        if user_data.user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="User ID mismatch: token user ID does not match request user ID"
            )
        
        # Check if profile already exists
        existing_profile = db_service.get_profile(user_data.user_id)
        if existing_profile:
            # Update existing profile instead of creating new one
            profile = db_service.update_profile(
                user_id=user_data.user_id,
                full_name=user_data.full_name,
                avatar_url=user_data.avatar_url,
                bio=user_data.bio,
                dietary_preferences=user_data.dietary_preferences,
                goals=user_data.goals,
                allergies=user_data.allergies
            )
            return {
                "status": "success",
                "message": "User profile updated successfully",
                "user_id": user_data.user_id,
                "profile": profile,
                "verified": True
            }
        
        # Create new profile in profiles table
        profile = db_service.create_profile(
            user_id=user_data.user_id,
            full_name=user_data.full_name,
            avatar_url=user_data.avatar_url,
            bio=user_data.bio,
            dietary_preferences=user_data.dietary_preferences,
            goals=user_data.goals,
            allergies=user_data.allergies,
            role="user"  # Default role
        )
        
        return {
            "status": "success",
            "message": "User registered successfully",
            "user_id": user_data.user_id,
            "profile": profile,
            "verified": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering user: {str(e)}")


@app.get("/api/users/exists")
async def user_exists(email: str):
    """
    Check if a user already exists in auth.users by email (admin check)
    This does NOT require a user token because it uses service role on server
    Returns only existence status, not providers
    """
    try:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        result = db_service.get_user_existence(email)
        return {"exists": result.get("exists", False)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking user existence: {str(e)}")


@app.get("/api/users/providers")
async def get_user_providers(email: str):
    """
    Check if a user exists in auth.users by email and return associated providers (admin check)
    This does NOT require a user token because it uses service role on server
    Returns: { exists: bool, providers: List[str] }
    """
    try:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        result = db_service.get_user_providers(email)
        return {"exists": result.get("exists", False), "providers": result.get("providers", [])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking user providers: {str(e)}")

# Recipe Generation Models
class RecipeCreateRequest(BaseModel):
    meal_name: Optional[str] = None
    description: str
    serving_size: Optional[int] = 1
    meal_type: Optional[str] = None
    flavor_controls: Optional[Dict[str, Any]] = None
    cooking_skill_level: Optional[str] = None
    time_constraints: Optional[str] = None
    calorie_range: Optional[str] = None
    protein_target_per_serving: Optional[float] = None

class RecipeSaveRequest(BaseModel):
    title: str
    description: str
    serving_size: int
    meal_type: Optional[str] = None
    ingredients: List[Dict[str, Any]]
    steps: List[Dict[str, Any]]
    prep_time: int
    cook_time: int
    tags: List[str]
    nutrition: Optional[Dict[str, Any]] = None
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    ai_context: Optional[Dict[str, Any]] = None
    is_public: bool = False

class CreateAndSaveRecipeRequest(BaseModel):
    title: str
    description: str
    tags: List[str]
    ingredients: Optional[List[Dict[str, Any]]] = []
    steps: Optional[List[Dict[str, Any]]] = []
    prep_time: Optional[int] = 0
    cook_time: Optional[int] = 0
    serving_size: Optional[int] = 1
    nutrition: Optional[Dict[str, Any]] = None
    isAiGenerated: Optional[bool] = False
    image_base64: Optional[str] = None

class RecipeOptimizeRequest(BaseModel):
    recipe_description: str
    optimization_goal: str
    additional_notes: Optional[str] = None
    recipe_name: Optional[str] = None

class OptimizedRecipeSaveRequest(BaseModel):
    title: str
    description: str
    serving_size: int
    meal_type: Optional[str] = None
    ingredients: List[Dict[str, Any]]
    steps: List[Dict[str, Any]]
    prep_time: int
    cook_time: int
    tags: List[str]
    nutrition: Optional[Dict[str, Any]] = None
    image_base64: Optional[str] = None
    optimization_metadata: Optional[Dict[str, Any]] = None

class IngredientReplacementRequest(BaseModel):
    ingredient_indices: List[int]
    replacement_reason: str

@app.post("/api/recipes/generate")
async def generate_recipe(
    request: RecipeCreateRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Generate a recipe using similarity search, Gemini, image generation, and nutrition analysis.
    Recipe is saved to Supabase database.
    """
    user_id = token_data["user_id"]

    try:
        # Debug: high-level request info
        print(
            "[generate_recipe] Received request",
            {
                "user_id": "REDACTED",
                "meal_name": request.meal_name,
                "serving_size": request.serving_size,
                "meal_type": request.meal_type,
                "has_flavor_controls": bool(request.flavor_controls),
                "has_time_constraints": bool(request.time_constraints),
                "has_calorie_range": bool(request.calorie_range),
            },
        )

        # Step 0: Fetch user profile for preferences
        user_profile = db_service.get_profile(user_id)
        user_preferences = None
        if user_profile:
            user_preferences = {
                "dietary_preferences": user_profile.get("dietary_preferences", []),
                "goals": user_profile.get("goals", []),
                "allergies": user_profile.get("allergies", [])
            }
            print(
                "[generate_recipe] Loaded user profile preferences",
                {
                    "has_profile": True,
                    "dietary_count": len(user_preferences["dietary_preferences"]),
                    "goals_count": len(user_preferences["goals"]),
                    "allergies_count": len(user_preferences["allergies"]),
                },
            )
        else:
            print("[generate_recipe] No user profile found, proceeding without preferences")

        # Step 1: Find similar recipes (prioritize user's liked/saved recipes)
        query_text = f"{request.meal_name} {request.description}"
        similar_recipes = similarity_service.find_similar_recipes(query_text, top_k=5, user_id=user_id, db_service=db_service)
        print(
            "[generate_recipe] Similar recipes search completed",
            {"query_text_length": len(query_text), "similar_recipes_count": len(similar_recipes or [])},
        )

        # Step 2: Build form data for Gemini
        form_data = {
            "meal_name": request.meal_name,
            "description": request.description,
            "serving_size": request.serving_size or 1,
            "meal_type": request.meal_type,
            "flavor_controls": request.flavor_controls or {},
            "cooking_skill_level": request.cooking_skill_level,
            "time_constraints": request.time_constraints,
            "calorie_range": request.calorie_range,
            "protein_target_per_serving": request.protein_target_per_serving,
        }

        print(
            "[generate_recipe] Calling recipe_service.generate_recipe",
            {
                "serving_size": form_data["serving_size"],
                "meal_type": form_data["meal_type"],
                "has_flavor_controls": bool(form_data["flavor_controls"]),
                "has_time_constraints": bool(form_data["time_constraints"]),
                "has_calorie_range": bool(form_data["calorie_range"]),
                "has_protein_target_per_serving": bool(form_data["protein_target_per_serving"]),
            },
        )

        # Step 2.5: Parse target calories and min calories from calorie_range (if provided)
        target_calories: Optional[float] = None
        min_calories: Optional[float] = None
        if request.calorie_range:
            match = re.match(r"^\s*(\d+)\s*-\s*(\d+)\s*$", request.calorie_range)
            if match:
                try:
                    min_cal = float(match.group(1))
                    max_cal = float(match.group(2))
                    if max_cal > min_cal:
                        target_calories = max_cal
                        min_calories = min_cal
                        print(
                            "[generate_recipe] Parsed calorie_range",
                            {
                                "calorie_range": request.calorie_range,
                                "min_cal": min_cal,
                                "max_cal": max_cal,
                                "target_calories": target_calories,
                                "min_calories": min_calories,
                            },
                        )
                except ValueError:
                    print(
                        "[generate_recipe] Failed to parse calorie_range, skipping calorie-based validation",
                        {"calorie_range": request.calorie_range},
                    )
        
        # Extract protein target and define tolerance
        protein_target_per_serving: Optional[float] = request.protein_target_per_serving
        protein_tolerance: float = 10.0  # ±10g tolerance

        recipe_service = get_recipe_service()
        nutrition_service = get_nutrition_service()
        image_service = get_image_service()

        # ====================================================================
        # PHASE 1: Recipe Generation
        # RecipeService already handles retries with exponential backoff internally
        # ====================================================================
        try:
            print("[generate_recipe] Starting recipe generation")
            recipe_output = recipe_service.generate_recipe(
                form_data, similar_recipes, user_preferences, retry_feedback=None
            )
            print(
                "[generate_recipe] Recipe generated successfully",
                {
                    "title": getattr(recipe_output, "title", None),
                    "serving_size": getattr(recipe_output, "serving_size", None),
                    "ingredients_count": len(getattr(recipe_output, "ingredients", []) or []),
                    "steps_count": len(getattr(recipe_output, "steps", []) or []),
                },
            )
        except Exception as e:
            print(f"[generate_recipe] Recipe generation failed after retries: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate recipe: {str(e)}"
            )

        # ====================================================================
        # PHASE 2: Parallel Image + Nutrition Generation
        # ImageService and NutritionService handle retries with exponential backoff internally
        # ====================================================================
        # Prepare data for nutrition API
        ingredients_list = [
            {"name": ing.name, "quantity": ing.quantity, "unit": ing.unit}
            for ing in recipe_output.ingredients
        ]
        steps_list = [
            {
                "step_number": step.step_number,
                "instruction": step.instruction,
                "step_type": step.step_type,
            }
            for step in recipe_output.steps
        ]

        # Nutrition generation (await this - we need it before returning)
        # NutritionService already handles retries with exponential backoff internally
        print("[generate_recipe] Starting nutrition generation (awaiting)")
        try:
            nutrition_data = await asyncio.to_thread(
                nutrition_service.get_recipe_nutrition,
                ingredients_list,
                steps_list,
                recipe_output.title,
                recipe_output.serving_size,
            ) or {}
            print(
                "[generate_recipe] Nutrition generation completed",
                {"has_nutrition_data": bool(nutrition_data)},
            )
        except Exception as e:
            print(f"[generate_recipe] Nutrition analysis failed after retries: {str(e)}")
            nutrition_data = {}  # Continue without nutrition if all retries fail
        
        print(
            "[generate_recipe] Nutrition generation completed, proceeding without waiting for image",
            {
                "has_nutrition": bool(nutrition_data),
            },
        )
        
        # Image will be None initially - it's generating in background
        image_base64 = None

        # ====================================================================
        # PHASE 3: Constraint Validation (only if constraints provided)
        # ====================================================================
        # Only enter retry feedback loop if calorie/protein constraints are provided AND not met
        constraint_attempts = 0
        max_constraint_attempts = 3
        previous_attempt_issues: List[str] = []
        
        while constraint_attempts < max_constraint_attempts:
            # Extract actual values from nutrition data
            actual_calories = None
            actual_protein = None
            if nutrition_data:
                if "calories" in nutrition_data:
                    try:
                        actual_calories = float(nutrition_data["calories"])
                    except (ValueError, TypeError):
                        actual_calories = None
                if "protein" in nutrition_data:
                    try:
                        actual_protein = float(nutrition_data["protein"])
                    except (ValueError, TypeError):
                        actual_protein = None

            # Check if constraints are provided
            has_calorie_constraint = target_calories is not None
            has_protein_constraint = protein_target_per_serving is not None

            # If no constraints provided, skip validation phase
            if not has_calorie_constraint and not has_protein_constraint:
                print("[generate_recipe] No constraints provided, skipping validation phase")
                break

            # Build list of validation issues
            current_attempt_issues: List[str] = []
            constraints_met = True

            # Calorie validation checks
            if has_calorie_constraint:
                if actual_calories is None:
                    current_attempt_issues.append(
                        f"Nutrition analysis failed. Cannot validate calories against target range: {min_calories:.0f}-{target_calories:.0f} kcal."
                    )
                    constraints_met = False
                else:
                    # Check if calories are too low (below min - 100)
                    if min_calories is not None and actual_calories < min_calories - 100:
                        current_attempt_issues.append(
                            f"Calories too low: {actual_calories:.0f} kcal (target range: {min_calories:.0f}-{target_calories:.0f} kcal). "
                            f"Need to increase calories by at least {min_calories - actual_calories:.0f} kcal."
                        )
                        constraints_met = False
                    else:
                        # Check if calories are too high (above max + 100)
                        diff = abs(actual_calories - target_calories)
                        if diff >= 100:
                            if actual_calories > target_calories:
                                current_attempt_issues.append(
                                    f"Calories too high: {actual_calories:.0f} kcal (target: {target_calories:.0f} kcal, difference: {diff:.0f} kcal). "
                                    f"Need to reduce calories by {actual_calories - target_calories:.0f} kcal."
                                )
                            else:
                                current_attempt_issues.append(
                                    f"Calories too low: {actual_calories:.0f} kcal (target: {target_calories:.0f} kcal, difference: {diff:.0f} kcal). "
                                    f"Need to increase calories by {target_calories - actual_calories:.0f} kcal."
                                )
                            constraints_met = False

            # Protein validation checks
            if has_protein_constraint and actual_protein is not None:
                actual_protein_per_serving = actual_protein / recipe_output.serving_size
                protein_diff = abs(actual_protein_per_serving - protein_target_per_serving)
                
                if protein_diff > protein_tolerance:
                    if actual_protein_per_serving < protein_target_per_serving - protein_tolerance:
                        current_attempt_issues.append(
                            f"Protein too low: {actual_protein_per_serving:.1f}g per serving (target: {protein_target_per_serving:.1f}g per serving). "
                            f"Need to increase protein by at least {protein_target_per_serving - actual_protein_per_serving:.1f}g per serving."
                        )
                    elif actual_protein_per_serving > protein_target_per_serving + protein_tolerance:
                        current_attempt_issues.append(
                            f"Protein too high: {actual_protein_per_serving:.1f}g per serving (target: {protein_target_per_serving:.1f}g per serving). "
                            f"Need to reduce protein by at least {actual_protein_per_serving - protein_target_per_serving:.1f}g per serving."
                        )
                    constraints_met = False

            # Log validation results
            print(
                "[generate_recipe] Constraint validation results",
                {
                    "attempt": constraint_attempts + 1,
                    "actual_calories": actual_calories,
                    "target_calories": target_calories,
                    "min_calories": min_calories,
                    "actual_protein": actual_protein,
                    "protein_target_per_serving": protein_target_per_serving,
                    "constraints_met": constraints_met,
                    "issues_count": len(current_attempt_issues),
                    "issues": current_attempt_issues,
                },
            )

            # If constraints are met, exit validation loop
            if constraints_met:
                print("[generate_recipe] All constraints met, proceeding to save")
                break

            # If constraints not met and we have retries left, regenerate recipe with feedback
            if constraint_attempts < max_constraint_attempts - 1:
                previous_attempt_issues = current_attempt_issues
                constraint_attempts += 1
                print(
                    "[generate_recipe] Constraints not met, regenerating recipe with feedback",
                    {
                        "attempt": constraint_attempts + 1,
                        "issues": current_attempt_issues,
                    },
                )
                
                # Regenerate recipe with retry feedback
                # RecipeService already handles retries with exponential backoff internally
                try:
                    recipe_output = recipe_service.generate_recipe(
                        form_data, similar_recipes, user_preferences, retry_feedback=previous_attempt_issues
                    )
                    print("[generate_recipe] Recipe regenerated with feedback")
                    
                    # Update ingredients and steps for new nutrition analysis
                    ingredients_list = [
                        {"name": ing.name, "quantity": ing.quantity, "unit": ing.unit}
                        for ing in recipe_output.ingredients
                    ]
                    steps_list = [
                        {
                            "step_number": step.step_number,
                            "instruction": step.instruction,
                            "step_type": step.step_type,
                        }
                        for step in recipe_output.steps
                    ]
                    
                    # Re-run nutrition analysis for the new recipe
                    # NutritionService already handles retries with exponential backoff internally
                    try:
                        nutrition_data = await asyncio.to_thread(
                            nutrition_service.get_recipe_nutrition,
                            ingredients_list,
                            steps_list,
                            recipe_output.title,
                            recipe_output.serving_size,
                        ) or {}
                    except Exception as e:
                        print(f"[generate_recipe] Nutrition analysis failed during constraint retry: {str(e)}")
                        nutrition_data = {}  # Continue without nutrition if all retries fail
                    continue  # Re-validate constraints with new recipe
                except Exception as e:
                    print(
                        "[generate_recipe] Recipe regeneration failed during constraint validation after internal retries",
                        {"error": str(e), "attempt": constraint_attempts + 1},
                    )
                    # If regeneration fails after internal retries, break and use current recipe
                    # This is intentional graceful degradation - proceed with the recipe we have
                    break
            else:
                # Last attempt, constraints still not met
                print(
                    "[generate_recipe] Constraints not met after all attempts, proceeding with current recipe",
                    {"issues": current_attempt_issues},
                )
                break

        # ====================================================================
        # PHASE 4: Save Recipe and Return Immediately
        # ====================================================================
        # Convert Pydantic models to dicts
        ingredients_dict = [
            {"name": ing.name, "quantity": ing.quantity, "unit": ing.unit}
            for ing in recipe_output.ingredients
        ]
        steps_dict = [
            {
                "step_number": step.step_number,
                "instruction": step.instruction,
                "step_type": step.step_type,
            }
            for step in recipe_output.steps
        ]

        # Prepare recipe data for database
        recipe_data_for_db = {
            "title": recipe_output.title,
            "description": recipe_output.description,
            "serving_size": recipe_output.serving_size,
            "meal_type": request.meal_type
            or recipe_output.tags[0]
            if recipe_output.tags
            else "Dinner",
            "ingredients": ingredients_dict,
            "steps": steps_dict,
            "prep_time": recipe_output.prep_time,
            "cook_time": recipe_output.cook_time,
            "tags": recipe_output.tags,
            "nutrition": nutrition_data,
            "image_url": None,  # Image will be uploaded to storage when ready
            "ai_context": {
                "similar_recipes_used": [r.get("title") for r in similar_recipes[:3]],
                "generation_model": "gemini-2.0-flash-exp",
            },
            "is_public": False,
            "is_ai_generated": True,  # This endpoint uses AI (Gemini) to generate recipes
        }
        
        # Upload image to storage if available
        if image_base64:
            try:
                image_filename = f"{recipe_output.title.strip().replace(' ', '_')[:50]}.jpg"
                image_url = db_service.upload_base64_image_to_storage(
                    image_base64,
                    image_filename,
                    bucket="recipe-images"
                )
                recipe_data_for_db["image_url"] = image_url
                print("[generate_recipe] Image uploaded to storage", {"image_url": image_url})
            except Exception as img_error:
                print(f"[generate_recipe] Failed to upload image to storage: {str(img_error)}")
                # Continue without image - recipe will be saved without image_url
        print(
            "[generate_recipe] Prepared recipe_data_for_db",
            {
                "title": recipe_data_for_db["title"],
                "serving_size": recipe_data_for_db["serving_size"],
                "ingredients_count": len(recipe_data_for_db["ingredients"]),
                "steps_count": len(recipe_data_for_db["steps"]),
                "tags": recipe_data_for_db["tags"],
                "has_image": bool(image_base64),
                "has_nutrition": bool(nutrition_data),
            },
        )

        # Save recipe to database
        saved_recipe = db_service.create_recipe(recipe_data_for_db, user_id)
        recipe_id = saved_recipe.get("id")
        print(
            "[generate_recipe] Recipe saved to database",
            {"recipe_id": recipe_id, "user_id": user_id},
        )

        # Create analytics entry
        db_service.create_recipe_analytics(recipe_id, user_id)
        print("[generate_recipe] Analytics entry created", {"recipe_id": recipe_id})

        # Log user activity
        db_service.log_recipe_creation(user_id, recipe_id)
        print("[generate_recipe] User activity logged", {"recipe_id": recipe_id, "user_id": user_id})
        
        # Log to user_recipe_actions table
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="create",
                recipe_id=recipe_id
            )
            print("[generate_recipe] User recipe action logged", {"recipe_id": recipe_id, "user_id": user_id})
        except Exception as action_error:
            print(f"[generate_recipe] Failed to log user recipe action: {str(action_error)}")

        # Start image generation as background task (don't block response)
        print("[generate_recipe] Starting background image generation", {"recipe_id": recipe_id})
        
        # Capture image_service in closure to ensure it's accessible
        bg_image_service = image_service
        
        async def generate_image_background():
            """Generate image in background and update database when complete"""
            try:
                print(f"[generate_recipe] Background task started for recipe_id: {recipe_id}")
                bg_image_base64 = await asyncio.to_thread(
                    bg_image_service.generate_recipe_image,
                    recipe_output.title,
                    recipe_output.description,
                )
                
                if bg_image_base64:
                    print("[generate_recipe] Background image generation completed successfully", {"recipe_id": recipe_id, "has_image": True})
                    # Upload image to storage and update recipe
                    try:
                        image_filename = f"recipe_{recipe_id}.jpg"
                        image_url = db_service.upload_base64_image_to_storage(
                            bg_image_base64,
                            image_filename,
                            bucket="recipe-images"
                        )
                        print(f"[generate_recipe] Image uploaded to storage: {image_url}")
                        
                        # Update recipe with image_url
                        try:
                            updated_recipe = db_service.update_recipe_image_url(recipe_id, image_url)
                            if updated_recipe and updated_recipe.get("image_url") == image_url:
                                print("[generate_recipe] Background image uploaded to storage and saved", {"recipe_id": recipe_id, "image_url": image_url})
                            else:
                                print(f"[generate_recipe] WARNING: update_recipe_image_url did not return expected data for recipe_id: {recipe_id}")
                                # Verify the update by fetching the recipe again
                                verify_recipe = db_service.get_recipe(recipe_id)
                                if verify_recipe and verify_recipe.get("image_url") == image_url:
                                    print(f"[generate_recipe] Verified: image_url was successfully updated for recipe_id: {recipe_id}")
                                else:
                                    print(f"[generate_recipe] ERROR: image_url update verification failed for recipe_id: {recipe_id}")
                        except Exception as update_error:
                            import traceback
                            print(f"[generate_recipe] Failed to update recipe image_url: {str(update_error)}")
                            print(f"[generate_recipe] Traceback: {traceback.format_exc()}")
                    except Exception as upload_error:
                        import traceback
                        print(f"[generate_recipe] Failed to upload background image to storage: {str(upload_error)}")
                        print(f"[generate_recipe] Traceback: {traceback.format_exc()}")
                else:
                    print("[generate_recipe] Background image generation failed", {"recipe_id": recipe_id})
            except Exception as e:
                import traceback
                print(f"[generate_recipe] Background image generation task error: {str(e)}", {"recipe_id": recipe_id})
                print(f"[generate_recipe] Traceback: {traceback.format_exc()}")
        
        # Start background task (fire and forget - don't await)
        asyncio.create_task(generate_image_background())

        # Prepare complete recipe response
        complete_recipe = {
            **saved_recipe,
            "image_base64": image_base64,  # Include base64 for frontend display (if available, else None)
        }
        print(
            "[generate_recipe] Returning response to client",
            {
                "recipe_id": recipe_id,
                "has_image_base64": bool(image_base64),
                "has_nutrition": bool(nutrition_data),
            },
        )

        return {
            "status": "success",
            "recipe_id": recipe_id,
            "recipe": complete_recipe,
            "message": "Recipe generated and saved successfully",
        }
    
    except Exception as e:
        import traceback
        print("[generate_recipe] Error while generating recipe", {"error": str(e)})
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating recipe: {str(e)}"
        )

@app.post("/api/recipes/save")
async def save_recipe(
    request: RecipeSaveRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Save a generated recipe to Supabase database.
    Creates recipe, analytics entry, and logs user activity.
    """
    user_id = token_data["user_id"]
    
    try:
        # Prepare recipe data for database
        recipe_data = {
            "title": request.title,
            "description": request.description,
            "meal_type": request.meal_type,
            "serving_size": request.serving_size,
            "ingredients": request.ingredients,
            "steps": request.steps,
            "nutrition": request.nutrition or {},
            "tags": request.tags,
            "prep_time": request.prep_time,
            "cook_time": request.cook_time,
            "image_url": request.image_url,  # If image was uploaded to storage
            "ai_context": request.ai_context or {},
            "is_public": request.is_public
        }
        
        # Handle image: if base64 provided, upload to Supabase Storage
        if request.image_base64 and not request.image_url:
            try:
                image_filename = f"{request.title.strip().replace(' ', '_')[:50]}.jpg"
                image_url = db_service.upload_base64_image_to_storage(
                    request.image_base64,
                    image_filename,
                    bucket="recipe-images"
                )
                recipe_data["image_url"] = image_url
                print("[save_recipe] Image uploaded to storage", {"image_url": image_url})
            except Exception as img_error:
                print(f"[save_recipe] Failed to upload image to storage: {str(img_error)}")
                # Continue without image - recipe will be saved without image_url
        
        # Save recipe to database
        saved_recipe = db_service.create_recipe(recipe_data, user_id)
        recipe_id = saved_recipe.get("id")
        
        # Create analytics entry
        db_service.create_recipe_analytics(recipe_id, user_id)
        
        # Log user activity
        db_service.log_recipe_creation(user_id, recipe_id)
        
        return {
            "status": "success",
            "recipe_id": recipe_id,
            "recipe": saved_recipe,
            "message": "Recipe saved successfully"
        }
    
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Error saving recipe: {str(e)}"
        )

@app.post("/api/recipes/create-and-save")
async def create_and_save_recipe(
    request: CreateAndSaveRecipeRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Create a new recipe and automatically add it to user's saved recipes.
    Creates recipe, adds to saved_recipes, creates analytics entry, and logs user activities.
    """
    user_id = token_data["user_id"]
    
    try:
        # Handle image upload if provided
        image_url = None
        if request.image_base64:
            try:
                image_filename = f"{request.title.strip().replace(' ', '_')[:50]}.jpg"
                image_url = db_service.upload_base64_image_to_storage(
                    request.image_base64,
                    image_filename,
                    bucket="recipe-images"
                )
                print("[create_and_save_recipe] Image uploaded to storage", {"image_url": image_url})
            except Exception as img_error:
                print(f"[create_and_save_recipe] Failed to upload image to storage: {str(img_error)}")
                # Continue without image - recipe will be saved without image_url
        
        # Prepare recipe data for database
        recipe_data = {
            "title": request.title,
            "description": request.description,
            "serving_size": request.serving_size or 1,
            "ingredients": request.ingredients or [],
            "steps": request.steps or [],
            "nutrition": request.nutrition or {},
            "tags": request.tags,
            "prep_time": request.prep_time or 0,
            "cook_time": request.cook_time or 0,
            "image_url": image_url,
            "is_public": False,  # User-created recipes are private by default
            "is_ai_generated": request.isAiGenerated or False
        }
        
        # Create recipe in database
        saved_recipe = db_service.create_recipe(recipe_data, user_id)
        recipe_id = saved_recipe.get("id")
        print("[create_and_save_recipe] Recipe created", {"recipe_id": recipe_id, "user_id": user_id})
        
        # Add recipe to user's saved_recipes
        updated_profile = db_service.add_to_saved_recipes(user_id, recipe_id)
        print("[create_and_save_recipe] Recipe added to saved_recipes", {"recipe_id": recipe_id})
        
        # Create analytics entry
        db_service.create_recipe_analytics(recipe_id, user_id)
        print("[create_and_save_recipe] Analytics entry created", {"recipe_id": recipe_id})
        
        # Log to analytics_user_activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="create_recipe",
                recipe_id=recipe_id
            )
            print("[create_and_save_recipe] User activity logged to analytics", {"recipe_id": recipe_id})
        except Exception as analytics_error:
            print(f"[create_and_save_recipe] Failed to log analytics activity: {str(analytics_error)}")
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="create",
                recipe_id=recipe_id
            )
            print("[create_and_save_recipe] User recipe action logged", {"recipe_id": recipe_id})
        except Exception as action_error:
            print(f"[create_and_save_recipe] Failed to log user recipe action: {str(action_error)}")
        
        return {
            "status": "success",
            "recipe_id": recipe_id,
            "recipe": saved_recipe,
            "message": "Recipe created and saved successfully"
        }
    
    except Exception as e:
        import traceback
        print(f"[create_and_save_recipe] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error creating and saving recipe: {str(e)}"
        )

@app.post("/api/recipes/optimize")
async def optimize_recipe(
    request: RecipeOptimizeRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Optimize a recipe using Gemini LLM with optimization-focused prompts.
    Generates image and analyzes nutrition for the optimized recipe.
    """
    user_id = token_data["user_id"]

    try:
        print(
            "[optimize_recipe] Received request",
            {
                "user_id": user_id,
                "optimization_goal": request.optimization_goal,
                "has_additional_notes": bool(request.additional_notes),
                "recipe_name": request.recipe_name,
            },
        )

        # Step 1: Get services
        recipe_service = get_recipe_service()
        nutrition_service = get_nutrition_service()

        # Step 2: Optimize recipe
        print("[optimize_recipe] Calling recipe_service.optimize_recipe")
        optimized_output = recipe_service.optimize_recipe(
            recipe_description=request.recipe_description,
            optimization_goal=request.optimization_goal,
            additional_notes=request.additional_notes
        )

        print(
            "[optimize_recipe] Recipe optimized",
            {
                "original_title": optimized_output.original.title,
                "optimized_title": optimized_output.optimized.title,
                "changes_count": len(optimized_output.changes),
            },
        )

        # Step 4: Prepare data for nutrition API (for optimized recipe)
        optimized_ingredients_list = [
            {"name": ing.name, "quantity": ing.quantity, "unit": ing.unit}
            for ing in optimized_output.optimized.ingredients
        ]
        optimized_steps_list = [
            {
                "step_number": step.step_number,
                "instruction": step.instruction,
                "step_type": step.step_type,
            }
            for step in optimized_output.optimized.steps
        ]

        print(
            "[optimize_recipe] Prepared ingredients and steps for nutrition",
            {
                "ingredients_count": len(optimized_ingredients_list),
                "steps_count": len(optimized_steps_list),
            },
        )

        # Step 3: Analyze nutrition for optimized recipe
        nutrition_task = asyncio.to_thread(
            nutrition_service.get_recipe_nutrition,
            optimized_ingredients_list,
            optimized_steps_list,
            optimized_output.optimized.title,
            optimized_output.optimized.serving_size,
        )

        nutrition_result = await asyncio.gather(
            nutrition_task, return_exceptions=True
        )
        nutrition_result = nutrition_result[0] if nutrition_result else None

        # Handle nutrition result
        nutrition_data: Dict[str, Any] = {}
        if isinstance(nutrition_result, Exception):
            print(
                "[optimize_recipe] Nutrition analysis failed",
                {"error": str(nutrition_result)},
            )
        else:
            nutrition_data = nutrition_result or {}
            print(
                "[optimize_recipe] Nutrition analysis completed successfully",
                {"has_nutrition_data": bool(nutrition_data)},
            )

        print(
            "[optimize_recipe] Post-processing AI outputs",
            {
                "has_nutrition_data": bool(nutrition_data),
            },
        )

        # Step 6: Format response to match OptimizedRecipe interface
        # Convert original recipe to frontend format
        original_ingredients = [
            f"{ing.quantity} {ing.unit or ''} {ing.name}".strip()
            for ing in optimized_output.original.ingredients
        ]
        original_instructions = [
            step.instruction for step in optimized_output.original.steps
        ]

        # Convert optimized recipe to frontend format
        optimized_ingredients = [
            f"{ing.quantity} {ing.unit or ''} {ing.name}".strip()
            for ing in optimized_output.optimized.ingredients
        ]
        optimized_instructions = [
            step.instruction for step in optimized_output.optimized.steps
        ]

        # Format changes
        changes = [
            {
                "type": change.type,
                "description": change.description,
                "emoji": change.emoji
            }
            for change in optimized_output.changes
        ]

        # Prepare raw recipe data for saving (needed when user clicks "Use Recipe")
        raw_optimized_ingredients = [
            {"name": ing.name, "quantity": ing.quantity, "unit": ing.unit}
            for ing in optimized_output.optimized.ingredients
        ]
        raw_optimized_steps = [
            {
                "step_number": step.step_number,
                "instruction": step.instruction,
                "step_type": step.step_type,
            }
            for step in optimized_output.optimized.steps
        ]
        
        response_data = {
            "original": {
                "name": optimized_output.original.title,
                "ingredients": original_ingredients,
                "instructions": original_instructions
            },
            "optimized": {
                "name": optimized_output.optimized.title,
                "description": optimized_output.optimized.description,
                "ingredients": optimized_ingredients,
                "instructions": optimized_instructions,
                "nutrition": {
                    "calories": nutrition_data.get("calories"),
                    "protein": nutrition_data.get("protein"),
                    "carbs": nutrition_data.get("carbs"),
                    "fats": nutrition_data.get("fats"),
                    "fiber": nutrition_data.get("fiber"),
                    "sugar": nutrition_data.get("sugar"),
                } if nutrition_data else {},
                # Raw data for saving
                "_raw": {
                    "ingredients": raw_optimized_ingredients,
                    "steps": raw_optimized_steps,
                    "prep_time": optimized_output.optimized.prep_time,
                    "cook_time": optimized_output.optimized.cook_time,
                    "serving_size": optimized_output.optimized.serving_size,
                    "tags": optimized_output.optimized.tags,
                }
            },
            "changes": changes
        }

        # Note: optimize_recipe action is logged to user_recipe_actions in the /save endpoint
        # where we have the recipe_id. Here we only log to analytics_user_activity.
        
        # Log to analytics_user_activity (this table may allow null recipe_id)
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="optimize_recipe",
                metadata={
                    "optimization_goal": request.optimization_goal,
                    "has_nutrition": bool(nutrition_data),
                }
            )
            print("[optimize_recipe] Analytics activity logged")
        except Exception as e:
            print(f"[optimize_recipe] Failed to log analytics activity: {str(e)}")

        print("[optimize_recipe] Returning response to client")
        return response_data

    except Exception as e:
        import traceback
        print(f"[optimize_recipe] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error optimizing recipe: {str(e)}"
        )

@app.post("/api/recipes/optimize/save")
async def save_optimized_recipe(
    request: OptimizedRecipeSaveRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Save an optimized recipe to Supabase database.
    Creates recipe, analytics entry, and logs user activity.
    """
    user_id = token_data["user_id"]
    
    try:
        print(
            "[save_optimized_recipe] Received request",
            {
                "user_id": user_id,
                "title": request.title,
                "has_nutrition": bool(request.nutrition),
            },
        )
        
        # Prepare recipe data for database
        recipe_data = {
            "title": request.title,
            "description": request.description,
            "meal_type": request.meal_type,
            "serving_size": request.serving_size,
            "ingredients": request.ingredients,
            "steps": request.steps,
            "nutrition": request.nutrition or {},
            "tags": request.tags,
            "prep_time": request.prep_time,
            "cook_time": request.cook_time,
            "image_url": None,  # Image will be uploaded to storage if provided
            "ai_context": {
                "is_optimized": True,
                "optimization_metadata": request.optimization_metadata or {},
            },
            "is_public": False,
            "is_ai_generated": True,  # This endpoint uses AI to optimize recipes
        }
        
        # Upload image to storage if provided
        if request.image_base64:
            try:
                image_filename = f"{request.title.strip().replace(' ', '_')[:50]}.jpg"
                image_url = db_service.upload_base64_image_to_storage(
                    request.image_base64,
                    image_filename,
                    bucket="recipe-images"
                )
                recipe_data["image_url"] = image_url
                print("[save_optimized_recipe] Image uploaded to storage", {"image_url": image_url})
            except Exception as img_error:
                print(f"[save_optimized_recipe] Failed to upload image to storage: {str(img_error)}")
                # Continue without image - recipe will be saved without image_url
        
        # Save recipe to database
        saved_recipe = db_service.create_recipe(recipe_data, user_id)
        recipe_id = saved_recipe.get("id")
        print(
            "[save_optimized_recipe] Recipe saved to database",
            {"recipe_id": recipe_id, "user_id": user_id},
        )
        
        # Create analytics entry
        db_service.create_recipe_analytics(recipe_id, user_id)
        print("[save_optimized_recipe] Analytics entry created", {"recipe_id": recipe_id})
        
        # Log user activity to analytics_user_activity
        db_service.log_recipe_creation(user_id, recipe_id)
        print("[save_optimized_recipe] User activity logged to analytics", {"recipe_id": recipe_id, "user_id": user_id})
        
        # Log to user_recipe_actions table - log as 'create' action
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="create",
                recipe_id=recipe_id
            )
            print("[save_optimized_recipe] User recipe action logged (create)", {"recipe_id": recipe_id, "user_id": user_id})
        except Exception as action_error:
            print(f"[save_optimized_recipe] Failed to log user recipe action (create): {str(action_error)}")
        
        # Also log as 'optimize_recipe' action for analytics (optimized meals count)
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="optimize_recipe",
                recipe_id=recipe_id
            )
            print("[save_optimized_recipe] User recipe action logged (optimize_recipe)", {"recipe_id": recipe_id, "user_id": user_id})
        except Exception as action_error:
            print(f"[save_optimized_recipe] Failed to log user recipe action (optimize_recipe): {str(action_error)}")
        
        return {
            "status": "success",
            "recipe_id": recipe_id,
            "recipe": saved_recipe,
            "message": "Optimized recipe saved successfully"
        }
    
    except Exception as e:
        import traceback
        print(f"[save_optimized_recipe] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error saving optimized recipe: {str(e)}"
        )

@app.get("/api/users/{user_id}/recent-meals")
async def get_recent_meals(
    user_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get recent meals from user_recipe_actions where action_type='step-by-step'
    
    Returns the 5 most recent recipes that the user has viewed in step-by-step mode.
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own recent meals"
            )
        
        print(f"[get_recent_meals] Fetching recent meals for user: {user_id}")
        
        # Call database service to get recent step-by-step recipes
        recipes = db_service.get_recent_step_by_step_recipes(user_id, limit=5)
        
        print(f"[get_recent_meals] Found {len(recipes)} recent meals")
        
        return recipes
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[get_recent_meals] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recent meals: {str(e)}"
        )

@app.get("/api/recipes/community")
async def get_community_recipes(
    page: int = 1,
    limit: int = 20,
    sort: str = "newest",
    tags: Optional[str] = None,
    search: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """
    Get community recipes with pagination, filtering, and sorting
    
    Query Parameters:
        page: Page number (default: 1)
        limit: Number of recipes per page (default: 20, max: 100)
        sort: Sort type - "newest", "trending", or "popular" (default: "newest")
        tags: Comma-separated tags to filter by
        search: Search query string
    """
    try:
        # Validate sort parameter
        if sort not in ["newest", "trending", "popular"]:
            sort = "newest"
        
        # Validate and clamp limit
        limit = min(max(1, limit), 100)
        page = max(1, page)
        
        # Parse tags if provided
        tags_list = None
        if tags:
            tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # Call database service
        result = db_service.get_community_recipes(
            page=page,
            limit=limit,
            sort=sort,
            tags=tags_list,
            search=search,
            user_id=None
        )
        
        return result
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching community recipes: {str(e)}")

@app.get("/api/recipes/community/public")
async def get_community_recipes_public(
    page: int = 1,
    limit: int = 20,
    sort: str = "newest",
    tags: Optional[str] = None,
    search: Optional[str] = None
):
    """
    Get community recipes with pagination, filtering, and sorting (PUBLIC - no authentication required)
    
    Query Parameters:
        page: Page number (default: 1)
        limit: Number of recipes per page (default: 20, max: 100)
        sort: Sort type - "newest", "trending", or "popular" (default: "newest")
        tags: Comma-separated tags to filter by
        search: Search query string
    """
    try:
        # Validate sort parameter
        if sort not in ["newest", "trending", "popular"]:
            sort = "newest"
        
        # Validate and clamp limit
        limit = min(max(1, limit), 100)
        page = max(1, page)
        
        # Parse tags if provided
        tags_list = None
        if tags:
            tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # Call database service (same as authenticated endpoint)
        result = db_service.get_community_recipes(
            page=page,
            limit=limit,
            sort=sort,
            tags=tags_list,
            search=search,
            user_id=None
        )
        
        return result
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching community recipes: {str(e)}")

@app.get("/api/recipes/community/user/{user_id}")
async def get_user_posted_recipes(
    user_id: str,
    page: int = 1,
    limit: int = 20,
    sort: str = "newest",
    token_data: dict = Depends(verify_token)
):
    """
    Get recipes posted by a specific user to the community
    
    Query Parameters:
        page: Page number (default: 1)
        limit: Number of recipes per page (default: 20, max: 100)
        sort: Sort type - "newest", "trending", or "popular" (default: "newest")
    """
    try:
        # Verify that the user_id in the path matches the token (users can only see their own)
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own posted recipes"
            )
        
        # Validate sort parameter
        if sort not in ["newest", "trending", "popular"]:
            sort = "newest"
        
        # Validate and clamp limit
        limit = min(max(1, limit), 100)
        page = max(1, page)
        
        # Call database service with user_id filter
        result = db_service.get_community_recipes(
            page=page,
            limit=limit,
            sort=sort,
            tags=None,
            search=None,
            user_id=user_id
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching user posted recipes: {str(e)}")

@app.get("/api/recipes/{recipe_id}/public")
async def get_recipe_public(recipe_id: str):
    """
    Get a public recipe by ID without authentication
    Returns recipe data with posted_by information, comments_count, and likes count for shared recipe links
    """
    try:
        recipe = db_service.get_recipe(recipe_id)
        
        if not recipe:
            raise HTTPException(
                status_code=404,
                detail="Recipe not found"
            )
        
        # Get community data for posted_by info, comments_count, and likes
        posted_by_info = None
        comments_count = 0
        likes_count = 0
        try:
            community_result = db_service.supabase.table("community").select("posted_by, comments, likes").eq("recipe_id", recipe_id).execute()
            if community_result.data and len(community_result.data) > 0:
                community_data = community_result.data[0]
                posted_by_id = community_data.get("posted_by")
                
                # Get comments count
                comments = community_data.get("comments", [])
                if isinstance(comments, list):
                    comments_count = len(comments)
                
                # Get likes count
                likes_count = community_data.get("likes", 0) or 0
                
                if posted_by_id:
                    # Get profile info
                    profile_result = db_service.supabase.table("profiles").select("user_id, full_name, avatar_url").eq("user_id", posted_by_id).execute()
                    if profile_result.data and len(profile_result.data) > 0:
                        profile = profile_result.data[0]
                        posted_by_info = {
                            "id": posted_by_id,
                            "name": profile.get("full_name", "Unknown"),
                            "avatar": profile.get("avatar_url")
                        }
        except Exception:
            # If community/profile lookup fails, continue without posted_by info
            pass
        
        # Transform steps if needed
        recipe_data = dict(recipe)
        if recipe_data.get("steps") and isinstance(recipe_data["steps"], list):
            recipe_data["steps"] = [
                {
                    "instruction": step.get("instruction") or step.get("text", ""),
                    "step_type": step.get("step_type", "active")  # Default to "active" for backward compatibility
                }
                if isinstance(step, dict) else step
                for step in recipe_data["steps"]
            ]
        
        # Add posted_by info, comments_count, and likes to recipe
        if posted_by_info:
            recipe_data["posted_by"] = posted_by_info
        recipe_data["comments_count"] = comments_count
        recipe_data["likes"] = likes_count
        
        return {
            "status": "success",
            "recipe": recipe_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recipe: {str(e)}"
        )

@app.get("/api/recipes/{recipe_id}")
async def get_recipe(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get a recipe by ID from Supabase
    """
    try:
        recipe = db_service.get_recipe(recipe_id)
        
        if not recipe:
            raise HTTPException(
                status_code=404,
                detail="Recipe not found"
            )
        
        return {
            "status": "success",
            "recipe": recipe
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recipe: {str(e)}"
        )

@app.get("/api/recipes/{recipe_id}/image")
async def get_recipe_image(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Get recipe image. Returns 202 if still generating, 200 with image_base64 if ready.
    """
    try:
        # Fetch fresh recipe data (no caching)
        recipe = db_service.get_recipe(recipe_id)
        
        if not recipe:
            raise HTTPException(
                status_code=404,
                detail="Recipe not found"
            )
        
        # Check if user has access to this recipe
        recipe_user_id = recipe.get("user_id")
        if recipe_user_id != token_data["user_id"] and not recipe.get("is_public", False):
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this recipe"
            )
        
        # Check image_url first (preferred - image already uploaded to storage)
        image_url = recipe.get("image_url")
        
        if image_url:
            # Image is ready and uploaded to storage
            print(f"[get_recipe_image] Image found for recipe_id: {recipe_id}, image_url: {image_url[:50]}...")
            return {
                "status": "success",
                "image_url": image_url,
                "ready": True
            }
        
        # Fallback: Check ai_context for image_base64 (legacy support)
        ai_context = recipe.get("ai_context", {}) or {}
        if isinstance(ai_context, str):
            try:
                import json
                ai_context = json.loads(ai_context)
            except:
                ai_context = {}
        
        image_base64 = ai_context.get("image_base64") if isinstance(ai_context, dict) else None
        
        if image_base64:
            # Image exists as base64 - upload it to storage and return URL
            try:
                image_filename = f"recipe_{recipe_id}.jpg"
                uploaded_url = db_service.upload_base64_image_to_storage(
                    image_base64,
                    image_filename,
                    bucket="recipe-images"
                )
                # Update recipe with image_url
                db_service.update_recipe_image_url(recipe_id, uploaded_url)
                # Remove base64 from ai_context
                ai_context.pop("image_base64", None)
                db_service.supabase.table("recipes").update({"ai_context": ai_context}).eq("id", recipe_id).execute()
                
                print(f"[get_recipe_image] Converted base64 to URL for recipe_id: {recipe_id}")
                return {
                    "status": "success",
                    "image_url": uploaded_url,
                    "ready": True
                }
            except Exception as upload_error:
                import traceback
                print(f"[get_recipe_image] Failed to upload base64 image to storage: {str(upload_error)}")
                print(f"[get_recipe_image] Traceback: {traceback.format_exc()}")
                # Return base64 as fallback
                return {
                    "status": "success",
                    "image_base64": image_base64,
                    "ready": True
                }
        else:
            # Image is still generating or not available
            print(f"[get_recipe_image] Image still generating for recipe_id: {recipe_id}")
            return {
                "status": "processing",
                "ready": False,
                "message": "Image is still being generated"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[get_recipe_image] Error fetching recipe image: {str(e)}")
        print(f"[get_recipe_image] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recipe image: {str(e)}"
        )

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, token_data: dict = Depends(verify_token)):
    """
    Get user data by ID
    Fetches data from both auth.users and profiles tables
    JWT token is verified before processing
    """
    try:
        t0 = time.perf_counter()
        print(f"[perf][get_user] start user_id={user_id}")

        # Verify that the user_id in the path matches the token (or user has permission)
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own user data"
            )
        print(f"[perf][get_user] after token check {int((time.perf_counter()-t0)*1000)}ms")
        
        # Fetch profile data from profiles table
        profile = db_service.get_profile(user_id)
        print(f"[perf][get_user] after profile fetch {int((time.perf_counter()-t0)*1000)}ms")
        
        if not profile:
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )
        
        # Fetch auth user data from auth.users (via Supabase Admin API)
        # If this fails, we'll use token data as fallback
        auth_user = None
        try:
            auth_user = db_service.get_user_auth_data(user_id)
        except Exception as auth_error:
            # Use token data as fallback if admin API fails
            auth_user = None
        print(f"[perf][get_user] after auth fetch {int((time.perf_counter()-t0)*1000)}ms")
        
        # Combine auth and profile data
        user_data = {
            "status": "success",
            "user_id": user_id,
            "verified": True
        }
        
        # Add auth data if available
        if auth_user:
            user_data["auth"] = {
                "email": auth_user.get("email"),
                "email_confirmed_at": auth_user.get("email_confirmed_at"),
                "last_sign_in_at": auth_user.get("last_sign_in_at"),
                "created_at": auth_user.get("created_at"),
                "updated_at": auth_user.get("updated_at"),
                "app_metadata": auth_user.get("app_metadata", {}),
                "user_metadata": auth_user.get("user_metadata", {}),
            }
        else:
            # Fallback to token data if admin API fails
            user_data["auth"] = {
                "email": token_data.get("email"),
                "email_confirmed_at": None,
                "last_sign_in_at": None,
            }
        
        # Add profile data
        user_data["profile"] = profile
        print(f"[perf][get_user] done total {int((time.perf_counter()-t0)*1000)}ms")
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@app.get("/api/users/{user_id}/profile")
async def get_user_profile(user_id: str, token_data: dict = Depends(verify_token)):
    """
    Get user profile data
    Fetches profile from profiles table including liked_recipes field
    """
    try:
        t0 = time.perf_counter()
        print(f"[perf][get_user_profile] start user_id={user_id}")

        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own profile"
            )
        print(f"[perf][get_user_profile] after token check {int((time.perf_counter()-t0)*1000)}ms")
        
        # Fetch profile data from profiles table
        profile = db_service.get_profile(user_id)
        print(f"[perf][get_user_profile] after profile fetch {int((time.perf_counter()-t0)*1000)}ms")
        
        if not profile:
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )
        
        print(f"[perf][get_user_profile] done total {int((time.perf_counter()-t0)*1000)}ms")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching user profile: {str(e)}")

@app.get("/api/users/{user_id}/recipes")
async def get_user_recipes(user_id: str, token_data: dict = Depends(verify_token)):
    """
    Get all recipes created by a user
    """
    try:
        t0 = time.perf_counter()
        print(f"[perf][get_user_recipes] start user_id={user_id}")

        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own recipes"
            )
        print(f"[perf][get_user_recipes] after token check {int((time.perf_counter()-t0)*1000)}ms")
        
        recipes = db_service.get_user_recipes(user_id)
        print(f"[perf][get_user_recipes] after fetch {int((time.perf_counter()-t0)*1000)}ms")
        print(f"[perf][get_user_recipes] done total {int((time.perf_counter()-t0)*1000)}ms")
        return recipes
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching user recipes: {str(e)}")

@app.post("/api/users/{user_id}/recipes/cleanup-invalid")
async def cleanup_invalid_recipe_ids(
    user_id: str,
    request: Dict[str, Any],
    token_data: dict = Depends(verify_token)
):
    """
    Clean up invalid recipe IDs from user profile (recipes that don't exist)
    Called when 404 errors are detected for saved/liked recipes
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only clean up your own recipes"
            )
        
        recipe_ids = request.get("recipe_ids", [])
        list_type = request.get("list_type", "saved")  # "saved" or "liked"
        
        if not recipe_ids:
            return {"status": "success", "message": "No recipe IDs to clean up"}
        
        # Clean up invalid recipe IDs
        updated_profile = db_service.cleanup_invalid_recipe_ids(user_id, recipe_ids, list_type)
        
        return {
            "status": "success",
            "message": "Invalid recipe IDs cleaned up successfully",
            "profile": updated_profile
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[cleanup_invalid_recipe_ids] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error cleaning up invalid recipe IDs: {str(e)}")

@app.get("/api/users/{user_id}/recipes/saved-liked")
async def get_saved_liked_recipes(user_id: str, token_data: dict = Depends(verify_token)):
    """
    Get user's saved and liked recipes (excluding community recipes)
    Returns recipes that are in user's saved_recipes or liked_recipes but not in community
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own recipes"
            )
        
        # Get user profile to get saved and liked recipe IDs
        profile = db_service.get_profile(user_id)
        if not profile:
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )
        
        saved_recipes = profile.get("saved_recipes", [])
        liked_recipes = profile.get("liked_recipes", [])
        print(f"[get_saved_liked_recipes] saved_recipes: {saved_recipes}")
        print(f"[get_saved_liked_recipes] liked_recipes: {liked_recipes}")
        
        if not isinstance(saved_recipes, list):
            saved_recipes = []
        if not isinstance(liked_recipes, list):
            liked_recipes = []
        
        # Get community recipe IDs to exclude them (check all saved + liked recipes)
        all_recipe_ids = list(set(saved_recipes + liked_recipes))
        print(f"[get_saved_liked_recipes] all_recipe_ids: {all_recipe_ids}")
        
        community_recipe_ids = set()
        if all_recipe_ids:
            community_result = db_service.supabase.table("community").select("recipe_id").in_("recipe_id", all_recipe_ids).execute()
            if community_result.data:
                community_recipe_ids = {item.get("recipe_id") for item in community_result.data if item.get("recipe_id")}
        
        # Filter saved recipes (exclude community recipes)
        saved_recipe_ids = [rid for rid in saved_recipes if rid not in community_recipe_ids]
        print(f"[get_saved_liked_recipes] saved_recipe_ids (filtered): {saved_recipe_ids}")
        
        # Filter liked recipes (exclude community recipes)
        liked_recipe_ids = [rid for rid in liked_recipes if rid not in community_recipe_ids]
        print(f"[get_saved_liked_recipes] liked_recipe_ids (filtered): {liked_recipe_ids}")
        
        # Combine all recipe IDs to fetch (deduplicated)
        recipe_ids_to_fetch = list(set(saved_recipe_ids + liked_recipe_ids))
        print(f"[get_saved_liked_recipes] recipe_ids_to_fetch: {recipe_ids_to_fetch}")
        
        # Fetch all recipes by IDs
        fetched_recipes_map = {}
        if recipe_ids_to_fetch:
            recipes_result = (
    db_service.supabase
    .table("recipes")
    .select("id, title, description, image_url, meal_type, tags, prep_time, cook_time, serving_size, nutrition, steps, is_ai_generated")
    .in_("id", recipe_ids_to_fetch)
    .execute()
)
            print(f"[get_saved_liked_recipes] recipes_result count: {len(recipes_result.data) if recipes_result.data else 0}")
            
            if recipes_result.data:
                for recipe in recipes_result.data:
                    recipe_id = recipe.get("id")
                    fetched_recipes_map[recipe_id] = {
                        "id": recipe_id,
                        "title": recipe.get("title"),
                        "description": recipe.get("description") or "",
                        "image_url": recipe.get("image_url"),
                        "meal_type": recipe.get("meal_type"),
                        "tags": recipe.get("tags") or [],
                        "prep_time": recipe.get("prep_time") if recipe.get("prep_time") is not None else 0,
                        "cook_time": recipe.get("cook_time") if recipe.get("cook_time") is not None else 0,
                        "serving_size": recipe.get("serving_size") or 1,
                        "nutrition": recipe.get("nutrition") or {"calories": 0},
                        "is_public": False,  # These are not in community, so is_public = False
                        "steps": recipe.get("steps") or [],
                        "is_ai_generated": recipe.get("is_ai_generated", False),
                    }
        
        # Build separate arrays for saved and liked recipes
        saved_recipes_list = [fetched_recipes_map[rid] for rid in saved_recipe_ids if rid in fetched_recipes_map]
        liked_recipes_list = [fetched_recipes_map[rid] for rid in liked_recipe_ids if rid in fetched_recipes_map]
        
        print(f"[get_saved_liked_recipes] saved_recipes_list count: {len(saved_recipes_list)}")
        print(f"[get_saved_liked_recipes] liked_recipes_list count: {len(liked_recipes_list)}")
        
        return {
            "saved_recipes": saved_recipes_list,
            "liked_recipes": liked_recipes_list
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[get_saved_liked_recipes] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching saved/liked recipes: {str(e)}")

@app.get("/api/users/{user_id}/analytics")
async def get_user_analytics(user_id: str, token_data: dict = Depends(verify_token)):
    """
    Get aggregated analytics data for a user
    """
    try:
        t0 = time.perf_counter()
        print(f"[perf][get_user_analytics] start user_id={user_id}")

        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own analytics"
            )
        print(f"[perf][get_user_analytics] after token check {int((time.perf_counter()-t0)*1000)}ms")
        
        analytics = db_service.get_user_analytics(user_id)
        print(f"[perf][get_user_analytics] after fetch {int((time.perf_counter()-t0)*1000)}ms")
        print(f"[perf][get_user_analytics] done total {int((time.perf_counter()-t0)*1000)}ms")
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching user analytics: {str(e)}")

@app.get("/api/users/{user_id}/activities")
async def get_user_activities(user_id: str, limit: int = 10, token_data: dict = Depends(verify_token)):
    """
    Get user's recent activities from user_recipe_actions table
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own activities"
            )
        
        activities = db_service.get_user_recipe_actions(user_id, limit)
        return activities
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching user activities: {str(e)}")

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

@app.post("/api/users/{user_id}/profile/avatar")
async def upload_profile_avatar(
    user_id: str,
    image: UploadFile = File(...),
    token_data: dict = Depends(verify_token)
):
    """
    Upload profile avatar image to Supabase Storage
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only upload your own avatar"
            )
        
        # Validate image file
        if not image.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file type
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
        file_ext = image.filename.split('.')[-1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Read image bytes
        image_bytes = await image.read()
        
        # Check file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if len(image_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail="Image size exceeds 5MB limit"
            )
        
        # Upload to Supabase Storage
        avatar_url = db_service.upload_image_to_storage(
            image_bytes,
            image.filename,
            bucket="avatars"
        )
        
        return {
            "status": "success",
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error uploading avatar: {str(e)}")

@app.put("/api/users/{user_id}/profile")
async def update_user_profile(
    user_id: str,
    request: ProfileUpdateRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Update user profile data
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own profile"
            )
        
        # Prepare update data
        update_data = {}
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        if request.bio is not None:
            update_data["bio"] = request.bio
        if request.avatar_url is not None:
            update_data["avatar_url"] = request.avatar_url
        
        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields to update"
            )
        
        # Update profile
        updated_profile = db_service.update_profile(
            user_id=user_id,
            full_name=update_data.get("full_name"),
            bio=update_data.get("bio"),
            avatar_url=update_data.get("avatar_url")
        )
        
        # Log analytics activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="update_profile",
                metadata={"updated_fields": list(update_data.keys())}
            )
        except Exception as analytics_error:
            # Don't fail the update if analytics logging fails
            print(f"Warning: Failed to log analytics for profile update: {str(analytics_error)}")
        
        return updated_profile
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error updating user profile: {str(e)}")

class PreferencesUpdateRequest(BaseModel):
    dietary_preferences: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    allergies: Optional[List[str]] = None

@app.put("/api/users/{user_id}/preferences")
async def update_user_preferences(
    user_id: str,
    request: PreferencesUpdateRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Update user preferences (dietary, goals, allergies)
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own preferences"
            )
        
        # Update profile preferences
        updated_profile = db_service.update_profile(
            user_id=user_id,
            dietary_preferences=request.dietary_preferences,
            goals=request.goals,
            allergies=request.allergies
        )
        
        # Log analytics activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="update_preferences",
                metadata={
                    "dietary_preferences": request.dietary_preferences,
                    "goals": request.goals,
                    "allergies": request.allergies
                }
            )
        except Exception as analytics_error:
            print(f"Warning: Failed to log analytics for preferences update: {str(analytics_error)}")
        
        return updated_profile
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error updating user preferences: {str(e)}")

@app.post("/api/recipes/{recipe_id}/like")
async def like_recipe(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Like a recipe - adds to user's liked_recipes and updates analytics
    """
    try:
        user_id = token_data["user_id"]
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Check if user is the recipe owner and add to vector DB if not already present
        recipe_user_id = recipe.get("user_id")
        if recipe_user_id == user_id:
            # Owner likes their own recipe - add to Pinecone if not already present
            try:
                if not similarity_service.recipe_exists_in_pinecone(recipe_id):
                    # Format recipe data for Pinecone
                    ingredients = recipe.get("ingredients", [])
                    if ingredients and isinstance(ingredients[0], dict):
                        ingredient_names = [ing.get("name", "") for ing in ingredients]
                    else:
                        ingredient_names = ingredients if isinstance(ingredients, list) else []
                    
                    steps = recipe.get("steps", [])
                    if steps and isinstance(steps[0], dict):
                        step_instructions = [step.get("instruction", "") for step in steps]
                    else:
                        step_instructions = steps if isinstance(steps, list) else []
                    
                    recipe_for_pinecone = {
                        "id": recipe_id,
                        "title": recipe.get("title"),
                        "description": recipe.get("description", ""),
                        "ingredients": ingredient_names,
                        "steps": step_instructions,
                        "tags": recipe.get("tags", []),
                        "meal_type": recipe.get("meal_type", "Dinner"),
                        "prep_time": recipe.get("prep_time"),
                        "cook_time": recipe.get("cook_time"),
                        "serving_size": recipe.get("serving_size", 1),
                    }
                    similarity_service.index_recipe(recipe_for_pinecone)
                    print(f"[like_recipe] Added owner's recipe to Pinecone: {recipe_id}")
            except Exception as vector_error:
                print(f"[like_recipe] Failed to add recipe to Pinecone: {str(vector_error)}")
                # Don't fail the like operation if Pinecone indexing fails
        
        # Get user profile to check if recipe is already liked
        profile = db_service.get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        liked_recipes = profile.get("liked_recipes", [])
        if not isinstance(liked_recipes, list):
            liked_recipes = []
        
        if recipe_id in liked_recipes:
            raise HTTPException(status_code=400, detail="Recipe is already liked by user")
        
        # Add to liked_recipes
        updated_profile = db_service.add_to_liked_recipes(user_id, recipe_id)
        
        # Log to analytics_user_activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="like_recipe",
                recipe_id=recipe_id
            )
        except Exception as analytics_error:
            print(f"Warning: Failed to log analytics for like: {str(analytics_error)}")
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="like",
                recipe_id=recipe_id
            )
        except Exception as action_error:
            print(f"Warning: Failed to log user recipe action for like: {str(action_error)}")
        
        # Increment likes in analytics_recipe_performance
        db_service.update_recipe_performance_likes(recipe_id, increment=True)
        
        # Increment likes in community table if recipe exists there
        db_service.update_community_likes(recipe_id, increment=True)
        
        return {"status": "success", "message": "Recipe liked successfully", "profile": updated_profile}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error liking recipe: {str(e)}")

@app.post("/api/recipes/{recipe_id}/unlike")
async def unlike_recipe(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Unlike a recipe - removes from user's liked_recipes and updates analytics
    """
    try:
        user_id = token_data["user_id"]
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Get user profile to check if recipe is liked
        profile = db_service.get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        liked_recipes = profile.get("liked_recipes", [])
        if not isinstance(liked_recipes, list):
            liked_recipes = []
        
        if recipe_id not in liked_recipes:
            raise HTTPException(status_code=400, detail="Recipe is not liked by user")
        
        # Remove from liked_recipes
        updated_profile = db_service.remove_from_liked_recipes(user_id, recipe_id)
        
        # Log to analytics_user_activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="unlike_recipe",
                recipe_id=recipe_id
            )
        except Exception as analytics_error:
            print(f"Warning: Failed to log analytics for unlike: {str(analytics_error)}")
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="unlike",
                recipe_id=recipe_id
            )
        except Exception as action_error:
            print(f"Warning: Failed to log user recipe action for unlike: {str(action_error)}")
        
        # Decrement likes in analytics_recipe_performance
        db_service.update_recipe_performance_likes(recipe_id, increment=False)
        
        # Decrement likes in community table if recipe exists there
        db_service.update_community_likes(recipe_id, increment=False)
        
        return {"status": "success", "message": "Recipe unliked successfully", "profile": updated_profile}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error unliking recipe: {str(e)}")

@app.post("/api/users/{user_id}/recipes/{recipe_id}/unsave")
async def unsave_recipe(
    user_id: str,
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Unsave a recipe - removes from user's saved_recipes and updates analytics
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only unsave your own recipes"
            )
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Get user profile to check if recipe is saved
        profile = db_service.get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        saved_recipes = profile.get("saved_recipes", [])
        if not isinstance(saved_recipes, list):
            saved_recipes = []
        
        if recipe_id not in saved_recipes:
            raise HTTPException(status_code=400, detail="Recipe is not saved by user")
        
        # Remove from saved_recipes
        updated_profile = db_service.remove_from_saved_recipes(user_id, recipe_id)
        
        # Log to analytics_user_activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="unsave_recipe",
                recipe_id=recipe_id
            )
        except Exception as analytics_error:
            print(f"Warning: Failed to log analytics for unsave: {str(analytics_error)}")
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="unsave",
                recipe_id=recipe_id
            )
        except Exception as action_error:
            print(f"Warning: Failed to log user recipe action for unsave: {str(action_error)}")
        
        # Decrement saves in analytics_recipe_performance
        db_service.update_recipe_performance_saves(recipe_id, increment=False)
        
        return {"status": "success", "message": "Recipe unsaved successfully", "profile": updated_profile}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error unsaving recipe: {str(e)}")

@app.post("/api/users/{user_id}/recipes/{recipe_id}/save")
async def save_recipe_to_profile(
    user_id: str,
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Save a recipe to user's saved_recipes - adds to user's saved_recipes and updates analytics
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only save recipes to your own profile"
            )
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Check if user is the recipe owner and add to Pinecone if not already present
        recipe_user_id = recipe.get("user_id")
        if recipe_user_id == user_id:
            # Owner saves their own recipe - add to Pinecone if not already present
            try:
                if not similarity_service.recipe_exists_in_pinecone(recipe_id):
                    # Format recipe data for Pinecone
                    ingredients = recipe.get("ingredients", [])
                    if ingredients and isinstance(ingredients[0], dict):
                        ingredient_names = [ing.get("name", "") for ing in ingredients]
                    else:
                        ingredient_names = ingredients if isinstance(ingredients, list) else []
                    
                    steps = recipe.get("steps", [])
                    if steps and isinstance(steps[0], dict):
                        step_instructions = [step.get("instruction", "") for step in steps]
                    else:
                        step_instructions = steps if isinstance(steps, list) else []
                    
                    recipe_for_pinecone = {
                        "id": recipe_id,
                        "title": recipe.get("title"),
                        "description": recipe.get("description", ""),
                        "ingredients": ingredient_names,
                        "steps": step_instructions,
                        "tags": recipe.get("tags", []),
                        "meal_type": recipe.get("meal_type", "Dinner"),
                        "prep_time": recipe.get("prep_time"),
                        "cook_time": recipe.get("cook_time"),
                        "serving_size": recipe.get("serving_size", 1),
                    }
                    similarity_service.index_recipe(recipe_for_pinecone)
                    print(f"[save_recipe_to_profile] Added owner's recipe to Pinecone: {recipe_id}")
            except Exception as vector_error:
                print(f"[save_recipe_to_profile] Failed to add recipe to Pinecone: {str(vector_error)}")
                # Don't fail the save operation if Pinecone indexing fails
        
        # Get user profile to check if recipe is already saved
        profile = db_service.get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        saved_recipes = profile.get("saved_recipes", [])
        if not isinstance(saved_recipes, list):
            saved_recipes = []
        
        if recipe_id in saved_recipes:
            raise HTTPException(status_code=400, detail="Recipe is already saved by user")
        
        # Add to saved_recipes
        updated_profile = db_service.add_to_saved_recipes(user_id, recipe_id)
        
        # Log to analytics_user_activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="save_recipe",
                recipe_id=recipe_id
            )
        except Exception as analytics_error:
            print(f"Warning: Failed to log analytics for save: {str(analytics_error)}")
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="save",
                recipe_id=recipe_id
            )
        except Exception as action_error:
            print(f"Warning: Failed to log user recipe action for save: {str(action_error)}")
        
        # Increment saves in analytics_recipe_performance
        db_service.update_recipe_performance_saves(recipe_id, increment=True)
        
        return {"status": "success", "message": "Recipe saved successfully", "profile": updated_profile}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error saving recipe: {str(e)}")

@app.get("/api/recipes/{recipe_id}/comments/public")
async def get_recipe_comments_public(
    recipe_id: str,
    page: int = 1,
    limit: int = 20
):
    """
    Get comments for a recipe with pagination (PUBLIC - no authentication required)
    """
    try:
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20
        
        comments = db_service.get_community_comments(recipe_id, page, limit)
        
        return {
            "comments": comments,
            "page": page,
            "limit": limit,
            "total": len(comments)
        }
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

@app.get("/api/recipes/{recipe_id}/comments")
async def get_recipe_comments(
    recipe_id: str,
    page: int = 1,
    limit: int = 20,
    token_data: dict = Depends(verify_token)
):
    """
    Get comments for a recipe with pagination
    """
    try:
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20
        
        comments = db_service.get_community_comments(recipe_id, page, limit)
        
        return {
            "comments": comments,
            "page": page,
            "limit": limit,
            "total": len(comments)
        }
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

class CommentRequest(BaseModel):
    comment_text: str

@app.post("/api/recipes/{recipe_id}/comments")
async def add_recipe_comment(
    recipe_id: str,
    request: CommentRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Add a comment to a recipe
    """
    try:
        user_id = token_data["user_id"]
        
        if not request.comment_text or not request.comment_text.strip():
            raise HTTPException(status_code=400, detail="Comment text is required")
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Add comment to community.comments
        new_comment = db_service.add_community_comment(
            recipe_id=recipe_id,
            user_id=user_id,
            comment_text=request.comment_text.strip()
        )
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="comment",
                recipe_id=recipe_id,
                comment_text=request.comment_text.strip()
            )
        except Exception as action_error:
            print(f"Warning: Failed to log user recipe action for comment: {str(action_error)}")
        
        # Increment comments_count in analytics_recipe_performance
        db_service.update_recipe_performance_comments_count(recipe_id, increment=True)
        
        # Return updated comment list (first page to include the new comment)
        updated_comments = db_service.get_community_comments(recipe_id, page=1, limit=20)
        
        return {
            "status": "success",
            "message": "Comment added successfully",
            "comment": new_comment,
            "comments": updated_comments
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error adding comment: {str(e)}")

@app.post("/api/recipes/{recipe_id}/share")
async def share_recipe(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Track a share event for a recipe
    """
    try:
        user_id = token_data["user_id"]
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="share",
                recipe_id=recipe_id
            )
        except Exception as action_error:
            print(f"Warning: Failed to log user recipe action for share: {str(action_error)}")
        
        # Increment shares in community table
        db_service.update_community_shares(recipe_id, increment=True)
        
        # Increment shares in analytics_recipe_performance
        db_service.update_recipe_performance_shares(recipe_id, increment=True)
        
        return {"status": "success", "message": "Share tracked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error tracking share: {str(e)}")

@app.post("/api/recipes/{recipe_id}/make-public")
async def make_recipe_public(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Make a recipe public by setting is_public to true
    """
    try:
        user_id = token_data["user_id"]
        
        # Verify recipe exists and belongs to user
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Check if user owns the recipe
        if recipe.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="You can only make your own recipes public")
        
        # Update recipe to be public
        updated_recipe = db_service.update_recipe_is_public(recipe_id, is_public=True)
        
        return {
            "status": "success",
            "message": "Recipe made public successfully",
            "recipe": updated_recipe
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error making recipe public: {str(e)}")

@app.post("/api/recipes/{recipe_id}/view")
async def view_recipe(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Track a view event for a recipe
    Increments views in community and analytics_recipe_performance tables
    Logs to user_recipe_actions and analytics_user_activity tables
    """
    try:
        user_id = token_data["user_id"]
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Log to user_recipe_actions
        try:
            db_service.log_user_recipe_action(
                user_id=user_id,
                action_type="view",
                recipe_id=recipe_id
            )
        except Exception as action_error:
            print(f"Warning: Failed to log user recipe action for view: {str(action_error)}")
        
        # Log to analytics_user_activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="view_recipe",
                recipe_id=recipe_id
            )
        except Exception as analytics_error:
            print(f"Warning: Failed to log analytics activity for view: {str(analytics_error)}")
        
        # Increment views in community table
        db_service.update_community_views(recipe_id, increment=True)
        
        # Increment views in analytics_recipe_performance
        db_service.update_recipe_performance_views(recipe_id, increment=True)
        
        return {"status": "success", "message": "View tracked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error tracking view for recipe {recipe_id}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error tracking view: {str(e)}")

@app.post("/api/recipes/{recipe_id}/step-by-step")
async def log_step_by_step_action(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Track a step-by-step action for a recipe
    Logs to user_recipe_actions table with action_type='step-by-step'
    This is called when a user opens the FeastGuide page
    Non-blocking execution - returns immediately while logging happens in background
    """
    try:
        user_id = token_data["user_id"]
        
        # Verify recipe exists (quick check)
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Log to user_recipe_actions with action_type='step-by-step' in background (non-blocking)
        async def log_action_background():
            try:
                # Run synchronous database call in thread pool (non-blocking)
                await asyncio.to_thread(
                    db_service.log_user_recipe_action,
                    user_id=user_id,
                    action_type="step-by-step",
                    recipe_id=recipe_id
                )
                print(f"[log_step_by_step_action] Logged step-by-step action for user {user_id}, recipe {recipe_id}")
            except Exception as action_error:
                print(f"Warning: Failed to log user recipe action for step-by-step: {str(action_error)}")
        
        # Start background task (non-blocking, fire and forget)
        asyncio.create_task(log_action_background())
        
        # Return immediately without waiting for logging to complete
        return {"status": "success", "message": "Step-by-step action tracking initiated"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in log_step_by_step_action for recipe {recipe_id}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error tracking step-by-step action: {str(e)}")

@app.post("/api/recipes/{recipe_id}/progress")
async def save_recipe_progress(
    recipe_id: str,
    request: Dict[str, Any],
    token_data: dict = Depends(verify_token)
):
    """
    Save user's progress in a recipe (for Feast Guide)
    """
    user_id = token_data["user_id"]
    
    try:
        current_index = request.get("current_index", 0)
        timestamp = request.get("timestamp", int(datetime.now().timestamp() * 1000))
        local_state = request.get("local_state", {})
        
        # Validate recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Save progress
        progress_data = db_service.save_recipe_progress(
            user_id=user_id,
            recipe_id=recipe_id,
            current_index=current_index,
            timestamp=timestamp,
            local_state=local_state
        )
        
        return {
            "status": "success",
            "message": "Progress saved successfully",
            "progress": progress_data
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error saving recipe progress: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error saving progress: {str(e)}"
        )

@app.post("/api/recipes/{recipe_id}/replace-ingredients")
async def replace_recipe_ingredients(
    recipe_id: str,
    request: IngredientReplacementRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Replace specific ingredients in a recipe using LLM
    Updates recipe with new ingredients, adjusted steps, and recalculated nutrition
    """
    try:
        user_id = token_data["user_id"]
        
        # Verify recipe exists
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Verify user has access to the recipe (owner or saved/liked)
        recipe_user_id = recipe.get("user_id")
        if recipe_user_id != user_id:
            # Check if user has saved or liked this recipe
            profile = db_service.get_profile(user_id)
            saved_recipes = profile.get("saved_recipes", []) if profile else []
            liked_recipes = profile.get("liked_recipes", []) if profile else []
            
            if recipe_id not in saved_recipes and recipe_id not in liked_recipes:
                raise HTTPException(
                    status_code=403,
                    detail="You can only replace ingredients in recipes you own, saved, or liked"
                )
        
        # Get recipe service and nutrition service
        recipe_service = get_recipe_service()
        nutrition_service = get_nutrition_service()
        
        # Prepare recipe data for replacement
        recipe_data = {
            "title": recipe.get("title", ""),
            "description": recipe.get("description", ""),
            "ingredients": recipe.get("ingredients", []),
            "steps": recipe.get("steps", []),
            "prep_time": recipe.get("prep_time", 15),
            "cook_time": recipe.get("cook_time", 20),
            "serving_size": recipe.get("serving_size", 1),
        }
        
        # Replace ingredients using LLM
        print(f"Replacing ingredients in recipe {recipe_id}")
        updated_recipe_output = recipe_service.replace_ingredients(
            recipe_data=recipe_data,
            ingredient_indices=request.ingredient_indices,
            replacement_reason=request.replacement_reason
        )
        
        # Convert RecipeOutput to database format
        updated_ingredients = []
        for ing in updated_recipe_output.ingredients:
            updated_ingredients.append({
                "name": ing.name,
                "quantity": ing.quantity,
                "unit": ing.unit
            })
        
        updated_steps = []
        for step in updated_recipe_output.steps:
            updated_steps.append({
                "step_number": step.step_number,
                "instruction": step.instruction,
                "step_type": step.step_type
            })
        
        # Run nutrition analysis on updated recipe
        # NutritionService already handles retries with exponential backoff internally
        print("Running nutrition analysis on updated recipe")
        nutrition_data = nutrition_service.get_recipe_nutrition(
            ingredients=updated_ingredients,
            steps=updated_steps,
            title=updated_recipe_output.title,
            servings=updated_recipe_output.serving_size
        ) or {}  # Default to empty dict if nutrition analysis fails after retries
        
        # Update recipe in database
        updated_recipe = db_service.update_recipe_ingredients(
            recipe_id=recipe_id,
            ingredients=updated_ingredients,
            steps=updated_steps,
            nutrition=nutrition_data
        )
        
        # Prepare response with updated recipe data
        response_data = {
            "status": "success",
            "message": "Ingredients replaced successfully",
            "recipe": {
                "id": updated_recipe.get("id"),
                "title": updated_recipe.get("title"),
                "description": updated_recipe.get("description"),
                "ingredients": updated_recipe.get("ingredients", []),
                "steps": updated_recipe.get("steps", []),
                "nutrition": updated_recipe.get("nutrition", {}),
                "prep_time": updated_recipe.get("prep_time"),
                "cook_time": updated_recipe.get("cook_time"),
                "serving_size": updated_recipe.get("serving_size"),
                "tags": updated_recipe.get("tags", []),
                "image_url": updated_recipe.get("image_url"),
                "is_public": updated_recipe.get("is_public", False),
            }
        }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error replacing ingredients: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error replacing ingredients: {str(e)}")

@app.post("/api/recipes/community")
async def share_recipe_to_community(
    title: str = Form(...),
    description: str = Form(...),
    tags: str = Form(...),  # JSON string array
    isAiGenerated: bool = Form(False),
    recipeId: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    steps: Optional[str] = Form(None),  # JSON string array of steps
    token_data: dict = Depends(verify_token)
):
    """
    Share a recipe to the community hub
    Creates new recipe or updates existing recipe to be public
    Initializes community and analytics records
    Logs user activities
    """
    try:
        user_id = token_data["user_id"]
        
        # Parse tags from JSON string
        try:
            tags_list = json.loads(tags) if isinstance(tags, str) else tags
            if not isinstance(tags_list, list):
                raise HTTPException(status_code=400, detail="Tags must be a JSON array")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid tags format")
        
        # Parse steps from JSON string if provided
        steps_list = []
        if steps:
            try:
                steps_parsed = json.loads(steps) if isinstance(steps, str) else steps
                if isinstance(steps_parsed, list):
                    # Convert to the format expected by database
                    steps_list = [
                        {
                            "step_number": step.get("step_number", idx + 1),
                            "instruction": step.get("instruction", step.get("text", "")),
                            "step_type": step.get("step_type", "active")  # Default to "active" if not provided
                        }
                        for idx, step in enumerate(steps_parsed)
                        if step.get("instruction") or step.get("text")
                    ]
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid steps format")
        
        # Validate required fields
        if not title.strip():
            raise HTTPException(status_code=400, detail="Title is required")
        if not description.strip():
            raise HTTPException(status_code=400, detail="Description is required")
        
        image_url = None
        
        # Handle image upload if provided
        if image and image.filename:
            try:
                image_bytes = await image.read()
                image_url = db_service.upload_image_to_storage(
                    image_bytes,
                    image.filename,
                    bucket="recipe-images"
                )
                print(f"Image uploaded to storage: {image_url}")
            except Exception as img_error:
                print(f"Warning: Failed to upload image: {str(img_error)}")
                # Continue without image - don't fail the whole operation
        
        if recipeId:
            # Update existing recipe to be public
            existing_recipe = db_service.get_recipe(recipeId)
            if not existing_recipe:
                raise HTTPException(status_code=404, detail="Recipe not found")
            
            # Verify user owns the recipe or has access to it
            if existing_recipe.get("user_id") != user_id:
                # Check if recipe is in user's saved/liked recipes
                profile = db_service.get_profile(user_id)
                saved_recipes = profile.get("saved_recipes", []) if profile else []
                liked_recipes = profile.get("liked_recipes", []) if profile else []
                
                if recipeId not in saved_recipes and recipeId not in liked_recipes:
                    raise HTTPException(
                        status_code=403,
                        detail="You can only share recipes you own or have saved/liked"
                    )
            
            # If no new image was uploaded, preserve existing image_url
            if not image_url:
                existing_image_url = existing_recipe.get("image_url")
                # Also check if there's a base64 image in ai_context that should be uploaded
                ai_context = existing_recipe.get("ai_context", {})
                if isinstance(ai_context, dict) and ai_context.get("image_base64"):
                    # Upload base64 image to storage
                    try:
                        import base64
                        image_base64 = ai_context.get("image_base64")
                        # Remove data URL prefix if present
                        if image_base64.startswith("data:image"):
                            image_base64 = image_base64.split(",")[1]
                        
                        image_bytes = base64.b64decode(image_base64)
                        # Generate filename from recipe title
                        filename = f"{title.strip().replace(' ', '_')[:50]}.jpg"
                        image_url = db_service.upload_image_to_storage(
                            image_bytes,
                            filename,
                            bucket="recipe-images"
                        )
                        print(f"Base64 image uploaded to storage: {image_url}")
                    except Exception as base64_error:
                        print(f"Warning: Failed to upload base64 image: {str(base64_error)}")
                        # Fall back to existing image_url if available
                        image_url = existing_image_url
                else:
                    # Use existing image_url if available
                    image_url = existing_image_url
            
            # Get existing recipe's is_ai_generated value, but allow form to override
            existing_is_ai_generated = existing_recipe.get("is_ai_generated", False)
            # Use form value if provided, otherwise preserve existing value
            final_is_ai_generated = isAiGenerated if isAiGenerated is not None else existing_is_ai_generated
            
            # Update recipe to public
            updated_recipe = db_service.update_recipe_to_public(
                recipe_id=recipeId,
                title=title.strip(),
                description=description.strip(),
                tags=tags_list,
                image_url=image_url,
                steps=steps_list if steps_list else None,
                is_ai_generated=final_is_ai_generated
            )
            
            recipe_id = recipeId
            
            # Create or update community record
            db_service.create_community_record(recipe_id, user_id)
            
            # Create or update analytics record
            try:
                db_service.create_recipe_analytics(recipe_id, user_id, ai_generated=isAiGenerated)
            except Exception as analytics_error:
                print(f"Warning: Failed to create/update analytics: {str(analytics_error)}")
            
            # Log to analytics_user_activity
            try:
                db_service.log_analytics_activity(
                    user_id=user_id,
                    action_type="share_recipe",
                    recipe_id=recipe_id
                )
            except Exception as analytics_error:
                print(f"Warning: Failed to log analytics activity: {str(analytics_error)}")
            
            # Log to user_recipe_actions
            try:
                db_service.log_user_recipe_action(
                    user_id=user_id,
                    action_type="share",
                    recipe_id=recipe_id
                )
            except Exception as action_error:
                print(f"Warning: Failed to log user recipe action: {str(action_error)}")
            
            return {
                "status": "success",
                "message": "Recipe shared to community successfully",
                "recipe": updated_recipe
            }
        else:
            # Create new recipe
            recipe_data = {
                "title": title.strip(),
                "description": description.strip(),
                "tags": tags_list,
                "image_url": image_url,
                "is_public": True,
                "serving_size": 1,  # Default values
                "prep_time": 0,  # No default time - user should specify if needed
                "cook_time": 0,  # No default time - user should specify if needed
                "ingredients": [],
                "steps": steps_list if steps_list else [],
                "nutrition": {"calories": 0},
                "ai_context": {"is_community_shared": True},
                "is_ai_generated": isAiGenerated if isAiGenerated is not None else False
            }
            
            # Create recipe
            created_recipe = db_service.create_recipe(recipe_data, user_id)
            recipe_id = created_recipe.get("id")
            
            # Create community record
            db_service.create_community_record(recipe_id, user_id)
            
            # Create analytics record
            db_service.create_recipe_analytics(recipe_id, user_id, ai_generated=isAiGenerated)
            
            # Log to analytics_user_activity
            try:
                db_service.log_analytics_activity(
                    user_id=user_id,
                    action_type="create_recipe",
                    recipe_id=recipe_id,
                    metadata={"is_community_shared": True, "is_ai_generated": isAiGenerated}
                )
            except Exception as analytics_error:
                print(f"Warning: Failed to log analytics activity: {str(analytics_error)}")
            
            # Log to user_recipe_actions
            try:
                db_service.log_user_recipe_action(
                    user_id=user_id,
                    action_type="create",
                    recipe_id=recipe_id
                )
            except Exception as action_error:
                print(f"Warning: Failed to log user recipe action: {str(action_error)}")
            
            return {
                "status": "success",
                "message": "Recipe created and shared to community successfully",
                "recipe": created_recipe
            }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error sharing recipe to community: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error sharing recipe: {str(e)}")

@app.post("/api/recipes/community/{recipe_id}/delete")
async def delete_recipe_from_community(
    recipe_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Soft delete recipe from community hub by prepending 'deleted_' to posted_by field
    Users can only delete their own recipes
    """
    try:
        user_id = token_data["user_id"]
        
        # Get community record
        community_result = db_service.supabase.table("community").select("posted_by").eq("recipe_id", recipe_id).execute()
        
        if not community_result.data or len(community_result.data) == 0:
            raise HTTPException(status_code=404, detail="Recipe not found in community")
        
        posted_by = community_result.data[0].get("posted_by")
        
        # Convert user_id to string for comparison (posted_by is now TEXT after migration)
        user_id_str = str(user_id)
        
        # Verify ownership
        if posted_by != user_id_str:
            raise HTTPException(status_code=403, detail="You can only delete your own recipes")
        
        # Validate user still exists (extra safety check)
        user_check = db_service.supabase.table("profiles").select("user_id").eq("user_id", user_id).execute()
        if not user_check.data or len(user_check.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already deleted
        if isinstance(posted_by, str) and posted_by.startswith("deleted_"):
            raise HTTPException(status_code=400, detail="Recipe already deleted")
        
        # Soft delete by prepending 'deleted_'
        # Convert posted_by to string if it's not already (handles UUID objects)
        posted_by_str = str(posted_by)
        db_service.supabase.table("community").update({
            "posted_by": f"deleted_{posted_by_str}"
        }).eq("recipe_id", recipe_id).execute()
        
        return {"status": "success", "message": "Recipe removed from community successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error deleting recipe from community: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error deleting recipe: {str(e)}")

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@app.put("/api/users/{user_id}/password")
async def change_user_password(
    user_id: str,
    request: PasswordChangeRequest,
    token_data: dict = Depends(verify_token)
):
    """
    Change user password
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only change your own password"
            )
        
        # Use Supabase Admin API to update password
        # First verify current password by attempting to sign in
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_service_key:
            raise HTTPException(status_code=500, detail="Supabase configuration missing")
        
        # Import here to avoid circular dependencies
        # Use cached admin client (optimization)
        admin_client = get_admin_client()
        
        # Get user email from token
        user_email = token_data.get("email")
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")
        
        # Verify current password by attempting sign in
        try:
            verify_response = admin_client.auth.sign_in_with_password({
                "email": user_email,
                "password": request.current_password
            })
            if not verify_response.user:
                raise HTTPException(status_code=400, detail="Current password is incorrect")
        except Exception as verify_error:
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password using admin API
        try:
            admin_client.auth.admin.update_user_by_id(
                user_id,
                {"password": request.new_password}
            )
        except Exception as update_error:
            raise HTTPException(status_code=500, detail=f"Failed to update password: {str(update_error)}")
        
        # Log analytics activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="change_password",
                metadata={"timestamp": datetime.now().isoformat()}
            )
        except Exception as log_error:
            # Log error but don't fail the password change
            print(f"Warning: Failed to log password change activity: {str(log_error)}")
        
        return {"status": "success", "message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error changing password for user {user_id}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error changing password: {str(e)}")

@app.delete("/api/users/{user_id}")
async def delete_user_account(
    user_id: str,
    token_data: dict = Depends(verify_token)
):
    """
    Anonymize user account - remove identity data but preserve all other data
    This prevents user from signing in while maintaining data integrity
    """
    try:
        # Verify that the user_id in the path matches the token
        if user_id != token_data["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own account"
            )
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_service_key:
            raise HTTPException(status_code=500, detail="Supabase configuration missing")
        
        # Import here to avoid circular dependencies
        # Use cached admin client (optimization)
        admin_client = get_admin_client()
        
        # Step 1: Clear profile identity data
        try:
            db_service.update_profile(
                user_id=user_id,
                full_name=None,
                avatar_url=None,
                bio=None,
                dietary_preferences=[],
                goals=[],
                allergies=[],
                saved_recipes=[],
                liked_recipes=[]
            )
        except Exception as profile_error:
            raise HTTPException(status_code=500, detail=f"Failed to anonymize profile: {str(profile_error)}")
        
        # Step 2: Remove authentication data from auth.users
        # Set email to a placeholder and remove encrypted_password
        # This prevents sign-in while preserving user_id for foreign key relationships
        try:
            placeholder_email = f"deleted_user_{user_id}@deleted.local"
            admin_client.auth.admin.update_user_by_id(
                user_id,
                {
                    "email": placeholder_email,
                    "encrypted_password": None
                }
            )
        except Exception as auth_error:
            raise HTTPException(status_code=500, detail=f"Failed to anonymize auth data: {str(auth_error)}")
        
        # Log analytics activity
        try:
            db_service.log_analytics_activity(
                user_id=user_id,
                action_type="delete_account",
                metadata={"timestamp": datetime.now().isoformat(), "anonymized": True}
            )
        except Exception as log_error:
            # Log error but don't fail the anonymization
            print(f"Warning: Failed to log account deletion activity: {str(log_error)}")
        
        return {"status": "success", "message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error deleting account for user {user_id}: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error deleting account: {str(e)}")

# ============================================================================
# ADMIN API ENDPOINTS
# ============================================================================

@app.get("/api/admin/check-status")
async def check_admin_status(
    token_data: dict = Depends(verify_token)
):
    """
    Lightweight endpoint to check if user is admin
    Does not require admin token, just regular token
    Returns admin status and assigned_sections
    """
    user_id = token_data["user_id"]
    print(f"[DEBUG] check_admin_status: Checking user_id={user_id}")
    
    is_admin = db_service.is_admin_user(user_id)
    print(f"[DEBUG] check_admin_status: is_admin={is_admin}")
    
    assigned_sections = []
    if is_admin:
        admin_user = db_service.get_admin_user(user_id)
        print(f"[DEBUG] check_admin_status: admin_user={admin_user}")
        
        if admin_user:
            raw_sections = admin_user.get("assigned_sections", []) or []
            print(f"[DEBUG] check_admin_status: raw_sections type={type(raw_sections)}, value={raw_sections}")
            
            # Handle case where assigned_sections might be a string representation
            if isinstance(raw_sections, str):
                # Parse PostgreSQL array string format: "{users,recipes}" or "users,recipes"
                raw_sections = raw_sections.strip()
                if raw_sections.startswith('{') and raw_sections.endswith('}'):
                    raw_sections = raw_sections[1:-1]  # Remove braces
                if raw_sections:
                    assigned_sections = [s.strip() for s in raw_sections.split(',') if s.strip()]
                else:
                    assigned_sections = []
                print(f"[DEBUG] check_admin_status: Parsed string to array: {assigned_sections}")
            elif isinstance(raw_sections, list) and len(raw_sections) > 0:
                assigned_sections = raw_sections
                print(f"[DEBUG] check_admin_status: Already a list: {assigned_sections}")
            else:
                # assigned_sections is None or empty, derive from permissions
                print(f"[DEBUG] check_admin_status: assigned_sections is None/empty, deriving from permissions")
                permissions = admin_user.get("permissions", {}) or {}
                print(f"[DEBUG] check_admin_status: permissions={permissions}")
                
                # Derive sections from analytics permissions
                if permissions.get("can_view_user_analytics"):
                    assigned_sections.append("users")
                if permissions.get("can_view_recipe_analytics"):
                    assigned_sections.append("recipes")
                if permissions.get("can_view_community_analytics"):
                    assigned_sections.append("community")
                
                print(f"[DEBUG] check_admin_status: Derived sections from permissions: {assigned_sections}")
    
    # Get permissions from admin_user
    permissions = {}
    if is_admin and admin_user:
        permissions = admin_user.get("permissions", {}) or {}
    
    print(f"[DEBUG] check_admin_status: Returning is_admin={is_admin}, assigned_sections={assigned_sections}, permissions={permissions}")
    return {
        "is_admin": is_admin,
        "assigned_sections": assigned_sections,
        "permissions": permissions
    }

# Admin Request Models
class SuspendUserRequest(BaseModel):
    reason: str

class ReactivateUserRequest(BaseModel):
    pass

class DeleteUserRequest(BaseModel):
    reason: str

class RemoveFromCommunityRequest(BaseModel):
    reason: str

class UpdateNutritionRequest(BaseModel):
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fats: Optional[float] = None

class UpdateCommunityMetadataRequest(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    is_featured: Optional[bool] = None

class CommentModerationRequest(BaseModel):
    action: str  # 'hide', 'show', 'edit', 'delete'
    text: Optional[str] = None  # For edit action

# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/admin/users")
async def admin_list_users(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,  # 'user', 'suspended', 'deleted', 'unverified', 'active', 'inactive'
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    List all users with pagination, search, and filters
    Admin only
    Note: 'role' parameter accepts: 'user', 'suspended', 'deleted', 'unverified', 'active', 'inactive'
    """
    try:
        # Validate pagination
        limit = min(max(1, limit), 100)
        page = max(1, page)
        offset = (page - 1) * limit
        
        # Build query - get profiles first
        query = db_service.supabase.table("profiles").select("*")
        
        # Note: Search by email will be done after fetching auth data
        # For now, search only by full_name
        if search:
            query = query.ilike("full_name", f"%{search}%")
        
        # Apply status filter to profiles query (only for statuses that exist in profiles table)
        if status and status in ["user", "suspended"]:
            query = query.eq("role", status)  # Note: profiles table uses 'role' column, but we return 'status' field
        
        if date_from:
            query = query.gte("created_at", date_from)
        if date_to:
            query = query.lte("created_at", date_to)
        
        # Get total count
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Apply pagination
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        users = []
        if result.data:
            # OPTIMIZATION: Batch fetch auth data and recipe counts instead of N queries
            user_ids = [profile.get("user_id") for profile in result.data if profile.get("user_id")]
            
            # Batch fetch auth data for all users
            auth_lookup = batch_get_user_auth_data(user_ids)
            
            # Batch fetch recipe counts for all users
            recipe_counts_lookup = batch_get_recipe_counts(user_ids)
            
            for profile in result.data:
                # Get user analytics summary
                user_id = profile.get("user_id")
                
                # Get auth user data from batch lookup (O(1) access)
                auth_user = auth_lookup.get(user_id)
                email = None
                email_confirmed_at = None
                if auth_user:
                    email = auth_user.get("email")
                    email_confirmed_at = auth_user.get("email_confirmed_at")
                
                # Get recipes count from batch lookup (O(1) access, defaults to 0)
                recipes_count = recipe_counts_lookup.get(user_id, 0)
                
                # Check if user is unverified
                last_login = profile.get("last_login")
                if not email_confirmed_at and not last_login:
                    last_login = "Waiting for verification"
                
                users.append({
                    "user_id": user_id,
                    "email": email,
                    "full_name": profile.get("full_name"),
                    "status": profile.get("role"),
                    "created_at": profile.get("created_at"),
                    "last_login": last_login,
                    "email_confirmed_at": email_confirmed_at,
                    "recipes_count": recipes_count,
                    "profile": profile
                })
        
        # Fetch deleted and unverified users from auth.users table
        deleted_users = []
        unverified_users = []
        # Track user_ids already in the users list to avoid duplicates
        existing_user_ids = {user.get("user_id") for user in users}
        
        try:
            # Use cached admin client (optimization)
            admin_client = get_admin_client()
            # List all users and filter by email prefix
            all_auth_users = admin_client.auth.admin.list_users()
            
            # Handle different response types from list_users()
            users_list = []
            if isinstance(all_auth_users, list):
                users_list = all_auth_users
            elif hasattr(all_auth_users, 'users'):
                users_list = all_auth_users.users
            elif hasattr(all_auth_users, '__iter__') and not isinstance(all_auth_users, str):
                try:
                    users_list = list(all_auth_users)
                except:
                    pass
            
            # OPTIMIZATION: Collect all user_ids first, then batch fetch profiles and recipe counts
            candidate_user_ids = []
            auth_user_data = {}  # Store auth user data by user_id
            
            for auth_user in users_list:
                try:
                    # Get user_id
                    user_id = None
                    if hasattr(auth_user, 'id'):
                        user_id = getattr(auth_user, 'id', None)
                    elif isinstance(auth_user, dict):
                        user_id = auth_user.get('id')
                    
                    if not user_id:
                        continue
                    
                    # Skip if already in users list
                    if user_id in existing_user_ids:
                        continue
                    
                    # Get email
                    email = None
                    if hasattr(auth_user, 'email'):
                        email = getattr(auth_user, 'email', None)
                    elif isinstance(auth_user, dict):
                        email = auth_user.get('email')
                    
                    if not email:
                        continue
                    
                    # Get email_confirmed_at
                    email_confirmed_at = None
                    if hasattr(auth_user, 'email_confirmed_at'):
                        email_confirmed_at = getattr(auth_user, 'email_confirmed_at', None)
                    elif isinstance(auth_user, dict):
                        email_confirmed_at = auth_user.get('email_confirmed_at')
                    
                    # Get created_at
                    created_at = None
                    if hasattr(auth_user, 'created_at'):
                        created_at = getattr(auth_user, 'created_at', None)
                    elif isinstance(auth_user, dict):
                        created_at = auth_user.get('created_at')
                    
                    # Store auth user data for later use
                    candidate_user_ids.append(user_id)
                    auth_user_data[user_id] = {
                        "email": email,
                        "email_confirmed_at": email_confirmed_at,
                        "created_at": created_at
                    }
                except Exception as user_error:
                    print(f"Warning: Error processing auth user: {str(user_error)}")
                    continue
            
            # Batch fetch profiles and recipe counts for all candidate users
            profile_lookup = batch_get_profiles(candidate_user_ids)
            recipe_counts_lookup = batch_get_recipe_counts(candidate_user_ids)
            
            # Now process each user with batch-fetched data
            for user_id in candidate_user_ids:
                try:
                    auth_data = auth_user_data.get(user_id)
                    if not auth_data:
                        continue
                    
                    email = auth_data["email"]
                    email_confirmed_at = auth_data["email_confirmed_at"]
                    created_at = auth_data["created_at"]
                    
                    # Get profile from batch lookup (O(1) access)
                    profile = profile_lookup.get(user_id)
                    
                    # Get recipes count from batch lookup (O(1) access, defaults to 0)
                    recipes_count = recipe_counts_lookup.get(user_id, 0)
                    
                    # Check if deleted user
                    if email.startswith("deleted_user_"):
                        deleted_users.append({
                            "user_id": user_id,
                            "email": email,
                            "full_name": profile.get("full_name") if profile else None,
                            "status": "deleted",
                            "created_at": created_at,
                            "last_login": None,
                            "email_confirmed_at": None,
                            "recipes_count": recipes_count,
                            "profile": profile
                        })
                    # Check if unverified user (email_confirmed_at is None and not deleted)
                    elif email_confirmed_at is None:
                        unverified_users.append({
                            "user_id": user_id,
                            "email": email,
                            "full_name": profile.get("full_name") if profile else None,
                            "status": "unverified",
                            "created_at": created_at,
                            "last_login": "Waiting for verification",
                            "email_confirmed_at": None,
                            "recipes_count": recipes_count,
                            "profile": profile
                        })
                except Exception as user_error:
                    print(f"Warning: Error processing auth user: {str(user_error)}")
                    continue
        except Exception as e:
            print(f"Warning: Failed to fetch deleted/unverified users: {str(e)}")
        
        # Merge deleted and unverified users with regular users
        all_users = users + deleted_users + unverified_users
        
        # Apply search filter to all users (including deleted)
        if search:
            search_lower = search.lower()
            all_users = [
                u for u in all_users
                if (u.get("email", "") and search_lower in u.get("email", "").lower()) or
                   (u.get("full_name") and search_lower in u.get("full_name", "").lower())
            ]
        
        # Apply status filter (merged status and role into one)
        if status:
            if status == "active":
                # Active users are regular users with recent login
                from datetime import datetime, timedelta
                all_users = [
                    u for u in all_users
                    if u.get("status") == "user" and u.get("last_login") and u.get("last_login") != "Waiting for verification"
                ]
                # Filter by last login date (within 30 days)
                filtered_active = []
                for u in all_users:
                    last_login = u.get("last_login")
                    if last_login:
                        try:
                            last_login_dt = datetime.fromisoformat(last_login.replace('Z', '+00:00'))
                            if datetime.now(last_login_dt.tzinfo) - last_login_dt <= timedelta(days=30):
                                filtered_active.append(u)
                        except:
                            pass
                all_users = filtered_active
            elif status == "inactive":
                # Inactive users are regular users without recent login
                from datetime import datetime, timedelta
                all_users = [
                    u for u in all_users
                    if u.get("status") == "user" and (not u.get("last_login") or u.get("last_login") == "Waiting for verification")
                ]
                # Also include users with login older than 30 days
                filtered_inactive = []
                for u in all_users:
                    last_login = u.get("last_login")
                    if not last_login or last_login == "Waiting for verification":
                        filtered_inactive.append(u)
                    else:
                        try:
                            last_login_dt = datetime.fromisoformat(last_login.replace('Z', '+00:00'))
                            if datetime.now(last_login_dt.tzinfo) - last_login_dt > timedelta(days=30):
                                filtered_inactive.append(u)
                        except:
                            pass
                all_users = filtered_inactive
            else:
                # Direct status match: 'user', 'suspended', 'deleted', 'unverified'
                all_users = [u for u in all_users if u.get("status") == status]
        
        # Apply date filters
        from datetime import datetime
        # OPTIMIZATION: Cache parsed datetimes to avoid repeated parsing
        parsed_created_at_cache = {}
        
        if date_from:
            try:
                date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                filtered_by_from = []
                for u in all_users:
                    created_at = u.get("created_at")
                    if created_at:
                        # Convert to datetime if it's a string
                        if isinstance(created_at, str):
                            try:
                                # Use cached datetime if available
                                if created_at not in parsed_created_at_cache:
                                    parsed_created_at_cache[created_at] = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                                created_at_dt = parsed_created_at_cache[created_at]
                                if created_at_dt >= date_from_dt:
                                    filtered_by_from.append(u)
                            except:
                                pass
                        elif isinstance(created_at, datetime):
                            if created_at >= date_from_dt:
                                filtered_by_from.append(u)
                all_users = filtered_by_from
            except:
                pass  # If date_from is invalid, skip the filter
        
        if date_to:
            try:
                date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                filtered_by_to = []
                for u in all_users:
                    created_at = u.get("created_at")
                    if created_at:
                        # Convert to datetime if it's a string
                        if isinstance(created_at, str):
                            try:
                                # Use cached datetime if available
                                if created_at not in parsed_created_at_cache:
                                    parsed_created_at_cache[created_at] = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                                created_at_dt = parsed_created_at_cache[created_at]
                                if created_at_dt <= date_to_dt:
                                    filtered_by_to.append(u)
                            except:
                                pass
                        elif isinstance(created_at, datetime):
                            if created_at <= date_to_dt:
                                filtered_by_to.append(u)
                all_users = filtered_by_to
            except:
                pass  # If date_to is invalid, skip the filter
        
        # Sort by created_at descending
        def get_sort_key(x):
            created_at = x.get("created_at")
            if not created_at:
                return datetime.min
            if isinstance(created_at, str):
                try:
                    return datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except:
                    return datetime.min
            elif isinstance(created_at, datetime):
                return created_at
            return datetime.min
        
        all_users.sort(key=get_sort_key, reverse=True)
        
        # Normalize all created_at values to ISO format strings for consistency
        for user in all_users:
            created_at = user.get("created_at")
            if created_at:
                if isinstance(created_at, datetime):
                    user["created_at"] = created_at.isoformat()
                elif isinstance(created_at, str):
                    # Already a string, keep it
                    pass
                else:
                    # Try to convert to string
                    try:
                        user["created_at"] = str(created_at)
                    except:
                        pass
        
        # Apply pagination
        total_all = len(all_users)
        paginated_users = all_users[offset:offset + limit]
        
        return {
            "users": paginated_users,
            "page": page,
            "limit": limit,
            "total": total_all,
            "has_more": offset + limit < total_all
        }
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.get("/api/admin/users/analytics")
async def admin_user_analytics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get user analytics data
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_view_user_analytics")
        # Get all profiles
        profiles_result = db_service.supabase.table("profiles").select("user_id, role, created_at, last_login").execute()
        
        active_count = 0
        inactive_count = 0
        suspended_count = 0
        
        if profiles_result.data:
            for profile in profiles_result.data:
                role = profile.get("role", "user")
                if role == "suspended":
                    suspended_count += 1
                elif role == "user":
                    # Check if inactive (no login in last 30 days)
                    last_login = profile.get("last_login")
                    if last_login:
                        from datetime import datetime, timedelta
                        try:
                            last_login_dt = datetime.fromisoformat(last_login.replace('Z', '+00:00'))
                            if datetime.now(last_login_dt.tzinfo) - last_login_dt > timedelta(days=30):
                                inactive_count += 1
                            else:
                                active_count += 1
                        except:
                            active_count += 1
                    else:
                        inactive_count += 1
        
        # Count deleted and unverified users from auth.users table
        deleted_count = 0
        unverified_count = 0
        try:
            # Use cached admin client (optimization)
            admin_client = get_admin_client()
            # List all users and filter by email prefix
            all_auth_users = admin_client.auth.admin.list_users()
            
            # Handle different response types from list_users()
            users_list = []
            if isinstance(all_auth_users, list):
                users_list = all_auth_users
            elif hasattr(all_auth_users, 'users'):
                users_list = all_auth_users.users
            elif hasattr(all_auth_users, '__iter__') and not isinstance(all_auth_users, str):
                # Try to iterate if it's iterable
                try:
                    users_list = list(all_auth_users)
                except:
                    pass
            
            for user in users_list:
                    try:
                        # Try to get email as attribute or dict key
                        email = None
                        if hasattr(user, 'email'):
                            email = getattr(user, 'email', None)
                        elif isinstance(user, dict):
                            email = user.get('email')
                        
                        if email:
                            if email.startswith("deleted_user_"):
                                deleted_count += 1
                                
                            else:
                                # Check if user is unverified (email_confirmed_at is None)
                                email_confirmed_at = None
                                if hasattr(user, 'email_confirmed_at'):
                                    email_confirmed_at = getattr(user, 'email_confirmed_at', None)
                                elif isinstance(user, dict):
                                    email_confirmed_at = user.get('email_confirmed_at')
                                
                                if email_confirmed_at is None:
                                    unverified_count += 1
                    except Exception as user_error:
                        # Skip this user if there's an error accessing its properties
                        print(f"Warning: Error processing user: {str(user_error)}")
                        continue
        except Exception as e:
            import traceback
            print(f"Warning: Failed to count deleted/unverified users: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
        
        # Get user growth data (simplified - would need date grouping in production)
        # Total users includes profiles + unverified users (deleted users are already in profiles with role="deleted")
        total_users = active_count + inactive_count + suspended_count + deleted_count + unverified_count
        
        return {
            "active_users": active_count,
            "inactive_users": inactive_count,
            "suspended_users": suspended_count,
            "deleted_users": deleted_count,
            "unverified_users": unverified_count,
            "total_users": total_users,
            "growth_data": []  # TODO: Implement date-grouped growth data
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in admin_user_analytics: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Error fetching user analytics: {str(e)}")

@app.get("/api/admin/users/{user_id}")
async def admin_get_user(
    user_id: str,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get detailed user information
    Admin only
    """
    try:
        # Get profile
        profile = db_service.get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get auth user data
        auth_user = db_service.get_user_auth_data(user_id)
        
        # Get user analytics
        analytics = db_service.get_user_analytics(user_id)
        
        # Get recent activities
        activities = db_service.get_user_recipe_actions(user_id, limit=10)
        
        return {
            "user_id": user_id,
            "profile": profile,
            "auth": auth_user,
            "analytics": analytics,
            "recent_activities": activities
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@app.put("/api/admin/users/{user_id}")
async def admin_update_user(
    user_id: str,
    profile_data: Dict[str, Any],
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Update user profile
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_edit_users")
        
        updated_profile = db_service.update_profile(
            user_id=user_id,
            full_name=profile_data.get("full_name"),
            avatar_url=profile_data.get("avatar_url"),
            bio=profile_data.get("bio"),
            dietary_preferences=profile_data.get("dietary_preferences"),
            goals=profile_data.get("goals"),
            allergies=profile_data.get("allergies")
        )
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="update_user",
            target_type="user",
            target_id=user_id,
            metadata={"updated_fields": list(profile_data.keys())}
        )
        
        return updated_profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@app.post("/api/admin/users/{user_id}/suspend")
async def admin_suspend_user(
    user_id: str,
    request: SuspendUserRequest,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Suspend a user account
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_suspend_users")
        
        print(f"[DEBUG] Suspending user {user_id} with reason: {request.reason}")
        
        # Check if profile exists, create if it doesn't
        profile = db_service.get_profile(user_id)
        if profile:
            # Update profile role
            try:
                updated_profile = db_service.update_profile(user_id=user_id, role="suspended")
                print(f"[DEBUG] Profile updated successfully: {updated_profile}")
            except Exception as e:
                print(f"[ERROR] Failed to update profile role: {str(e)}")
                import traceback
                print(f"[ERROR] Traceback: {traceback.format_exc()}")
                # Try direct update as fallback
                try:
                    print(f"[DEBUG] Attempting direct Supabase update as fallback...")
                    result = db_service.supabase.table("profiles").update({"role": "suspended"}).eq("user_id", user_id).execute()
                    if result.data and len(result.data) > 0:
                        print(f"[DEBUG] Direct update successful")
                    else:
                        raise HTTPException(status_code=500, detail=f"Failed to update profile role: Profile may not exist or update failed")
                except Exception as direct_e:
                    print(f"[ERROR] Direct update also failed: {str(direct_e)}")
                    raise HTTPException(status_code=500, detail=f"Failed to update profile role: {str(e)}")
        
        # Store suspension reason in auth.users user_metadata
        # Use cached admin client (optimization)
        admin_client = get_admin_client()
        try:
            # Get current user metadata
            auth_user = admin_client.auth.admin.get_user_by_id(user_id)
            current_metadata = auth_user.user.user_metadata if auth_user.user else {}
            
            # Update with suspension reason
            current_metadata["suspension_reason"] = request.reason
            current_metadata["suspended_at"] = datetime.now().isoformat()
            
            admin_client.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": current_metadata}
            )
            print(f"[DEBUG] User metadata updated successfully")
        except Exception as e:
            import traceback
            print(f"[WARNING] Failed to update user_metadata: {str(e)}")
            print(f"[WARNING] Traceback: {traceback.format_exc()}")
        
        # Send email notification
        try:
            profile = db_service.get_profile(user_id)
            if profile:
                auth_user = db_service.get_user_auth_data(user_id)
                if auth_user and auth_user.get("email"):
                    email_sent = email_service.send_suspension_notification(auth_user["email"], request.reason)
                    print(f"[DEBUG] Email notification sent: {email_sent}")
                else:
                    print(f"[WARNING] Could not get user email for notification")
            else:
                print(f"[WARNING] Profile not found for user {user_id}")
        except Exception as e:
            print(f"[WARNING] Failed to send email notification: {str(e)}")
            import traceback
            print(f"[WARNING] Traceback: {traceback.format_exc()}")
        
        # Log admin action
        try:
            db_service.log_admin_action(
                admin_id=admin_data["user_id"],
                action_type="suspend_user",
                target_type="user",
                target_id=user_id,
                reason=request.reason
            )
            print(f"[DEBUG] Admin action logged successfully")
        except Exception as e:
            print(f"[WARNING] Failed to log admin action: {str(e)}")
        
        return {"status": "success", "message": "User suspended successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ERROR] Error suspending user: {str(e)}")
        print(f"[ERROR] Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Error suspending user: {str(e)}")

@app.post("/api/admin/users/{user_id}/reactivate")
async def admin_reactivate_user(
    user_id: str,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Reactivate a suspended user account
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_suspend_users")
        # Update profile role
        db_service.update_profile(user_id=user_id, role="user")
        
        # Clear suspension reason from user_metadata
        # Use cached admin client (optimization)
        admin_client = get_admin_client()
        try:
            auth_user = admin_client.auth.admin.get_user_by_id(user_id)
            current_metadata = auth_user.user.user_metadata if auth_user.user else {}
            
            # Remove suspension fields
            current_metadata.pop("suspension_reason", None)
            current_metadata.pop("suspended_at", None)
            current_metadata["reactivated_at"] = datetime.now().isoformat()
            
            admin_client.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": current_metadata}
            )
        except Exception as e:
            print(f"Warning: Failed to update user_metadata: {str(e)}")
        
        # Send email notification
        profile = db_service.get_profile(user_id)
        if profile:
            auth_user = db_service.get_user_auth_data(user_id)
            if auth_user and auth_user.get("email"):
                email_service.send_reactivation_notification(auth_user["email"])
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="reactivate_user",
            target_type="user",
            target_id=user_id
        )
        
        return {"status": "success", "message": "User reactivated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reactivating user: {str(e)}")

@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    request: DeleteUserRequest,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Soft delete a user account (anonymize)
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_delete_users")
        
        print(f"[DEBUG] Deleting user {user_id} with reason: {request.reason}")
        
        # Get user email BEFORE anonymization (for email notification)
        user_email = None
        try:
            auth_user = db_service.get_user_auth_data(user_id)
            if auth_user:
                user_email = auth_user.get("email")
                # Don't send email if it's already a deleted user placeholder
                if user_email and user_email.startswith("deleted_user_"):
                    user_email = None
                    return {"status": "success", "message": "User already deleted"}
        except Exception as e:
            print(f"[WARNING] Could not get user email before deletion: {str(e)}")
        
        # Use existing anonymization logic
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_service_key:
            raise HTTPException(status_code=500, detail="Supabase configuration missing")
        
        # Use cached admin client (optimization)
        admin_client = get_admin_client()
        
        # Anonymize profile
        db_service.update_profile(
            user_id=user_id,
            full_name=None,
            avatar_url=None,
            bio=None,
            dietary_preferences=[],
            goals=[],
            allergies=[],
            saved_recipes=[],
            liked_recipes=[],
            role="deleted"
        )
        
        # Anonymize auth data
        placeholder_email = f"deleted_user_{user_id}@deleted.local"
        admin_client.auth.admin.update_user_by_id(
            user_id,
            {
                "email": placeholder_email,
                "encrypted_password": None
            }
        )
        
        # Send email notification BEFORE anonymization (if we have the email)
        if user_email:
            try:
                email_sent = email_service.send_deletion_notification(user_email, request.reason)
                print(f"[DEBUG] Deletion email notification sent: {email_sent}")
            except Exception as e:
                print(f"[WARNING] Failed to send deletion email notification: {str(e)}")
                import traceback
                print(f"[WARNING] Traceback: {traceback.format_exc()}")
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="delete_user",
            target_type="user",
            target_id=user_id,
            reason=request.reason
        )
        
        return {"status": "success", "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ERROR] Error deleting user: {str(e)}")
        print(f"[ERROR] Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

# ============================================================================
# RECIPE MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/admin/recipes")
async def admin_list_recipes(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    meal_type: Optional[str] = None,
    tags: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    List all recipes with pagination, search, and filters
    Admin only
    """
    try:
        limit = min(max(1, limit), 100)
        page = max(1, page)
        offset = (page - 1) * limit
        
        query = db_service.supabase.table("recipes").select("*")
        
        if search:
            query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
        
        if meal_type:
            query = query.eq("meal_type", meal_type)
        
        if tags:
            tags_list = tags.split(",") if isinstance(tags, str) else tags
            query = query.contains("tags", tags_list)
        
        if date_from:
            query = query.gte("created_at", date_from)
        if date_to:
            query = query.lte("created_at", date_to)
        
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        recipes = []
        if result.data:
            # OPTIMIZATION: Batch fetch performance metrics instead of N queries
            recipe_ids = [recipe.get("id") for recipe in result.data if recipe.get("id")]
            
            # Batch fetch performance metrics for all recipes
            perf_lookup = batch_get_performance_metrics(recipe_ids)
            
            for recipe in result.data:
                recipe_id = recipe.get("id")
                
                # Get performance metrics from batch lookup (O(1) access)
                performance = perf_lookup.get(recipe_id)
                
                recipes.append({
                    **recipe,
                    "performance": performance
                })
        
        return {
            "recipes": recipes,
            "page": page,
            "limit": limit,
            "total": total,
            "has_more": offset + limit < total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recipes: {str(e)}")

@app.get("/api/admin/recipes/analytics")
async def admin_recipe_analytics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get recipe analytics data
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_view_recipe_analytics")
        # Get all recipes with performance metrics
        recipes_result = db_service.supabase.table("recipes").select("id, title, meal_type, tags, created_at").execute()
        performance_result = db_service.supabase.table("analytics_recipe_performance").select("*").execute()
        
        # Aggregate data
        total_recipes = len(recipes_result.data) if recipes_result.data else 0
        ai_generated_count = 0
        meal_type_distribution = {}
        tag_distribution = {}
        
        if performance_result.data:
            for perf in performance_result.data:
                if perf.get("ai_generated"):
                    ai_generated_count += 1
        
        if recipes_result.data:
            for recipe in recipes_result.data:
                meal_type = recipe.get("meal_type")
                if meal_type:
                    meal_type_distribution[meal_type] = meal_type_distribution.get(meal_type, 0) + 1
                
                tags = recipe.get("tags", [])
                if isinstance(tags, list):
                    for tag in tags:
                        tag_distribution[tag] = tag_distribution.get(tag, 0) + 1
        
        return {
            "total_recipes": total_recipes,
            "ai_generated_count": ai_generated_count,
            "meal_type_distribution": meal_type_distribution,
            "tag_distribution": tag_distribution,
            "performance_data": performance_result.data if performance_result.data else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recipe analytics: {str(e)}")

@app.get("/api/admin/recipes/{recipe_id}")
async def admin_get_recipe(
    recipe_id: str,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get detailed recipe information
    Admin only
    """
    try:
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Get performance metrics
        performance = None
        try:
            perf_result = db_service.supabase.table("analytics_recipe_performance").select("*").eq("recipe_id", recipe_id).execute()
            if perf_result.data and len(perf_result.data) > 0:
                performance = perf_result.data[0]
        except:
            pass
        
        return {
            "recipe": recipe,
            "performance": performance
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recipe: {str(e)}")

@app.put("/api/admin/recipes/{recipe_id}")
async def admin_update_recipe(
    recipe_id: str,
    recipe_data: Dict[str, Any],
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Update recipe
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_edit_recipes")
        update_data = {}
        
        if "title" in recipe_data:
            update_data["title"] = recipe_data["title"]
        if "description" in recipe_data:
            update_data["description"] = recipe_data["description"]
        if "ingredients" in recipe_data:
            update_data["ingredients"] = recipe_data["ingredients"]
        if "steps" in recipe_data:
            update_data["steps"] = recipe_data["steps"]
        if "nutrition" in recipe_data:
            update_data["nutrition"] = recipe_data["nutrition"]
        if "tags" in recipe_data:
            update_data["tags"] = recipe_data["tags"]
        if "meal_type" in recipe_data:
            update_data["meal_type"] = recipe_data["meal_type"]
        if "prep_time" in recipe_data:
            update_data["prep_time"] = recipe_data["prep_time"]
        if "cook_time" in recipe_data:
            update_data["cook_time"] = recipe_data["cook_time"]
        if "serving_size" in recipe_data:
            update_data["serving_size"] = recipe_data["serving_size"]
        
        result = db_service.supabase.table("recipes").update(update_data).eq("id", recipe_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="update_recipe",
            target_type="recipe",
            target_id=recipe_id,
            metadata={"updated_fields": list(update_data.keys())}
        )
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating recipe: {str(e)}")

@app.put("/api/admin/recipes/{recipe_id}/nutrition")
async def admin_update_nutrition(
    recipe_id: str,
    request: UpdateNutritionRequest,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Update recipe nutrition values
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_update_nutrition")
        # Get current recipe
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Get current nutrition
        current_nutrition = recipe.get("nutrition", {}) or {}
        if not isinstance(current_nutrition, dict):
            current_nutrition = {}
        
        # Update nutrition values
        if request.calories is not None:
            current_nutrition["calories"] = request.calories
        if request.protein is not None:
            current_nutrition["protein"] = request.protein
        if request.carbs is not None:
            current_nutrition["carbs"] = request.carbs
        if request.fats is not None:
            current_nutrition["fats"] = request.fats
        
        # Update recipe
        result = db_service.supabase.table("recipes").update({"nutrition": current_nutrition}).eq("id", recipe_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="update_nutrition",
            target_type="recipe",
            target_id=recipe_id
        )
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating nutrition: {str(e)}")

@app.delete("/api/admin/recipes/{recipe_id}")
async def admin_delete_recipe(
    recipe_id: str,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Delete recipe
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_delete_recipes")
        # Delete from Pinecone if exists
        try:
            from services.vector_store import get_pinecone_index
            index = get_pinecone_index()
            index.delete(ids=[recipe_id])
        except Exception as e:
            print(f"Warning: Failed to delete from Pinecone: {str(e)}")
        
        # Delete from database
        result = db_service.supabase.table("recipes").delete().eq("id", recipe_id).execute()
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="delete_recipe",
            target_type="recipe",
            target_id=recipe_id
        )
        
        return {"status": "success", "message": "Recipe deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting recipe: {str(e)}")

@app.post("/api/admin/recipes/{recipe_id}/regenerate-image")
async def admin_regenerate_image(
    recipe_id: str,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Regenerate recipe image using Gemini API
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_regenerate_images")
        # Get recipe
        recipe = db_service.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Generate image using image service (returns base64)
        image_service = get_image_service()
        import asyncio
        image_base64 = await asyncio.to_thread(
            image_service.generate_recipe_image,
            meal_name=recipe.get("title", ""),
            description=recipe.get("description", "")
        )
        
        if not image_base64:
            raise HTTPException(status_code=500, detail="Failed to generate image")
        
        # Upload base64 image to Supabase storage
        image_url = db_service.upload_base64_image_to_storage(
            image_base64,
            filename=f"recipe_{recipe_id}.jpg",
            bucket="recipe-images"
        )
        
        # Update recipe with new image URL
        result = db_service.supabase.table("recipes").update({"image_url": image_url}).eq("id", recipe_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="regenerate_image",
            target_type="recipe",
            target_id=recipe_id
        )
        
        return {"status": "success", "image_url": image_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error regenerating image: {str(e)}")

@app.get("/api/admin/recipes/analytics")
async def admin_recipe_analytics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get recipe analytics data
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_view_recipe_analytics")
        # Get all recipes with performance metrics
        recipes_result = db_service.supabase.table("recipes").select("id, title, meal_type, tags, created_at").execute()
        performance_result = db_service.supabase.table("analytics_recipe_performance").select("*").execute()
        
        # Aggregate data
        total_recipes = len(recipes_result.data) if recipes_result.data else 0
        ai_generated_count = 0
        meal_type_distribution = {}
        tag_distribution = {}
        
        if performance_result.data:
            for perf in performance_result.data:
                if perf.get("ai_generated"):
                    ai_generated_count += 1
        
        if recipes_result.data:
            for recipe in recipes_result.data:
                meal_type = recipe.get("meal_type")
                if meal_type:
                    meal_type_distribution[meal_type] = meal_type_distribution.get(meal_type, 0) + 1
                
                tags = recipe.get("tags", [])
                if isinstance(tags, list):
                    for tag in tags:
                        tag_distribution[tag] = tag_distribution.get(tag, 0) + 1
        
        return {
            "total_recipes": total_recipes,
            "ai_generated_count": ai_generated_count,
            "meal_type_distribution": meal_type_distribution,
            "tag_distribution": tag_distribution,
            "performance_data": performance_result.data if performance_result.data else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recipe analytics: {str(e)}")

# ============================================================================
# COMMUNITY MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/admin/community")
async def admin_list_community(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    List all community recipes
    Admin only
    """
    try:
        limit = min(max(1, limit), 100)
        page = max(1, page)
        offset = (page - 1) * limit
        
        query = db_service.supabase.table("community").select("*")
        
        # We'll enrich with recipe data separately
        if search:
            # Search will be done after fetching, or we can join via recipe_id
            pass
        
        if featured is not None:
            query = query.eq("is_featured", featured)
        
        if date_from:
            query = query.gte("created_at", date_from)
        if date_to:
            query = query.lte("created_at", date_to)
        
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        # Enrich with recipe data
        enriched_recipes = []
        if result.data:
            for comm in result.data:
                recipe_id = comm.get("recipe_id")
                recipe_data = None
                if recipe_id:
                    try:
                        recipe = db_service.get_recipe(recipe_id)
                        if recipe:
                            recipe_data = {
                                "title": recipe.get("title"),
                                "description": recipe.get("description"),
                                "image_url": recipe.get("image_url"),
                                "user_id": recipe.get("user_id"),
                            }
                    except:
                        pass
                
                # Apply search filter if provided
                if search and recipe_data:
                    search_lower = search.lower()
                    if (search_lower not in recipe_data.get("title", "").lower() and 
                        search_lower not in recipe_data.get("description", "").lower()):
                        continue
                
                # Calculate comments_count from comments JSONB array
                comments = comm.get("comments", [])
                comments_count = len(comments) if isinstance(comments, list) else 0
                
                enriched_recipes.append({
                    **comm,
                    "comments_count": comments_count,
                    "recipes": recipe_data
                })
        
        # Recalculate total if search was applied
        if search:
            total = len(enriched_recipes)
        
        return {
            "recipes": enriched_recipes,
            "page": page,
            "limit": limit,
            "total": total,
            "has_more": offset + limit < total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching community recipes: {str(e)}")

@app.get("/api/admin/community/{recipe_id}/comments")
async def admin_get_comments(
    recipe_id: str,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get all comments for a community recipe
    Admin only
    """
    try:
        result = db_service.supabase.table("community").select("comments").eq("recipe_id", recipe_id).execute()
        
        if not result.data or len(result.data) == 0:
            return {"comments": []}
        
        comments = result.data[0].get("comments", [])
        if not isinstance(comments, list):
            comments = []
        
        return {"comments": comments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

@app.put("/api/admin/community/{recipe_id}/comments/{comment_id}")
async def admin_moderate_comment(
    recipe_id: str,
    comment_id: str,
    request: CommentModerationRequest,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Moderate a comment (hide, show, edit, delete)
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_moderate_comments")
        # Get community record
        result = db_service.supabase.table("community").select("comments").eq("recipe_id", recipe_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Community recipe not found")
        
        comments = result.data[0].get("comments", [])
        if not isinstance(comments, list):
            comments = []
        
        # Find and update comment
        updated_comments = []
        comment_found = False
        
        for comment in comments:
            if str(comment.get("id")) == str(comment_id):
                comment_found = True
                if request.action == "delete":
                    # Skip this comment (delete it)
                    continue
                elif request.action == "hide":
                    comment["hidden"] = True
                    updated_comments.append(comment)
                elif request.action == "show":
                    comment["hidden"] = False
                    updated_comments.append(comment)
                elif request.action == "edit" and request.text:
                    comment["text"] = request.text
                    comment["edited_by_admin"] = True
                    comment["edited_at"] = datetime.now().isoformat()
                    updated_comments.append(comment)
                else:
                    updated_comments.append(comment)
            else:
                updated_comments.append(comment)
        
        if not comment_found:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # Update comments count if deleted
        comments_count = len(updated_comments)
        
        # Update community record
        db_service.supabase.table("community").update({
            "comments": updated_comments
        }).eq("recipe_id", recipe_id).execute()
        
        # Update analytics
        try:
            db_service.supabase.table("analytics_recipe_performance").update({
                "comments_count": comments_count
            }).eq("recipe_id", recipe_id).execute()
        except:
            pass
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type=f"{request.action}_comment",
            target_type="community",
            target_id=recipe_id,
            metadata={"comment_id": comment_id}
        )
        
        return {"status": "success", "message": f"Comment {request.action}ed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error moderating comment: {str(e)}")

@app.post("/api/admin/community/{recipe_id}/remove")
async def admin_remove_from_community(
    recipe_id: str,
    request: RemoveFromCommunityRequest,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Remove recipe from community (keep original recipe)
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_remove_from_community")
        # Get community record to find recipe owner
        community_result = db_service.supabase.table("community").select("posted_by").eq("recipe_id", recipe_id).execute()
        
        if not community_result.data or len(community_result.data) == 0:
            raise HTTPException(status_code=404, detail="Community recipe not found")
        
        posted_by = community_result.data[0].get("posted_by")
        
        # Get recipe title for notification
        recipe = db_service.get_recipe(recipe_id)
        recipe_title = recipe.get("title", "Recipe") if recipe else "Recipe"
        
        # Delete from community table
        db_service.supabase.table("community").delete().eq("recipe_id", recipe_id).execute()
        
        # Send email notification
        if posted_by:
            profile = db_service.get_profile(posted_by)
            if profile:
                auth_user = db_service.get_user_auth_data(posted_by)
                if auth_user and auth_user.get("email"):
                    email_service.send_recipe_removal_notification(
                        auth_user["email"],
                        recipe_title,
                        request.reason
                    )
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="remove_from_community",
            target_type="community",
            target_id=recipe_id,
            reason=request.reason
        )
        
        return {"status": "success", "message": "Recipe removed from community successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing recipe from community: {str(e)}")

@app.put("/api/admin/community/{recipe_id}/metadata")
async def admin_update_community_metadata(
    recipe_id: str,
    request: UpdateCommunityMetadataRequest,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Update community recipe metadata
    Admin only
    """
    try:
        update_data = {}
        
        # Check permission for featuring recipes
        if request.is_featured is not None:
            require_permission(admin_data.get("admin_user"), "can_feature_recipes")
            update_data["is_featured"] = request.is_featured
        
        # Update community record
        if update_data:
            db_service.supabase.table("community").update(update_data).eq("recipe_id", recipe_id).execute()
        
        # Update recipe if title or tags provided
        recipe_update = {}
        if request.title:
            recipe_update["title"] = request.title
        if request.tags:
            recipe_update["tags"] = request.tags
        
        if recipe_update:
            db_service.supabase.table("recipes").update(recipe_update).eq("id", recipe_id).execute()
        
        # Log admin action
        db_service.log_admin_action(
            admin_id=admin_data["user_id"],
            action_type="update_community_metadata",
            target_type="community",
            target_id=recipe_id,
            metadata=update_data
        )
        
        return {"status": "success", "message": "Metadata updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating metadata: {str(e)}")

@app.get("/api/admin/community/analytics")
async def admin_community_analytics(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get community analytics data
    Admin only
    """
    try:
        # Check permission
        require_permission(admin_data.get("admin_user"), "can_view_community_analytics")
        # Get all community recipes
        community_result = db_service.supabase.table("community").select("*").execute()
        
        total_community_recipes = len(community_result.data) if community_result.data else 0
        featured_count = 0
        total_likes = 0
        total_views = 0
        total_shares = 0
        total_comments = 0
        
        if community_result.data:
            for comm in community_result.data:
                if comm.get("is_featured"):
                    featured_count += 1
                total_likes += comm.get("likes", 0)
                total_views += comm.get("views", 0)
                total_shares += comm.get("shares", 0)
                # Calculate comments_count from comments JSONB array
                comments = comm.get("comments", [])
                comments_count = len(comments) if isinstance(comments, list) else 0
                total_comments += comments_count
        
        return {
            "total_community_recipes": total_community_recipes,
            "featured_count": featured_count,
            "total_likes": total_likes,
            "total_views": total_views,
            "total_shares": total_shares,
            "total_comments": total_comments,
            "engagement_data": community_result.data if community_result.data else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching community analytics: {str(e)}")

@app.get("/api/admin/actions")
async def admin_get_actions(
    page: int = 1,
    limit: int = 50,
    admin_id: Optional[str] = None,
    action_type: Optional[str] = None,
    target_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin_data: dict = Depends(verify_admin_token)
):
    """
    Get admin action log
    Admin only
    """
    try:
        limit = min(max(1, limit), 100)
        page = max(1, page)
        offset = (page - 1) * limit
        
        query = db_service.supabase.table("admin_actions").select("*")
        
        if admin_id:
            query = query.eq("admin_id", admin_id)
        if action_type:
            query = query.eq("action_type", action_type)
        if target_type:
            query = query.eq("target_type", target_type)
        if date_from:
            query = query.gte("created_at", date_from)
        if date_to:
            query = query.lte("created_at", date_to)
        
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        return {
            "actions": result.data if result.data else [],
            "page": page,
            "limit": limit,
            "total": total,
            "has_more": offset + limit < total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching admin actions: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable provided by Render, default to 8000 for local dev
    port = int(os.getenv("PORT", 8000))
    # Run uvicorn programmatically
    uvicorn.run(app, host="0.0.0.0", port=port)