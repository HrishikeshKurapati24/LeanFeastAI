"""
Database service for interacting with Supabase database tables
"""
from typing import Optional, List, Dict, Any
import httpx
from supabase import create_client, Client
import os
from datetime import datetime


class DatabaseService:
    """Service for database operations"""
    
    def __init__(self):
        self._supabase: Optional[Client] = None
    
    @property
    def supabase(self) -> Client:
        """Lazy initialization of Supabase client"""
        if self._supabase is None:
            supabase_url = os.getenv("SUPABASE_URL", "https://pwetplmlfkbtocpmiwwy.supabase.co")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")
            
            if not supabase_key:
                raise ValueError(
                    "SUPABASE_SERVICE_KEY environment variable is required. "
                    "Please set it in your .env file or environment variables."
                )
            
            self._supabase = create_client(supabase_url, supabase_key)
        
        return self._supabase
    
    def create_profile(
        self,
        user_id: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None,
        dietary_preferences: Optional[List[str]] = None,
        goals: Optional[List[str]] = None,
        allergies: Optional[List[str]] = None,
        role: str = "user"
    ) -> Dict[str, Any]:
        """
        Create a new user profile
        
        Args:
            user_id: UUID of the user from auth.users
            full_name: User's full name
            avatar_url: URL to user's avatar image
            bio: User's bio/description
            dietary_preferences: List of dietary preferences
            goals: List of fitness/health goals
            allergies: List of allergies
            role: User role (default: 'user')
        
        Returns:
            Dictionary containing the created profile data
        """
        try:
            profile_data = {
                "user_id": user_id,
                "role": role,
                "saved_recipes": [],
                "last_login": datetime.utcnow().isoformat()
            }
            
            if full_name:
                profile_data["full_name"] = full_name
            if avatar_url:
                profile_data["avatar_url"] = avatar_url
            if bio:
                profile_data["bio"] = bio
            if dietary_preferences:
                profile_data["dietary_preferences"] = dietary_preferences
            if goals:
                profile_data["goals"] = goals
            if allergies:
                profile_data["allergies"] = allergies
            
            result = self.supabase.table("profiles").insert(profile_data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to create profile: No data returned")
        
        except Exception as e:
            raise Exception(f"Error creating profile: {str(e)}")
    
    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile by user_id
        
        Args:
            user_id: UUID of the user
        
        Returns:
            Dictionary containing profile data or None if not found
        """
        try:
            result = self.supabase.table("profiles").select("*").eq("user_id", user_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        
        except Exception as e:
            raise Exception(f"Error fetching profile: {str(e)}")
    
    def update_profile(
        self,
        user_id: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None,
        dietary_preferences: Optional[List[str]] = None,
        goals: Optional[List[str]] = None,
        allergies: Optional[List[str]] = None,
        saved_recipes: Optional[List[str]] = None,
        liked_recipes: Optional[List[str]] = None,
        role: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update user profile
        
        Args:
            user_id: UUID of the user
            Other parameters: Profile fields to update
        
        Returns:
            Dictionary containing the updated profile data
        """
        try:
            update_data = {}
            
            if full_name is not None:
                update_data["full_name"] = full_name
            if avatar_url is not None:
                update_data["avatar_url"] = avatar_url
            if bio is not None:
                update_data["bio"] = bio
            if dietary_preferences is not None:
                update_data["dietary_preferences"] = dietary_preferences
            if goals is not None:
                update_data["goals"] = goals
            if allergies is not None:
                update_data["allergies"] = allergies
            if saved_recipes is not None:
                update_data["saved_recipes"] = saved_recipes
            if liked_recipes is not None:
                update_data["liked_recipes"] = liked_recipes
            if role is not None:
                update_data["role"] = role
            
            if not update_data:
                raise ValueError("No fields to update")
            
            result = self.supabase.table("profiles").update(update_data).eq("user_id", user_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to update profile: No data returned")
        
        except Exception as e:
            raise Exception(f"Error updating profile: {str(e)}")
    
    def get_user_auth_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user data from auth.users table via Supabase Admin API
        Note: This requires service role key to access auth.users
        
        Args:
            user_id: UUID of the user
        
        Returns:
            Dictionary containing auth user data or None if not found
        """
        try:
            # Use Supabase Admin API to get user data
            # This requires service role key
            admin_response = self.supabase.auth.admin.get_user_by_id(user_id)
            
            if admin_response and hasattr(admin_response, 'user'):
                user = admin_response.user
                # Convert user object to dictionary
                user_dict = {
                    "id": getattr(user, 'id', None),
                    "email": getattr(user, 'email', None),
                    "email_confirmed_at": getattr(user, 'email_confirmed_at', None),
                    "last_sign_in_at": getattr(user, 'last_sign_in_at', None),
                    "created_at": getattr(user, 'created_at', None),
                    "updated_at": getattr(user, 'updated_at', None),
                }
                
                # Handle metadata
                app_metadata = getattr(user, 'app_metadata', None)
                user_metadata = getattr(user, 'user_metadata', None)
                
                if app_metadata:
                    user_dict["app_metadata"] = app_metadata if isinstance(app_metadata, dict) else {}
                else:
                    user_dict["app_metadata"] = {}
                
                if user_metadata:
                    user_dict["user_metadata"] = user_metadata if isinstance(user_metadata, dict) else {}
                else:
                    user_dict["user_metadata"] = {}
                
                return user_dict
            
            return None
        
        except AttributeError:
            # Supabase admin API might not be available in all versions
            # Try alternative approach using direct database query
            try:
                # This is a fallback - might not work depending on Supabase setup
                return None
            except Exception:
                return None
        except Exception as e:
            # If admin API fails, return None (user data might not be accessible)
            print(f"Warning: Could not fetch auth user data: {str(e)}")
            return None

    def user_exists_by_email(self, email: str) -> bool:
        """
        Check if a user exists in auth.users by email using Supabase Admin API
        Requires service role key
        """
        try:
            supabase_url = os.getenv("SUPABASE_URL", "")
            service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
            if not supabase_url or not service_key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")

            admin_endpoint = f"{supabase_url}/auth/v1/admin/users"
            headers = {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            }

            # Use email query param to search
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(admin_endpoint, params={"email": email}, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # Response shape can be:
                    # 1. Dict with "users" key containing array: {"users": [{"email": "...", ...}], "aud": "..."}
                    # 2. Direct array: [{"email": "...", ...}]
                    # 3. Single user dict: {"id": "...", "email": "...", ...}
                    users = []
                    if isinstance(data, dict):
                        # Check if it has a "users" key (newer API format)
                        if "users" in data and isinstance(data["users"], list):
                            users = data["users"]
                        # Check if it's a single user dict (has "id" and "email" at top level)
                        elif "id" in data and "email" in data:
                            users = [data]
                    elif isinstance(data, list):
                        users = data
                    
                    # Check if any user in the list matches the email
                    return any(u.get("email") == email for u in users)
                elif resp.status_code == 404:
                    return False
                else:
                    # For safety, do not block signup if admin check fails
                    print(f"Admin email check failed: {resp.status_code}")
                    return False
        except Exception as e:
            print(f"Admin email check error: {str(e)}")
            # Fail-open: if we cannot determine, treat as not existing
            return False
    
    def get_user_existence(self, email: str) -> Dict[str, Any]:
        """
        Check if a user exists in auth.users by email.
        Returns: { exists: bool }
        """
        try:
            exists = self.user_exists_by_email(email)
            return {"exists": exists}
            
        except Exception as e:
            print(f"Admin email check error: {str(e)}")
            return {"exists": False}
    
    def get_user_providers(self, email: str) -> Dict[str, Any]:
        """
        Check if a user exists in auth.users by email and return associated providers.
        Returns: { exists: bool, providers: List[str] }
        """
        try:
            supabase_url = os.getenv("SUPABASE_URL", "")
            service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
            if not supabase_url or not service_key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")

            admin_endpoint = f"{supabase_url}/auth/v1/admin/users"
            headers = {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            }

            providers: List[str] = []
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(admin_endpoint, params={"email": email}, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # Response shape can be:
                    # 1. Dict with "users" key containing array: {"users": [{"email": "...", ...}], "aud": "..."}
                    # 2. Direct array: [{"email": "...", ...}]
                    # 3. Single user dict: {"id": "...", "email": "...", ...}
                    users = []
                    if isinstance(data, dict):
                        # Check if it has a "users" key (newer API format)
                        if "users" in data and isinstance(data["users"], list):
                            users = data["users"]
                        # Check if it's a single user dict (has "id" and "email" at top level)
                        elif "id" in data and "email" in data:
                            users = [data]
                    elif isinstance(data, list):
                        users = data

                    matched = [u for u in users if (u.get("email") or "").lower() == email.lower()]
                    if not matched:
                        return {"exists": False, "providers": []}

                    user = matched[0]
                    
                    # Check app_metadata.providers first (most reliable)
                    app_metadata = user.get("app_metadata") or {}
                    if isinstance(app_metadata, dict) and "providers" in app_metadata:
                        providers_list = app_metadata["providers"]
                        if isinstance(providers_list, list):
                            providers.extend(providers_list)
                    
                    # Fallback to identities
                    identities = user.get("identities") or []
                    for ident in identities:
                        prov = ident.get("provider")
                        if prov and prov not in providers:
                            providers.append(prov)
                    
                    # Fallback to top-level provider field
                    if not providers and user.get("provider"):
                        providers.append(user.get("provider"))

                    # Normalize common values
                    normalized = []
                    for p in providers:
                        if p == "email" or p == "password":
                            normalized.append("email")
                        else:
                            normalized.append(p)
                    print(f"Providers returned: {normalized}")

                    return {"exists": True, "providers": list(dict.fromkeys(normalized))}
                elif resp.status_code == 404:
                    return {"exists": False, "providers": []}
                else:
                    print(f"Admin email check failed: {resp.status_code}")
                    return {"exists": False, "providers": []}
        except Exception as e:
            print(f"Admin email check error: {str(e)}")
            return {"exists": False, "providers": []}

    def log_analytics_activity(
        self,
        user_id: str,
        action_type: str,
        recipe_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        device_type: Optional[str] = None,
        session_id: Optional[str] = None,
        location: Optional[str] = None,
        referrer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Log user analytics activity
        
        Args:
            user_id: UUID of the user performing the action
            action_type: Type of action (e.g., 'view_recipe', 'save_recipe', 'search')
            recipe_id: UUID of the recipe (if applicable)
            metadata: Additional metadata as JSON object
            device_type: Type of device (e.g., 'mobile', 'desktop', 'tablet')
            session_id: Session identifier
            location: User location
            referrer: Referrer URL
        
        Returns:
            Dictionary containing the logged activity data
        """
        try:
            activity_data = {
                "user_id": user_id,
                "action_type": action_type,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata if metadata else {}
            }
            
            if recipe_id:
                activity_data["recipe_id"] = recipe_id
            if device_type:
                activity_data["device_type"] = device_type
            if session_id:
                activity_data["session_id"] = session_id
            if location:
                activity_data["location"] = location
            if referrer:
                activity_data["referrer"] = referrer
            
            result = self.supabase.table("analytics_user_activity").insert(activity_data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to log analytics activity: No data returned")
        
        except Exception as e:
            raise Exception(f"Error logging analytics activity: {str(e)}")
    
    def create_recipe(
        self,
        recipe_data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Create a new recipe in the recipes table
        
        Args:
            recipe_data: Dictionary containing recipe data
            user_id: UUID of the user creating the recipe
        
        Returns:
            Dictionary containing the created recipe data with ID
        """
        try:
            print(f"Creating recipe in database for user: REDACTED")
            
            # Prepare recipe data for insertion
            recipe_insert = {
                "user_id": user_id,
                "title": recipe_data.get("title", ""),
                "description": recipe_data.get("description", ""),
                "meal_type": recipe_data.get("meal_type"),
                "serving_size": recipe_data.get("serving_size", 1),
                "ingredients": recipe_data.get("ingredients", []),
                "steps": recipe_data.get("steps", []),
                "nutrition": recipe_data.get("nutrition", {}),
                "tags": recipe_data.get("tags", []),
                "prep_time": recipe_data.get("prep_time"),
                "cook_time": recipe_data.get("cook_time"),
                "image_url": recipe_data.get("image_url"),
                "ai_context": recipe_data.get("ai_context", {}),
                "is_public": recipe_data.get("is_public", False),
                "is_ai_generated": recipe_data.get("is_ai_generated", False)
            }
            
            print(f"Inserting recipe: {recipe_insert.get('title')}")
            result = self.supabase.table("recipes").insert(recipe_insert).execute()
            
            if result.data and len(result.data) > 0:
                recipe_id = result.data[0].get("id")
                print(f"Recipe created successfully with ID: {recipe_id}")
                return result.data[0]
            else:
                raise Exception("Failed to create recipe: No data returned")
        
        except Exception as e:
            print(f"Error creating recipe: {str(e)}")
            raise Exception(f"Error creating recipe: {str(e)}")
    
    def get_recipe(self, recipe_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a recipe by ID
        
        Args:
            recipe_id: UUID of the recipe
        
        Returns:
            Dictionary containing recipe data, or None if not found
        """
        try:
            print(f"Fetching recipe: {recipe_id}")
            result = self.supabase.table("recipes").select("*").eq("id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                print(f"Recipe found: {result.data[0].get('title')}")
                return result.data[0]
            else:
                print(f"Recipe not found: {recipe_id}")
                return None
        
        except Exception as e:
            print(f"Error fetching recipe: {str(e)}")
            raise Exception(f"Error fetching recipe: {str(e)}")
    
    def create_recipe_analytics(
        self,
        recipe_id: str,
        user_id: str,
        ai_generated: bool = False
    ) -> None:
        """
        Create initial analytics entry for a recipe (only if it doesn't exist)
        
        Args:
            recipe_id: UUID of the recipe
            user_id: UUID of the user who created the recipe
            ai_generated: Whether the recipe was AI-generated
        """
        try:
            # Check if analytics record already exists
            result = self.supabase.table("analytics_recipe_performance").select("id").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update ai_generated if needed
                update_data = {}
                if ai_generated:
                    update_data["ai_generated"] = ai_generated
                    update_data["ai_model_used"] = "gemini-2.0-flash-exp"
                
                if update_data:
                    self.supabase.table("analytics_recipe_performance").update(update_data).eq("recipe_id", recipe_id).execute()
                print(f"Analytics entry already exists for recipe: {recipe_id}")
                return
            
            print(f"Creating analytics entry for recipe: {recipe_id}")
            
            analytics_data = {
                "recipe_id": recipe_id,
                "views": 0,
                "likes": 0,
                "saves": 0,
                "shares": 0,
                "average_rating": 0.0,
                "comments_count": 0,
                "ai_generated": ai_generated,
            }
            
            if ai_generated:
                analytics_data["ai_model_used"] = "gemini-2.0-flash-exp"
            
            result = self.supabase.table("analytics_recipe_performance").insert(analytics_data).execute()
            
            if result.data:
                print("Analytics entry created successfully")
            else:
                print("Warning: Analytics entry creation returned no data")
        
        except Exception as e:
            print(f"Error creating recipe analytics: {str(e)}")
            # Don't raise - analytics failure shouldn't break recipe creation
    
    def log_recipe_creation(
        self,
        user_id: str,
        recipe_id: str
    ) -> None:
        """
        Log recipe creation activity
        
        Args:
            user_id: UUID of the user
            recipe_id: UUID of the created recipe
        """
        try:
            print(f"Logging recipe creation activity: user=REDACTED, recipe={recipe_id}")
            self.log_analytics_activity(
                user_id=user_id,
                action_type="create_recipe",
                recipe_id=recipe_id,
                metadata={"recipe_id": recipe_id}
            )
            print("Recipe creation activity logged successfully")
        except Exception as e:
            print(f"Error logging recipe creation: {str(e)}")
            # Don't raise - logging failure shouldn't break recipe creation
    
    def get_analytics_activities(
        self,
        user_id: Optional[str] = None,
        recipe_id: Optional[str] = None,
        action_type: Optional[str] = None,
        session_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get analytics activity logs
        
        Args:
            user_id: Filter by user ID
            recipe_id: Filter by recipe ID
            action_type: Filter by action type
            session_id: Filter by session ID
            start_date: Filter activities after this date
            end_date: Filter activities before this date
            limit: Maximum number of records to return
        
        Returns:
            List of activity log dictionaries
        """
        try:
            query = self.supabase.table("analytics_user_activity").select("*")
            
            if user_id:
                query = query.eq("user_id", user_id)
            if recipe_id:
                query = query.eq("recipe_id", recipe_id)
            if action_type:
                query = query.eq("action_type", action_type)
            if session_id:
                query = query.eq("session_id", session_id)
            if start_date:
                query = query.gte("timestamp", start_date.isoformat())
            if end_date:
                query = query.lte("timestamp", end_date.isoformat())
            
            query = query.order("timestamp", desc=True).limit(limit)
            result = query.execute()
            
            return result.data if result.data else []
        
        except Exception as e:
            raise Exception(f"Error fetching analytics activities: {str(e)}")
    
    def get_user_recipes(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all recipes created by a user
        
        Args:
            user_id: UUID of the user
        
        Returns:
            List of recipe dictionaries
        """
        try:
            result = self.supabase.table("recipes").select("id, title, description, meal_type, image_url, nutrition, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
            
            return result.data if result.data else []
        
        except Exception as e:
            raise Exception(f"Error fetching user recipes: {str(e)}")
    
    def get_user_analytics(self, user_id: str) -> Dict[str, Any]:
        """
        Get aggregated analytics data for a user
        
        Args:
            user_id: UUID of the user
        
        Returns:
            Dictionary containing analytics data
        """
        try:
            # Prefer RPC to aggregate in-database (using v2 with correct most_cooked_meal logic)
            try:
                rpc_response = self.supabase.rpc(
                    "rpc_get_user_analytics_v2",
                    {"p_user_id": user_id}
                ).execute()

                print(f"[rpc_get_user_analytics] RPC response received")
                if rpc_response.data and len(rpc_response.data) > 0:
                    row = rpc_response.data[0]
                    return {
                        "total_recipes_created": row.get("total_recipes_created", 0),
                        "total_recipes_shared": row.get("total_recipes_shared", 0),
                        "total_optimized": row.get("total_optimized", 0),
                        "avg_calories": row.get("avg_calories", 0),
                        "most_cooked_meal": row.get("most_cooked_meal"),
                    }
            except Exception as rpc_err:
                # Fall back to legacy path if RPC is missing or errors
                print(f"[rpc_get_user_analytics] RPC failed, falling back. Error: {rpc_err}")

            # Fallback to existing Python-side aggregation if RPC not available
            # Get total recipes created
            recipes_result = self.supabase.table("recipes").select("id, nutrition").eq("user_id", user_id).execute()
            total_recipes_created = len(recipes_result.data) if recipes_result.data else 0

            # Calculate average calories
            total_calories = 0
            recipes_with_calories = 0
            if recipes_result.data:
                for recipe in recipes_result.data:
                    nutrition = recipe.get("nutrition", {})
                    if isinstance(nutrition, dict) and "calories" in nutrition:
                        calories = nutrition.get("calories")
                        if isinstance(calories, (int, float)):
                            total_calories += calories
                            recipes_with_calories += 1
            avg_calories = total_calories / recipes_with_calories if recipes_with_calories > 0 else 0

            # Get total recipes shared (from community table)
            community_result = self.supabase.table("community").select("id").eq("posted_by", str(user_id)).execute()
            total_recipes_shared = len(community_result.data) if community_result.data else 0

            # Get optimization count from user_recipe_actions
            try:
                actions_result = self.supabase.table("user_recipe_actions").select("id").eq("user_id", user_id).eq("action_type", "optimize_recipe").execute()
                total_optimized = len(actions_result.data) if actions_result.data else 0
            except Exception:
                # If user_recipe_actions table doesn't exist yet, set to 0
                total_optimized = 0

            # Find most cooked meal (from user_recipe_actions with action_type = 'step-by-step')
            most_cooked_meal = None
            try:
                step_by_step_actions = self.supabase.table("user_recipe_actions").select("recipe_id").eq("user_id", user_id).eq("action_type", "step-by-step").execute()

                if step_by_step_actions.data:
                    # Count occurrences of each recipe_id
                    recipe_counts = {}
                    for action in step_by_step_actions.data:
                        recipe_id = action.get("recipe_id")
                        if recipe_id:
                            recipe_counts[recipe_id] = recipe_counts.get(recipe_id, 0) + 1

                    if recipe_counts:
                        # Find recipe with max count
                        most_cooked_recipe_id = max(recipe_counts, key=recipe_counts.get)
                        most_cooked_count = recipe_counts[most_cooked_recipe_id]

                        # Get recipe title
                        recipe = self.get_recipe(most_cooked_recipe_id)
                        if recipe:
                            most_cooked_meal = {
                                "id": most_cooked_recipe_id,
                                "title": recipe.get("title", "Unknown"),
                                "count": most_cooked_count
                            }
            except Exception:
                # If user_recipe_actions table doesn't exist yet, leave as None
                pass

            return {
                "total_recipes_created": total_recipes_created,
                "total_recipes_shared": total_recipes_shared,
                "total_optimized": total_optimized,
                "avg_calories": round(avg_calories, 1),
                "most_cooked_meal": most_cooked_meal
            }
        
        except Exception as e:
            raise Exception(f"Error fetching user analytics: {str(e)}")
    
    def get_user_recipe_actions(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get user recipe actions (activities) from user_recipe_actions table
        
        Args:
            user_id: UUID of the user
            limit: Maximum number of records to return
        
        Returns:
            List of activity dictionaries with recipe titles joined from recipes table
        """
        try:
            # Optional RPC path for joined/limited actions
            try:
                rpc_response = self.supabase.rpc(
                    "rpc_get_user_actions",
                    {"user_id": user_id, "p_limit": limit}
                ).execute()
                print(f"rpc_response received")

                if rpc_response.data:
                    return rpc_response.data
            except Exception as rpc_err:
                print(f"[rpc_get_user_actions] RPC failed, falling back. Error: {rpc_err}")

            # Fallback to direct query and enrichment
            result = self.supabase.table("user_recipe_actions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()

            if not result.data:
                return []

            # Enrich with recipe titles
            activities = []
            for action in result.data:
                created_at = action.get("created_at")
                # Ensure timestamp is properly formatted
                # If created_at is a datetime object, it will be serialized by FastAPI/orjson
                # If it's None, we'll pass None and let frontend handle it
                timestamp = created_at.isoformat() if created_at and hasattr(created_at, 'isoformat') else created_at
                print(f"timestamp: {timestamp}")
                
                activity = {
                    "id": str(action.get("id")),
                    "action_type": action.get("action_type"),
                    "recipe_id": action.get("recipe_id"),
                    "timestamp": timestamp,  # Map created_at to timestamp for frontend
                    "metadata": action.get("metadata", {}),
                    "comment_text": action.get("comment_text")
                }

                # Get recipe title if recipe_id exists
                recipe_id = action.get("recipe_id")
                if recipe_id:
                    recipe = self.get_recipe(recipe_id)
                    if recipe:
                        activity["recipe_title"] = recipe.get("title")

                activities.append(activity)

            return activities
        
        except Exception as e:
            # If table doesn't exist, return empty list
            if "does not exist" in str(e).lower() or "relation" in str(e).lower():
                return []
            raise Exception(f"Error fetching user recipe actions: {str(e)}")
    
    def log_user_recipe_action(
        self,
        user_id: str,
        action_type: str,
        recipe_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        comment_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Log user recipe action to user_recipe_actions table
        
        Args:
            user_id: UUID of the user
            action_type: Type of action (e.g., 'like', 'unlike', 'save', 'unsave')
            recipe_id: UUID of the recipe (optional)
            metadata: Additional metadata as JSON object
            comment_text: Comment text if applicable
        
        Returns:
            Dictionary containing the logged action data
        """
        try:
            action_data = {
                "user_id": user_id,
                "action_type": action_type,
                "created_at": datetime.utcnow().isoformat(),
                "metadata": metadata if metadata else {}
            }
            
            if recipe_id:
                action_data["recipe_id"] = recipe_id
            if comment_text:
                action_data["comment_text"] = comment_text
            
            result = self.supabase.table("user_recipe_actions").insert(action_data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to log user recipe action: No data returned")
        
        except Exception as e:
            # If table doesn't exist, return empty dict (don't fail)
            if "does not exist" in str(e).lower() or "relation" in str(e).lower():
                print(f"Warning: user_recipe_actions table doesn't exist: {str(e)}")
                return {}
            raise Exception(f"Error logging user recipe action: {str(e)}")
    
    def remove_from_liked_recipes(self, user_id: str, recipe_id: str) -> Dict[str, Any]:
        """
        Remove recipe_id from profiles.liked_recipes JSONB array
        
        Args:
            user_id: UUID of the user
            recipe_id: UUID of the recipe to remove
        
        Returns:
            Updated profile dictionary
        """
        try:
            # Get current profile
            profile = self.get_profile(user_id)
            if not profile:
                raise Exception("Profile not found")
            
            # Get current liked_recipes array
            liked_recipes = profile.get("liked_recipes", [])
            if not isinstance(liked_recipes, list):
                liked_recipes = []
            
            # Remove recipe_id if it exists
            if recipe_id in liked_recipes:
                liked_recipes = [r for r in liked_recipes if r != recipe_id]
                
                # Update profile
                result = self.supabase.table("profiles").update({"liked_recipes": liked_recipes}).eq("user_id", user_id).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0]
                else:
                    raise Exception("Failed to update profile: No data returned")
            
            return profile
        
        except Exception as e:
            raise Exception(f"Error removing from liked_recipes: {str(e)}")
    
    def remove_from_saved_recipes(self, user_id: str, recipe_id: str) -> Dict[str, Any]:
        """
        Remove recipe_id from profiles.saved_recipes JSONB array
        
        Args:
            user_id: UUID of the user
            recipe_id: UUID of the recipe to remove
        
        Returns:
            Updated profile dictionary
        """
        try:
            # Get current profile
            profile = self.get_profile(user_id)
            if not profile:
                raise Exception("Profile not found")
            
            # Get current saved_recipes array
            saved_recipes = profile.get("saved_recipes", [])
            if not isinstance(saved_recipes, list):
                saved_recipes = []
            
            # Remove recipe_id if it exists
            if recipe_id in saved_recipes:
                saved_recipes = [r for r in saved_recipes if r != recipe_id]
                
                # Update profile
                result = self.supabase.table("profiles").update({"saved_recipes": saved_recipes}).eq("user_id", user_id).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0]
                else:
                    raise Exception("Failed to update profile: No data returned")
            
            return profile
        
        except Exception as e:
            raise Exception(f"Error removing from saved_recipes: {str(e)}")
    
    def cleanup_invalid_recipe_ids(self, user_id: str, recipe_ids: List[str], list_type: str = "saved") -> Dict[str, Any]:
        """
        Remove invalid recipe IDs from user profile (recipes that don't exist)
        This is useful for cleaning up orphaned recipe IDs after recipes are deleted
        
        Args:
            user_id: UUID of the user
            recipe_ids: List of recipe IDs to check and remove if invalid
            list_type: "saved" or "liked" (default: "saved")
        
        Returns:
            Updated profile dictionary
        """
        try:
            # Get current profile
            profile = self.get_profile(user_id)
            if not profile:
                raise Exception("Profile not found")
            
            # Get the appropriate list
            if list_type == "saved":
                recipe_list = profile.get("saved_recipes", [])
            elif list_type == "liked":
                recipe_list = profile.get("liked_recipes", [])
            else:
                raise Exception(f"Invalid list_type: {list_type}. Must be 'saved' or 'liked'")
            
            if not isinstance(recipe_list, list):
                recipe_list = []
            
            # Check which recipe IDs don't exist in the database
            invalid_ids = []
            if recipe_ids:
                # Check which recipes exist
                recipes_result = self.supabase.table("recipes").select("id").in_("id", recipe_ids).execute()
                existing_ids = {r.get("id") for r in (recipes_result.data or []) if r.get("id")}
                invalid_ids = [rid for rid in recipe_ids if rid not in existing_ids]
            
            # Remove invalid IDs from the list
            if invalid_ids:
                recipe_list = [r for r in recipe_list if r not in invalid_ids]
                
                # Update profile
                update_data = {f"{list_type}_recipes": recipe_list}
                result = self.supabase.table("profiles").update(update_data).eq("user_id", user_id).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0]
                else:
                    raise Exception("Failed to update profile: No data returned")
            
            return profile
        
        except Exception as e:
            raise Exception(f"Error cleaning up invalid recipe IDs: {str(e)}")
    
    def update_recipe_performance_likes(self, recipe_id: str, increment: bool = False) -> None:
        """
        Increment or decrement likes in analytics_recipe_performance table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if record exists
            result = self.supabase.table("analytics_recipe_performance").select("id, likes").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_likes = result.data[0].get("likes", 0) or 0
                new_likes = max(0, current_likes + (1 if increment else -1))
                
                self.supabase.table("analytics_recipe_performance").update({"likes": new_likes}).eq("recipe_id", recipe_id).execute()
            else:
                # Record doesn't exist, create it with likes = 1 if incrementing, 0 if decrementing
                if increment:
                    self.supabase.table("analytics_recipe_performance").insert({
                        "recipe_id": recipe_id,
                        "likes": 1
                    }).execute()
        
        except Exception as e:
            # Don't fail the main operation if analytics update fails
            print(f"Warning: Failed to update recipe performance likes: {str(e)}")
    
    def update_recipe_performance_saves(self, recipe_id: str, increment: bool = False) -> None:
        """
        Increment or decrement saves in analytics_recipe_performance table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if record exists
            result = self.supabase.table("analytics_recipe_performance").select("id, saves").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_saves = result.data[0].get("saves", 0) or 0
                new_saves = max(0, current_saves + (1 if increment else -1))
                
                self.supabase.table("analytics_recipe_performance").update({"saves": new_saves}).eq("recipe_id", recipe_id).execute()
            else:
                # Record doesn't exist, create it with saves = 1 if incrementing, 0 if decrementing
                if increment:
                    self.supabase.table("analytics_recipe_performance").insert({
                        "recipe_id": recipe_id,
                        "saves": 1
                    }).execute()
        
        except Exception as e:
            # Don't fail the main operation if analytics update fails
            print(f"Warning: Failed to update recipe performance saves: {str(e)}")
    
    def update_community_likes(self, recipe_id: str, increment: bool = False) -> None:
        """
        Increment or decrement likes in community table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if recipe exists in community
            result = self.supabase.table("community").select("id, likes").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_likes = result.data[0].get("likes", 0) or 0
                new_likes = max(0, current_likes + (1 if increment else -1))
                
                self.supabase.table("community").update({"likes": new_likes}).eq("recipe_id", recipe_id).execute()
        
        except Exception as e:
            # Don't fail the main operation if community update fails
            print(f"Warning: Failed to update community likes: {str(e)}")
    
    def get_community_comments(self, recipe_id: str, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get comments from community table for a recipe with pagination
        
        Args:
            recipe_id: UUID of the recipe
            page: Page number (1-indexed)
            limit: Number of comments per page
        
        Returns:
            List of comment dictionaries
        """
        try:
            # Get community record
            result = self.supabase.table("community").select("comments").eq("recipe_id", recipe_id).execute()
            
            if not result.data or len(result.data) == 0:
                return []
            
            comments = result.data[0].get("comments", [])
            if not isinstance(comments, list):
                return []
            
            # Sort by created_at descending (newest first)
            comments.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            # Paginate
            start = (page - 1) * limit
            end = start + limit
            paginated_comments = comments[start:end]
            
            return paginated_comments
        
        except Exception as e:
            print(f"Error fetching community comments: {str(e)}")
            return []
    
    def add_community_comment(
        self,
        recipe_id: str,
        user_id: str,
        comment_text: str
    ) -> Dict[str, Any]:
        """
        Add a comment to community.comments JSONB array
        
        Args:
            recipe_id: UUID of the recipe
            user_id: UUID of the user commenting
            comment_text: Text of the comment
        
        Returns:
            The added comment dictionary
        """
        try:
            import uuid
            from datetime import datetime
            
            # Get user profile for name and avatar
            profile = self.get_profile(user_id)
            user_name = profile.get("full_name", "Anonymous") if profile else "Anonymous"
            user_avatar = profile.get("avatar_url") if profile else None
            
            # Create comment object
            new_comment = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "user_name": user_name,
                "user_avatar": user_avatar,
                "text": comment_text,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Get current comments
            result = self.supabase.table("community").select("comments").eq("recipe_id", recipe_id).execute()
            
            if not result.data or len(result.data) == 0:
                # Create community record if it doesn't exist
                recipe = self.get_recipe(recipe_id)
                if not recipe:
                    raise Exception("Recipe not found")
                
                recipe_user_id = recipe.get("user_id")
                if not recipe_user_id:
                    raise Exception("Recipe user_id not found")
                
                # Validate user exists before creating community record
                user_check = self.supabase.table("profiles").select("user_id").eq("user_id", recipe_user_id).execute()
                if not user_check.data or len(user_check.data) == 0:
                    raise Exception(f"User {recipe_user_id} does not exist. Cannot create community record.")
                
                self.supabase.table("community").insert({
                    "recipe_id": recipe_id,
                    "posted_by": str(recipe_user_id),
                    "comments": [new_comment]
                }).execute()
            else:
                # Append to existing comments
                current_comments = result.data[0].get("comments", [])
                if not isinstance(current_comments, list):
                    current_comments = []
                
                updated_comments = [new_comment] + current_comments  # Newest first
                
                self.supabase.table("community").update({
                    "comments": updated_comments
                }).eq("recipe_id", recipe_id).execute()
            
            return new_comment
        
        except Exception as e:
            raise Exception(f"Error adding community comment: {str(e)}")
    
    def update_community_shares(self, recipe_id: str, increment: bool = True) -> None:
        """
        Increment shares in community table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if recipe exists in community
            result = self.supabase.table("community").select("id, shares").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_shares = result.data[0].get("shares", 0) or 0
                new_shares = max(0, current_shares + (1 if increment else -1))
                
                self.supabase.table("community").update({"shares": new_shares}).eq("recipe_id", recipe_id).execute()
        
        except Exception as e:
            print(f"Warning: Failed to update community shares: {str(e)}")
    
    def update_recipe_performance_comments_count(self, recipe_id: str, increment: bool = True) -> None:
        """
        Increment or decrement comments_count in analytics_recipe_performance table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if record exists
            result = self.supabase.table("analytics_recipe_performance").select("id, comments_count").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_count = result.data[0].get("comments_count", 0) or 0
                new_count = max(0, current_count + (1 if increment else -1))
                
                self.supabase.table("analytics_recipe_performance").update({"comments_count": new_count}).eq("recipe_id", recipe_id).execute()
            else:
                # Record doesn't exist, create it with comments_count = 1 if incrementing
                if increment:
                    self.supabase.table("analytics_recipe_performance").insert({
                        "recipe_id": recipe_id,
                        "comments_count": 1
                    }).execute()
        
        except Exception as e:
            print(f"Warning: Failed to update recipe performance comments_count: {str(e)}")
    
    def update_recipe_performance_shares(self, recipe_id: str, increment: bool = True) -> None:
        """
        Increment or decrement shares in analytics_recipe_performance table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if record exists
            result = self.supabase.table("analytics_recipe_performance").select("id, shares").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_shares = result.data[0].get("shares", 0) or 0
                new_shares = max(0, current_shares + (1 if increment else -1))
                
                self.supabase.table("analytics_recipe_performance").update({"shares": new_shares}).eq("recipe_id", recipe_id).execute()
            else:
                # Record doesn't exist, create it with shares = 1 if incrementing
                if increment:
                    self.supabase.table("analytics_recipe_performance").insert({
                        "recipe_id": recipe_id,
                        "shares": 1
                    }).execute()
        
        except Exception as e:
            print(f"Warning: Failed to update recipe performance shares: {str(e)}")
    
    def update_community_views(self, recipe_id: str, increment: bool = True) -> None:
        """
        Increment views in community table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if recipe exists in community
            result = self.supabase.table("community").select("id, views").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_views = result.data[0].get("views", 0) or 0
                new_views = max(0, current_views + (1 if increment else -1))
                
                self.supabase.table("community").update({"views": new_views}).eq("recipe_id", recipe_id).execute()
        
        except Exception as e:
            print(f"Warning: Failed to update community views: {str(e)}")
    
    def update_recipe_performance_views(self, recipe_id: str, increment: bool = True) -> None:
        """
        Increment or decrement views in analytics_recipe_performance table
        
        Args:
            recipe_id: UUID of the recipe
            increment: If True, increment; if False, decrement
        """
        try:
            # Check if record exists
            result = self.supabase.table("analytics_recipe_performance").select("id, views").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update it
                current_views = result.data[0].get("views", 0) or 0
                new_views = max(0, current_views + (1 if increment else -1))
                
                self.supabase.table("analytics_recipe_performance").update({"views": new_views}).eq("recipe_id", recipe_id).execute()
            else:
                # Record doesn't exist, create it with views = 1 if incrementing
                if increment:
                    self.supabase.table("analytics_recipe_performance").insert({
                        "recipe_id": recipe_id,
                        "views": 1
                    }).execute()
        
        except Exception as e:
            print(f"Warning: Failed to update recipe performance views: {str(e)}")
    
    def add_to_liked_recipes(self, user_id: str, recipe_id: str) -> Dict[str, Any]:
        """
        Add recipe_id to profiles.liked_recipes JSONB array
        
        Args:
            user_id: UUID of the user
            recipe_id: UUID of the recipe to add
        
        Returns:
            Updated profile dictionary
        """
        try:
            # Get current profile
            profile = self.get_profile(user_id)
            if not profile:
                raise Exception("Profile not found")
            
            # Get current liked_recipes array
            liked_recipes = profile.get("liked_recipes", [])
            if not isinstance(liked_recipes, list):
                liked_recipes = []
            
            # Add recipe_id if it doesn't exist
            if recipe_id not in liked_recipes:
                liked_recipes.append(recipe_id)
                
                # Update profile
                result = self.supabase.table("profiles").update({"liked_recipes": liked_recipes}).eq("user_id", user_id).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0]
                else:
                    raise Exception("Failed to update profile: No data returned")
            
            return profile
        
        except Exception as e:
            raise Exception(f"Error adding to liked_recipes: {str(e)}")
    
    def add_to_saved_recipes(self, user_id: str, recipe_id: str) -> Dict[str, Any]:
        """
        Add recipe_id to profiles.saved_recipes JSONB array
        
        Args:
            user_id: UUID of the user
            recipe_id: UUID of the recipe to add
        
        Returns:
            Updated profile dictionary
        """
        try:
            # Get current profile
            profile = self.get_profile(user_id)
            if not profile:
                raise Exception("Profile not found")
            
            # Get current saved_recipes array
            saved_recipes = profile.get("saved_recipes", [])
            if not isinstance(saved_recipes, list):
                saved_recipes = []
            
            # Add recipe_id if it doesn't exist
            if recipe_id not in saved_recipes:
                saved_recipes.append(recipe_id)
                
                # Update profile
                result = self.supabase.table("profiles").update({"saved_recipes": saved_recipes}).eq("user_id", user_id).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0]
                else:
                    raise Exception("Failed to update profile: No data returned")
            
            return profile
        
        except Exception as e:
            raise Exception(f"Error adding to saved_recipes: {str(e)}")
    
    def create_community_record(self, recipe_id: str, user_id: str) -> Dict[str, Any]:
        """
        Create a community record for a recipe
        
        Args:
            recipe_id: UUID of the recipe
            user_id: UUID of the user posting the recipe
        
        Returns:
            Dictionary containing the created community record
        """
        try:
            # Validate user exists before creating/updating community record
            # This provides application-level validation since FK constraint was removed
            user_check = self.supabase.table("profiles").select("user_id").eq("user_id", user_id).execute()
            if not user_check.data or len(user_check.data) == 0:
                raise Exception(f"User {user_id} does not exist. Cannot create community record.")
            
            # Check if community record already exists
            result = self.supabase.table("community").select("id").eq("recipe_id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                # Record exists, update posted_by if different
                # Convert user_id to string (posted_by is now TEXT)
                self.supabase.table("community").update({
                    "posted_by": str(user_id)
                }).eq("recipe_id", recipe_id).execute()
                
                # Return existing record
                updated_result = self.supabase.table("community").select("*").eq("recipe_id", recipe_id).execute()
                if updated_result.data and len(updated_result.data) > 0:
                    return updated_result.data[0]
            else:
                # Create new community record
                # Convert user_id to string (posted_by is now TEXT)
                community_data = {
                    "recipe_id": recipe_id,
                    "posted_by": str(user_id),
                    "likes": 0,
                    "views": 0,
                    "shares": 0,
                    "comments": [],
                    "is_featured": False
                }
                
                result = self.supabase.table("community").insert(community_data).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0]
                else:
                    raise Exception("Failed to create community record: No data returned")
            
            raise Exception("Failed to create/update community record")
        
        except Exception as e:
            raise Exception(f"Error creating community record: {str(e)}")
    
    def update_recipe_is_public(self, recipe_id: str, is_public: bool = True) -> Dict[str, Any]:
        """
        Update the is_public field of a recipe
        
        Args:
            recipe_id: UUID of the recipe
            is_public: Boolean value to set is_public to (default: True)
        
        Returns:
            Dictionary containing the updated recipe data
        """
        try:
            result = self.supabase.table("recipes").update({"is_public": is_public}).eq("id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to update recipe: No data returned")
        
        except Exception as e:
            raise Exception(f"Error updating recipe is_public: {str(e)}")
    
    def update_recipe_ingredients(
        self,
        recipe_id: str,
        ingredients: List[Dict[str, Any]],
        steps: List[Dict[str, Any]],
        nutrition: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update recipe's ingredients, steps, and nutrition in database
        
        Args:
            recipe_id: UUID of the recipe
            ingredients: Updated ingredients list
            steps: Updated steps list
            nutrition: Optional updated nutrition data
        
        Returns:
            Dictionary containing the updated recipe data
        """
        try:
            update_data = {
                "ingredients": ingredients,
                "steps": steps
            }
            
            if nutrition:
                update_data["nutrition"] = nutrition
            
            result = self.supabase.table("recipes").update(update_data).eq("id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to update recipe: No data returned")
        
        except Exception as e:
            raise Exception(f"Error updating recipe ingredients: {str(e)}")
    
    def update_recipe_to_public(
        self,
        recipe_id: str,
        title: str,
        description: str,
        tags: List[str],
        image_url: Optional[str] = None,
        steps: Optional[List[Dict[str, Any]]] = None,
        is_ai_generated: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Update an existing recipe to be public and update its details
        
        Args:
            recipe_id: UUID of the recipe
            title: Updated title
            description: Updated description
            tags: Updated tags list
            image_url: Optional updated image URL
            steps: Optional updated steps list
            is_ai_generated: Optional flag to indicate if recipe is AI-generated
        
        Returns:
            Dictionary containing the updated recipe data
        """
        try:
            update_data = {
                "is_public": True,
                "title": title,
                "description": description,
                "tags": tags
            }
            
            if image_url:
                update_data["image_url"] = image_url
            
            if steps is not None:
                update_data["steps"] = steps
            
            if is_ai_generated is not None:
                update_data["is_ai_generated"] = is_ai_generated
            
            result = self.supabase.table("recipes").update(update_data).eq("id", recipe_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to update recipe: No data returned")
        
        except Exception as e:
            raise Exception(f"Error updating recipe to public: {str(e)}")
    
    def get_community_recipes(
        self,
        page: int = 1,
        limit: int = 20,
        sort: str = "newest",
        tags: Optional[List[str]] = None,
        search: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get community recipes with pagination, filtering, and sorting
        
        Args:
            page: Page number (1-indexed)
            limit: Number of recipes per page (max 100)
            sort: Sort type - "newest", "trending", or "popular"
            tags: Optional list of tags to filter by
            search: Optional search query string
            user_id: Optional user_id to filter by posted_by
        
        Returns:
            Dictionary with recipes list and pagination metadata
        """
        try:
            # Prefer RPC for server-side filtering/sorting/pagination
            try:
                rpc_params = {
                    "page": page,
                    "limit": limit,
                    "sort": sort,
                    "tags": tags or [],
                    "search": search or "",
                    "user_id": user_id,
                }

                rpc_response = self.supabase.rpc(
                    "rpc_get_community_recipes_v2",
                    {"params": rpc_params}
                ).execute()

                if rpc_response.data and len(rpc_response.data) > 0:
                    row = rpc_response.data[0]
                    return {
                        "recipes": row.get("recipes", []),
                        "page": row.get("page", page),
                        "limit": row.get("limit_count", row.get("limit", limit)),  # Map limit_count to limit
                        "total": row.get("total", 0),
                        "has_more": row.get("has_more", False),
                    }
            except Exception as rpc_err:
                print(f"[rpc_get_community_recipes_v2] RPC failed, falling back. Error: {rpc_err}")

            # Fallback to existing Python logic if RPC unavailable
            # Validate and clamp limit
            limit = min(max(1, limit), 100)
            page = max(1, page)
            offset = (page - 1) * limit

            # Step 1: Get community records (to get recipe_ids and filter by posted_by)
            # If user_id is provided, filter by posted_by; otherwise get all community records
            # Filter out soft-deleted recipes (where posted_by starts with 'deleted_')
            community_query = self.supabase.table("community").select("recipe_id, likes, views, shares, comments, is_featured, posted_by")

            # Filter out soft-deleted recipes
            community_query = community_query.not_.like("posted_by", "deleted_%")

            if user_id:
                # Convert user_id to string for comparison (posted_by is now TEXT)
                community_query = community_query.eq("posted_by", str(user_id))

            community_result = community_query.execute()

            if not community_result.data:
                return {
                    "recipes": [],
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "has_more": False
                }

            # Create a map of recipe_id -> community data
            community_map = {}
            recipe_ids = []
            for comm in community_result.data:
                recipe_id = comm.get("recipe_id")
                if recipe_id:
                    recipe_ids.append(recipe_id)
                    community_map[recipe_id] = comm

            if not recipe_ids:
                return {
                    "recipes": [],
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "has_more": False
                }

            # Step 2: Get recipes for these recipe_ids
            # Supabase .in_() method can handle up to 1000 items, but we'll batch if needed
            # For now, assume recipe_ids is reasonable size
            recipes_query = self.supabase.table("recipes").select("*").eq("is_public", True)

            # Use .in_() for filtering by recipe_ids
            if len(recipe_ids) <= 1000:
                recipes_query = recipes_query.in_("id", recipe_ids)
            else:
                # If too many IDs, process in batches (unlikely but handle it)
                recipe_ids = recipe_ids[:1000]
                recipes_query = recipes_query.in_("id", recipe_ids)

            # Filter by tags if provided
            if tags and len(tags) > 0:
                # Supabase supports array overlap with @> operator, but Python client uses contains
                # We'll filter after fetching
                pass

            recipes_result = recipes_query.execute()

            if not recipes_result.data:
                return {
                    "recipes": [],
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "has_more": False
                }

            # Step 3: Combine recipes with community data
            recipes_data = []
            for recipe in recipes_result.data:
                recipe_id = recipe.get("id")
                if recipe_id in community_map:
                    recipe["_community"] = community_map[recipe_id]
                    recipes_data.append(recipe)

            # Step 4: Filter by tags if provided
            if tags and len(tags) > 0:
                recipes_data = [
                    r for r in recipes_data
                    if r.get("tags") and any(tag in (r.get("tags") or []) for tag in tags)
                ]

            # Step 5: Apply search filter if provided
            if search and search.strip():
                search_lower = search.strip().lower()
                recipes_data = [
                    r for r in recipes_data
                    if (r.get("title", "").lower().find(search_lower) >= 0 or
                        r.get("description", "").lower().find(search_lower) >= 0 or
                        any(tag.lower().find(search_lower) >= 0 for tag in (r.get("tags") or [])))
                ]

            # Step 6: Get user profiles for posted_by user_ids
            user_ids = set()
            for recipe in recipes_data:
                community = recipe.get("_community", {})
                posted_by = community.get("posted_by")
                if posted_by:
                    user_ids.add(posted_by)

            profiles_map = {}
            if user_ids:
                profiles_result = self.supabase.table("profiles").select("user_id, full_name, avatar_url").in_("user_id", list(user_ids)).execute()
                if profiles_result.data:
                    for profile in profiles_result.data:
                        profiles_map[profile.get("user_id")] = profile

            # Step 7: Apply sorting
            if sort == "newest":
                recipes_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            elif sort == "trending":
                # Calculate trending score: (likes*2 + shares*1.5 + comments*1) / (hours_since_created + 1)
                import time
                current_time = time.time()
                for recipe in recipes_data:
                    community = recipe.get("_community", {})
                    likes = community.get("likes", 0)
                    shares = community.get("shares", 0)
                    comments = community.get("comments", [])
                    comments_count = len(comments) if isinstance(comments, list) else 0

                    created_at = recipe.get("created_at", "")
                    if created_at:
                        try:
                            from datetime import datetime
                            created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                            hours_since = (current_time - created_dt.timestamp()) / 3600
                        except:
                            hours_since = 0
                    else:
                        hours_since = 0

                    engagement = (likes * 2 + shares * 1.5 + comments_count * 1)
                    trending_score = engagement / (hours_since + 1) if hours_since >= 0 else engagement
                    recipe["_trending_score"] = trending_score

                recipes_data.sort(key=lambda x: x.get("_trending_score", 0), reverse=True)
            elif sort == "popular":
                # Calculate engagement score: likes*2 + views*0.3 + shares*1.5 + comments*1
                for recipe in recipes_data:
                    community = recipe.get("_community", {})
                    likes = community.get("likes", 0)
                    views = community.get("views", 0)
                    shares = community.get("shares", 0)
                    comments = community.get("comments", [])
                    comments_count = len(comments) if isinstance(comments, list) else 0

                    engagement_score = (likes * 2 + views * 0.3 + shares * 1.5 + comments_count * 1)
                    recipe["_engagement_score"] = engagement_score

                recipes_data.sort(key=lambda x: x.get("_engagement_score", 0), reverse=True)

            # Step 8: Get total count before pagination
            total = len(recipes_data)

            # Step 9: Apply pagination
            paginated_recipes = recipes_data[offset:offset + limit]

            # Step 10: Transform recipes to frontend format
            transformed_recipes = []
            for recipe in paginated_recipes:
                community = recipe.get("_community", {})
                posted_by_id = community.get("posted_by") or recipe.get("user_id")
                profile = profiles_map.get(posted_by_id, {}) if posted_by_id else {}

                comments = community.get("comments", [])
                comments_count = len(comments) if isinstance(comments, list) else 0

                transformed_recipe = {
                    "id": recipe.get("id"),
                    "title": recipe.get("title", ""),
                    "description": recipe.get("description", ""),
                    "image_url": recipe.get("image_url"),
                    "tags": recipe.get("tags", []),
                    "prep_time": recipe.get("prep_time"),
                    "cook_time": recipe.get("cook_time"),
                    "serving_size": recipe.get("serving_size"),
                    "nutrition": recipe.get("nutrition", {}),
                    "ingredients": recipe.get("ingredients", []),
                    "steps": recipe.get("steps", []),
                    "is_public": recipe.get("is_public", False),
                    "created_at": recipe.get("created_at"),
                    "likes": community.get("likes", 0),
                    "views": community.get("views", 0),
                    "shares": community.get("shares", 0),
                    "comments_count": comments_count,
                    "featured": community.get("is_featured", False),
                    "is_ai_generated": recipe.get("is_ai_generated", False),
                    "posted_by": {
                        "id": posted_by_id,
                        "name": profile.get("full_name", "Unknown"),
                        "avatar": profile.get("avatar_url")
                    } if posted_by_id else None
                }
                transformed_recipes.append(transformed_recipe)

            has_more = (offset + limit) < total

            return {
                "recipes": transformed_recipes,
                "page": page,
                "limit": limit,
                "total": total,
                "has_more": has_more
            }
        
        except Exception as e:
            raise Exception(f"Error fetching community recipes: {str(e)}")
    
    def get_recent_step_by_step_recipes(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get recent recipes from user_recipe_actions where action_type='step-by-step'
        
        Args:
            user_id: UUID of the user
            limit: Maximum number of recipes to return (default: 5)
        
        Returns:
            List of recipe dictionaries with: id, title, image_url, description, meal_type, created_at
        """
        try:
            # Prefer RPC to fetch joined data in one call
            try:
                rpc_response = self.supabase.rpc(
                    "rpc_get_recent_step_by_step",
                    {"user_id": user_id, "p_limit": limit}
                ).execute()

                if rpc_response.data:
                    return rpc_response.data
            except Exception as rpc_err:
                print(f"[rpc_get_recent_step_by_step] RPC failed, falling back. Error: {rpc_err}")

            # Fallback to previous Python-side logic
            result = self.supabase.table("user_recipe_actions").select("*").eq("user_id", user_id).eq("action_type", "step-by-step").order("created_at", desc=True).limit(limit).execute()

            if not result.data:
                return []

            # Fetch full recipes for each action
            recipes = []
            for action in result.data:
                recipe_id = action.get("recipe_id")
                if not recipe_id:
                    continue  # Skip if recipe_id is null

                # Fetch full recipe from recipes table
                recipe = self.get_recipe(recipe_id)
                if not recipe:
                    continue  # Skip if recipe doesn't exist

                # Extract meal_type from recipe data (could be in tags or metadata)
                meal_type = None
                recipe_data = recipe.get("data", {})
                if isinstance(recipe_data, dict):
                    # Try to get meal_type from various possible locations
                    meal_type = recipe_data.get("meal_type") or recipe_data.get("tags", [])
                    if isinstance(meal_type, list) and len(meal_type) > 0:
                        # If tags is a list, try to find meal type in tags
                        meal_type_tags = [tag for tag in meal_type if isinstance(tag, str) and any(mt in tag.lower() for mt in ["breakfast", "lunch", "dinner", "snack", "dessert"])]
                        meal_type = meal_type_tags[0] if meal_type_tags else None

                # Build recipe dictionary
                recipe_dict = {
                    "id": recipe_id,
                    "title": recipe.get("title", ""),
                    "image_url": recipe.get("image_url"),
                    "description": recipe.get("description", ""),
                    "meal_type": meal_type or "Other",
                    "created_at": recipe.get("created_at") or action.get("created_at")
                }

                recipes.append(recipe_dict)

            return recipes
        
        except Exception as e:
            # If table doesn't exist or error occurs, return empty list
            if "does not exist" in str(e).lower() or "relation" in str(e).lower():
                return []
            print(f"Error fetching recent step-by-step recipes: {str(e)}")
            return []
    
    def upload_image_to_storage(self, file_bytes: bytes, filename: str, bucket: str = "recipe-images") -> str:
        """
        Upload an image file to Supabase Storage
        
        Args:
            file_bytes: Image file as bytes
            filename: Name for the uploaded file
            bucket: Storage bucket name (default: "recipe-images")
        
        Returns:
            Public URL of the uploaded image
        """
        try:
            import uuid
            
            # Generate unique filename
            file_ext = filename.split('.')[-1] if '.' in filename else 'jpg'
            unique_filename = f"{uuid.uuid4()}.{file_ext}"
            
            # Determine content type
            content_type_map = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp'
            }
            content_type = content_type_map.get(file_ext.lower(), 'image/jpeg')
            
            # Upload to Supabase Storage
            # The upload method signature: upload(path, file, file_options=None)
            result = self.supabase.storage.from_(bucket).upload(
                unique_filename,
                file_bytes,
                file_options={"content-type": content_type, "upsert": "false"}
            )
            
            # Check for upload errors - Supabase Python client returns a response object
            # The response has .data and .error attributes
            if hasattr(result, 'error') and result.error:
                error_msg = str(result.error) if result.error else "Unknown upload error"
                raise Exception(f"Storage upload error: {error_msg}")
            
            # Get public URL - Supabase Python client's get_public_url returns a dict
            public_url_response = self.supabase.storage.from_(bucket).get_public_url(unique_filename)
            
            # The get_public_url returns a dict with 'publicUrl' key in Python client
            if isinstance(public_url_response, dict):
                public_url = public_url_response.get('publicUrl', '')
                if not public_url:
                    # Try alternative key names
                    public_url = public_url_response.get('public_url', '') or public_url_response.get('url', '')
                if public_url:
                    return public_url
            elif isinstance(public_url_response, str):
                # Remove trailing ? if present
                clean_url = public_url_response.rstrip('?')
                return clean_url
            
            # Fallback: construct URL manually
            supabase_url = os.getenv("SUPABASE_URL", "https://pwetplmlfkbtocpmiwwy.supabase.co")
            fallback_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{unique_filename}"
            return fallback_url
        
        except Exception as e:
            raise Exception(f"Error uploading image to storage: {str(e)}")
    
    def upload_base64_image_to_storage(self, image_base64: str, filename: str = None, bucket: str = "recipe-images") -> str:
        """
        Upload a base64-encoded image to Supabase Storage
        
        Args:
            image_base64: Base64-encoded image string (with or without data URL prefix)
            filename: Optional filename (will generate UUID if not provided)
            bucket: Storage bucket name (default: "recipe-images")
        
        Returns:
            Public URL of the uploaded image
        """
        try:
            import base64
            import uuid
            
            # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,...")
            if image_base64.startswith("data:image"):
                image_base64 = image_base64.split(",")[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(image_base64)
            
            # Generate filename if not provided
            if not filename:
                unique_filename = f"{uuid.uuid4()}.jpg"
            else:
                # Ensure filename has extension
                file_ext = filename.split('.')[-1] if '.' in filename else 'jpg'
                unique_filename = f"{uuid.uuid4()}.{file_ext}"
            
            # Upload to storage
            return self.upload_image_to_storage(image_bytes, unique_filename, bucket)
        
        except Exception as e:
            raise Exception(f"Error uploading base64 image to storage: {str(e)}")
    
    def update_recipe_image_url(self, recipe_id: str, image_url: str) -> Dict[str, Any]:
        """
        Update a recipe's image_url in the database
        
        Args:
            recipe_id: ID of the recipe to update
            image_url: Public URL of the image in Supabase Storage
        
        Returns:
            Updated recipe data
        """
        try:
            result = self.supabase.table("recipes").update({
                "image_url": image_url
            }).eq("id", recipe_id).execute()
            
            if result.data:
                return result.data[0]
            else:
                raise Exception("Failed to update recipe image_url")
        except Exception as e:
            raise Exception(f"Error updating recipe image_url: {str(e)}")
    
    def save_recipe_progress(
        self,
        user_id: str,
        recipe_id: str,
        current_index: int,
        timestamp: int,
        local_state: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save user's progress in a recipe (for Feast Guide)
        
        Args:
            user_id: UUID of the user
            recipe_id: UUID of the recipe
            current_index: Current step index (0-based)
            timestamp: Unix timestamp of when progress was saved
            local_state: Optional local state data (e.g., completed steps)
        
        Returns:
            Dictionary with saved progress data
        """
        try:
            # Store progress in user_recipe_actions table with action_type 'progress'
            progress_data = {
                "user_id": user_id,
                "recipe_id": recipe_id,
                "action_type": "progress",
                "metadata": {
                    "current_index": current_index,
                    "timestamp": timestamp,
                    "local_state": local_state or {},
                }
            }
            
            # Check if progress entry exists
            existing = self.supabase.table("user_recipe_actions").select("*").eq("user_id", user_id).eq("recipe_id", recipe_id).eq("action_type", "progress").execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing progress
                result = self.supabase.table("user_recipe_actions").update(progress_data).eq("user_id", user_id).eq("recipe_id", recipe_id).eq("action_type", "progress").execute()
            else:
                # Create new progress entry
                result = self.supabase.table("user_recipe_actions").insert(progress_data).execute()
            
            return result.data[0] if result.data else {}
        except Exception as e:
            raise Exception(f"Error saving recipe progress: {str(e)}")
    
    def get_recipe_progress(
        self,
        user_id: str,
        recipe_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get user's saved progress for a recipe
        
        Args:
            user_id: UUID of the user
            recipe_id: UUID of the recipe
        
        Returns:
            Dictionary with progress data or None if not found
        """
        try:
            result = self.supabase.table("user_recipe_actions").select("*").eq("user_id", user_id).eq("recipe_id", recipe_id).eq("action_type", "progress").execute()
            
            if result.data and len(result.data) > 0:
                metadata = result.data[0].get("metadata", {})
                return {
                    "current_index": metadata.get("current_index", 0),
                    "timestamp": metadata.get("timestamp", 0),
                    "local_state": metadata.get("local_state", {}),
                }
            return None
        except Exception as e:
            raise Exception(f"Error fetching recipe progress: {str(e)}")
    
    def is_admin_user(self, user_id: str) -> bool:
        """
        Check if a user is an admin by checking admin_users table
        
        Args:
            user_id: UUID of the user
            
        Returns:
            True if user is admin, False otherwise
        """
        try:
            result = self.supabase.table("admin_users").select("id").eq("id", user_id).execute()
            return result.data is not None and len(result.data) > 0
        except Exception as e:
            print(f"Error checking admin status: {str(e)}")
            return False
    
    def get_admin_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get admin user data from admin_users table
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Dictionary containing admin user data or None if not found
        """
        try:
            print(f"[DEBUG] get_admin_user: Fetching admin user for user_id={user_id}")
            result = self.supabase.table("admin_users").select("*").eq("id", user_id).execute()
            print(f"[DEBUG] get_admin_user: Query result data={result.data}")
            if result.data and len(result.data) > 0:
                admin_user = result.data[0]
                print(f"[DEBUG] get_admin_user: Found admin user: {admin_user}")
                print(f"[DEBUG] get_admin_user: assigned_sections in result: {admin_user.get('assigned_sections')}")
                print(f"[DEBUG] get_admin_user: assigned_sections type: {type(admin_user.get('assigned_sections'))}")
                return admin_user
            print(f"[DEBUG] get_admin_user: No admin user found")
            return None
        except Exception as e:
            print(f"[DEBUG] get_admin_user: Error fetching admin user: {str(e)}")
            import traceback
            print(f"[DEBUG] get_admin_user: Traceback: {traceback.format_exc()}")
            return None
    
    def log_admin_action(
        self,
        admin_id: str,
        action_type: str,
        target_type: str,
        target_id: Optional[str] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Log an admin action to admin_actions table
        
        Args:
            admin_id: UUID of the admin performing the action
            action_type: Type of action (e.g., 'suspend_user', 'delete_recipe')
            target_type: Type of target ('user', 'recipe', 'community')
            target_id: UUID of the target (optional)
            reason: Reason for the action (optional)
            metadata: Additional metadata as JSON object (optional)
            
        Returns:
            Dictionary containing the logged action data
        """
        try:
            action_data = {
                "admin_id": admin_id,
                "action_type": action_type,
                "target_type": target_type,
                "metadata": metadata if metadata else {}
            }
            
            if target_id:
                action_data["target_id"] = target_id
            if reason:
                action_data["reason"] = reason
            
            result = self.supabase.table("admin_actions").insert(action_data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to log admin action: No data returned")
        
        except Exception as e:
            # Don't fail the main operation if logging fails
            print(f"Warning: Failed to log admin action: {str(e)}")
            return {}


# Global instance - will be initialized lazily when first accessed
_db_service_instance: Optional[DatabaseService] = None

def get_db_service() -> DatabaseService:
    """Get or create the global database service instance"""
    global _db_service_instance
    if _db_service_instance is None:
        _db_service_instance = DatabaseService()
    return _db_service_instance

# For backward compatibility, create a property-like accessor
class DBServiceProxy:
    """Proxy to access database service methods"""
    def __getattr__(self, name):
        return getattr(get_db_service(), name)

db_service = DBServiceProxy()