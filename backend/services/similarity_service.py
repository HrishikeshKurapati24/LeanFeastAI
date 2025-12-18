"""
Similarity service for finding similar recipes using Pinecone vector database
Uses semantic embeddings (all-mpnet-base-v2) for better recipe matching
Optimized with retry logic, batch operations, and efficient filtering
"""
import time
from typing import List, Dict, Any, Optional, Set
from services.vector_store import get_pinecone_index, encode_text, encode_texts
from services.database_service import DatabaseService

class SimilarityService:
    """
    Service for finding similar recipes using Pinecone vector database and semantic embeddings.
    Provides semantic search capabilities with user preference prioritization.
    Optimized for performance with retry logic and batch operations.
    """
    
    def __init__(self):
        """Initialize the similarity service"""
        try:
            # Initialize Pinecone index (will create if doesn't exist)
            self.index = get_pinecone_index()
            # Similarity threshold for filtering results (0.5 as per requirements)
            self.similarity_threshold = 0.75
            print("SimilarityService initialized with Pinecone (optimized)")
        except Exception as e:
            print(f"Warning: Failed to initialize Pinecone index: {str(e)}")
            self.index = None
            self.similarity_threshold = 0.75
    
    def _create_recipe_text(self, recipe: Dict[str, Any]) -> str:
        """
        Create a text representation of a recipe for embedding
        
        Args:
            recipe: Recipe dictionary
            
        Returns:
            Combined text string of recipe content
        """
        title = recipe.get("title", "")
        description = recipe.get("description", "")
        
        # Handle ingredients (can be list of strings or list of dicts)
        ingredients = recipe.get("ingredients", [])
        if ingredients and isinstance(ingredients[0], dict):
            ingredient_names = [ing.get("name", "") for ing in ingredients]
        else:
            ingredient_names = ingredients if isinstance(ingredients, list) else []
        
        # Handle steps (can be list of strings or list of dicts)
        steps = recipe.get("steps", [])
        if steps and isinstance(steps[0], dict):
            step_instructions = [step.get("instruction", "") for step in steps]
        else:
            step_instructions = steps if isinstance(steps, list) else []
        
        tags = recipe.get("tags", [])
        tags_text = " ".join(tags) if isinstance(tags, list) else str(tags)
        
        # Combine all text fields
        recipe_text = f"{title} {description} {' '.join(ingredient_names)} {' '.join(step_instructions)} {tags_text}"
        return recipe_text.strip()
    
    def find_similar_recipes(
        self, 
        query_text: str, 
        top_k: int = 5, 
        user_id: Optional[str] = None, 
        db_service: Optional[DatabaseService] = None
    ) -> List[Dict[str, Any]]:
        """
        Find similar recipes using Pinecone semantic search.
        Prioritizes user's liked or saved recipes if user_id is provided.
        
        Args:
            query_text: Search query (meal name + description)
            top_k: Number of similar recipes to return
            user_id: Optional user ID to prioritize their liked/saved recipes
            db_service: Optional database service instance to fetch user profile
        
        Returns:
            List of similar recipes with similarity scores, prioritized by user preferences
        """
        if not self.index:
            print("Pinecone index not available, returning empty results")
            return []
        
        print(f"Searching for similar recipes with query: {query_text[:100]}...")
        
        try:
            # Get user's liked and saved recipe IDs if user_id is provided
            user_liked_recipe_ids = set()
            user_saved_recipe_ids = set()
            if user_id and db_service:
                try:
                    user_profile = db_service.get_profile(user_id)
                    if user_profile:
                        user_liked_recipe_ids = set(user_profile.get("liked_recipes", []) or [])
                        user_saved_recipe_ids = set(user_profile.get("saved_recipes", []) or [])
                        print(f"User has {len(user_liked_recipe_ids)} liked recipes and {len(user_saved_recipe_ids)} saved recipes")
                except Exception as e:
                    print(f"Error fetching user profile for prioritization: {str(e)}")
            
            # Encode query text to embedding
            query_embedding = encode_text(query_text)
            
            # Query Pinecone with retry logic
            # Fetch more results to account for filtering by threshold and user prioritization
            fetch_k = min(max(top_k * 4, 20), 100)  # Fetch 4x top_k or at least 20, max 100
            max_retries = 2
            query_response = None
            
            for attempt in range(max_retries):
                try:
                    query_response = self.index.query(
                        vector=query_embedding,
                        top_k=fetch_k,
                        include_metadata=True
                    )
                    break
                except Exception as e:
                    print(f"Pinecone query error (attempt {attempt + 1}): {str(e)}")
                    if attempt < max_retries - 1:
                        time.sleep(1)
                        continue
                    raise
            
            if not query_response:
                print("Failed to query Pinecone after retries")
                return []
            
            # Process results
            matches = query_response.get("matches", [])
            if not matches:
                print("No similar recipes found in Pinecone")
                return []
            
            # Filter by similarity threshold (0.5) and format results
            results = []
            for match in matches:
                score = match.get("score", 0.0)
                
                # Filter by similarity threshold (0.5 as per requirements)
                if score < self.similarity_threshold:
                    continue
                
                metadata = match.get("metadata", {})
                recipe_id = metadata.get("id") or match.get("id")
                
                if not recipe_id:
                    continue
                
                # Build recipe dict from metadata
                recipe = {
                    "id": recipe_id,
                    "title": metadata.get("title", ""),
                    "description": metadata.get("description", ""),
                    "ingredients": metadata.get("ingredients", []),
                    "steps": metadata.get("steps", []),
                    "tags": metadata.get("tags", []),
                    "meal_type": metadata.get("meal_type", "Dinner"),
                    "prep_time": metadata.get("prep_time"),
                    "cook_time": metadata.get("cook_time"),
                    "serving_size": metadata.get("serving_size", 1),
                    "similarity_score": float(score),
                    "is_user_saved": recipe_id in user_saved_recipe_ids,
                    "is_user_liked": recipe_id in user_liked_recipe_ids,
                }
                
                results.append(recipe)
            
            # Prioritize user's liked/saved recipes
            # Sort by: user saved > user liked > similarity score (descending)
            # Use tuple comparison for efficient sorting
            if user_id and (user_saved_recipe_ids or user_liked_recipe_ids):
                # Only sort if user has preferences
                results.sort(
                    key=lambda r: (
                        0 if r.get("is_user_saved") else (1 if r.get("is_user_liked") else 2),
                        r.get("similarity_score", 0.0)
                    ),
                    reverse=True
                )
            else:
                # No user preferences, just sort by similarity score
                results.sort(key=lambda r: r.get("similarity_score", 0.0), reverse=True)
            
            # Return top_k results
            top_results = results[:top_k]
            
            print(f"Found {len(top_results)} similar recipes (filtered from {len(matches)} matches)")
            if top_results:
                print(f"Top match score: {top_results[0]['similarity_score']:.4f} - {top_results[0]['title']}")
                if user_id:
                    user_prioritized_count = sum(1 for r in top_results if r.get('is_user_saved') or r.get('is_user_liked'))
                    print(f"User-prioritized recipes in results: {user_prioritized_count}/{len(top_results)}")
            
            return top_results
            
        except Exception as e:
            print(f"Error in Pinecone similarity search: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    
    def recipe_exists_in_pinecone(self, recipe_id: str) -> bool:
        """
        Check if a recipe with the given ID already exists in Pinecone
        
        Args:
            recipe_id: Recipe ID to check
        
        Returns:
            True if recipe exists, False otherwise
        """
        if not self.index:
            return False
        
        max_retries = 2
        for attempt in range(max_retries):
            try:
                # Use fetch to get the vector by ID
                fetch_response = self.index.fetch(ids=[recipe_id])
                vectors = fetch_response.get("vectors", {})
                return recipe_id in vectors
            except Exception as e:
                print(f"Error checking if recipe exists in Pinecone (attempt {attempt + 1}): {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(0.5)
                    continue
                return False
        return False
    
    def recipes_exist_in_pinecone(self, recipe_ids: List[str]) -> Set[str]:
        """
        Batch check if multiple recipes exist in Pinecone (more efficient than individual checks)
        
        Args:
            recipe_ids: List of recipe IDs to check
        
        Returns:
            Set of recipe IDs that exist in Pinecone
        """
        if not self.index or not recipe_ids:
            return set()
        
        max_retries = 2
        for attempt in range(max_retries):
            try:
                # Batch fetch (Pinecone supports up to 1000 IDs per fetch)
                batch_size = 1000
                existing_ids = set()
                
                for i in range(0, len(recipe_ids), batch_size):
                    batch = recipe_ids[i:i + batch_size]
                    fetch_response = self.index.fetch(ids=batch)
                    vectors = fetch_response.get("vectors", {})
                    existing_ids.update(vectors.keys())
                
                return existing_ids
            except Exception as e:
                print(f"Error batch checking recipes in Pinecone (attempt {attempt + 1}): {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(0.5)
                    continue
                return set()
        return set()
    
    def index_recipe(self, recipe: Dict[str, Any]) -> None:
        """
        Index a recipe in Pinecone vector database
        
        Args:
            recipe: Recipe dictionary with all required fields
        """
        if not self.index:
            print("Pinecone index not available, cannot index recipe")
            return
        
        # Ensure recipe has an ID
        recipe_id = recipe.get("id")
        if not recipe_id:
            print("Recipe missing ID, cannot index")
            return
        
        # Check if recipe already exists
        if self.recipe_exists_in_pinecone(recipe_id):
            print(f"Recipe {recipe_id} already exists in Pinecone, skipping")
            return
        
        try:
            print(f"Indexing recipe to Pinecone: {recipe.get('title', 'Unknown')}")
            
            # Create text representation for embedding
            recipe_text = self._create_recipe_text(recipe)
            
            # Generate embedding
            embedding = encode_text(recipe_text)
            
            # Prepare metadata (store all recipe fields)
            # Pinecone metadata values cannot be None, must be string, number, boolean, or list of strings
            metadata = {
                "id": recipe_id,
                "title": recipe.get("title") or "",
                "description": recipe.get("description") or "",
                "ingredients": recipe.get("ingredients") or [],
                "steps": recipe.get("steps") or [],
                "tags": recipe.get("tags") or [],
                "meal_type": recipe.get("meal_type") or "Dinner",
                "prep_time": recipe.get("prep_time") or 0,
                "cook_time": recipe.get("cook_time") or 0,
                "serving_size": recipe.get("serving_size") or 1,
            }
            
            # Upsert to Pinecone with retry logic
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    self.index.upsert(
                        vectors=[{
                            "id": recipe_id,
                            "values": embedding,
                            "metadata": metadata
                        }]
                    )
                    print(f"Recipe indexed successfully: {recipe_id}")
                    return
                except Exception as e:
                    print(f"Error indexing recipe to Pinecone (attempt {attempt + 1}): {str(e)}")
                    if attempt < max_retries - 1:
                        time.sleep(1)
                        continue
                    raise
            
        except Exception as e:
            print(f"Error indexing recipe to Pinecone: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def index_recipes_batch(self, recipes: List[Dict[str, Any]], batch_size: int = 100, force_reindex: bool = False) -> None:
        """
        Index multiple recipes to Pinecone in batches
        
        Args:
            recipes: List of recipe dictionaries
            batch_size: Number of recipes to index per batch (default 100)
            force_reindex: If True, overwrite existing recipes
        """
        if not self.index:
            print("Pinecone index not available, cannot index recipes")
            return
        
        if not recipes:
            print("No recipes to index")
            return
        
        print(f"Indexing {len(recipes)} recipes to Pinecone in batches of {batch_size}")
        
        total_indexed = 0
        total_skipped = 0
        
        for i in range(0, len(recipes), batch_size):
            batch = recipes[i:i + batch_size]
            
            try:
                # Prepare vectors for this batch
                vectors_to_upsert = []
                recipe_texts = []
                batch_recipe_ids = []
                
                # First, collect all recipe IDs for batch existence check
                for recipe in batch:
                    recipe_id = recipe.get("id")
                    if recipe_id:
                        batch_recipe_ids.append(recipe_id)
                
                # Batch check which recipes already exist (more efficient)
                existing_ids = set()
                if not force_reindex:
                    existing_ids = self.recipes_exist_in_pinecone(batch_recipe_ids) if batch_recipe_ids else set()
                
                for recipe in batch:
                    recipe_id = recipe.get("id")
                    if not recipe_id:
                        continue
                    
                    # Skip if already exists (from batch check)
                    if recipe_id in existing_ids:
                        total_skipped += 1
                        continue
                    
                    # Create text representation
                    recipe_text = self._create_recipe_text(recipe)
                    recipe_texts.append(recipe_text)
                    
                    # Prepare metadata
                    # Pinecone metadata values cannot be None
                    metadata = {
                        "id": recipe_id,
                        "title": recipe.get("title") or "",
                        "description": recipe.get("description") or "",
                        "ingredients": recipe.get("ingredients") or [],
                        "steps": recipe.get("steps") or [],
                        "tags": recipe.get("tags") or [],
                        "meal_type": recipe.get("meal_type") or "Dinner",
                        "prep_time": recipe.get("prep_time") or 0,
                        "cook_time": recipe.get("cook_time") or 0,
                        "serving_size": recipe.get("serving_size") or 1,
                    }
                    
                    vectors_to_upsert.append({
                        "id": recipe_id,
                        "metadata": metadata
                    })
                
                if not vectors_to_upsert:
                    continue
                
                # Generate embeddings for all texts in batch
                embeddings = encode_texts(recipe_texts)
                
                # Add embeddings to vectors
                for idx, vector_data in enumerate(vectors_to_upsert):
                    vector_data["values"] = embeddings[idx]
                
                # Upsert batch to Pinecone with retry logic
                max_retries = 2
                for attempt in range(max_retries):
                    try:
                        self.index.upsert(vectors=vectors_to_upsert)
                        total_indexed += len(vectors_to_upsert)
                        print(f"Indexed batch {i // batch_size + 1}: {len(vectors_to_upsert)} recipes (total: {total_indexed})")
                        break
                    except Exception as e:
                        print(f"Error upserting batch {i // batch_size + 1} (attempt {attempt + 1}): {str(e)}")
                        if attempt < max_retries - 1:
                            time.sleep(1)
                            continue
                        raise
                
            except Exception as e:
                print(f"Error indexing batch {i // batch_size + 1}: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"Batch indexing complete: {total_indexed} indexed, {total_skipped} skipped")
    
    def migrate_all_recipes_from_supabase(self, db_service: DatabaseService, force_reindex: bool = False) -> None:
        """
        Fetch all recipes from Supabase and index them to Pinecone
        This is used for initial migration or re-indexing
        
        Args:
            db_service: DatabaseService instance to fetch recipes
            force_reindex: If True, overwrite existing recipes
        """
        if not self.index:
            print("Pinecone index not available, cannot migrate recipes")
            return
        
        print("Starting migration of all recipes from Supabase to Pinecone...")
        
        try:
            # Fetch all recipes from Supabase
            result = db_service.supabase.table("recipes").select("*").execute()
            
            if not result.data:
                print("No recipes found in Supabase database")
                return
            
            recipes = result.data
            print(f"Found {len(recipes)} recipes in Supabase database")
            
            # Format recipes for indexing
            formatted_recipes = []
            for recipe in recipes:
                recipe_id = recipe.get("id")
                if not recipe_id:
                    continue
                
                # Format ingredients
                ingredients = recipe.get("ingredients", [])
                if ingredients and isinstance(ingredients[0], dict):
                    ingredient_names = [ing.get("name", "") for ing in ingredients]
                else:
                    ingredient_names = ingredients if isinstance(ingredients, list) else []
                
                # Format steps
                steps = recipe.get("steps", [])
                if steps and isinstance(steps[0], dict):
                    step_instructions = [step.get("instruction", "") for step in steps]
                else:
                    step_instructions = steps if isinstance(steps, list) else []
                
                formatted_recipe = {
                    "id": recipe_id,
                    "title": recipe.get("title", ""),
                    "description": recipe.get("description", ""),
                    "ingredients": ingredient_names,
                    "steps": step_instructions,
                    "tags": recipe.get("tags", []),
                    "meal_type": recipe.get("meal_type", "Dinner"),
                    "prep_time": recipe.get("prep_time"),
                    "cook_time": recipe.get("cook_time"),
                    "serving_size": recipe.get("serving_size", 1),
                }
                
                formatted_recipes.append(formatted_recipe)
            
            # Index all recipes in batches
            self.index_recipes_batch(formatted_recipes, batch_size=100, force_reindex=force_reindex)
            
            print(f"Migration complete: {len(formatted_recipes)} recipes processed")
            
        except Exception as e:
            print(f"Error migrating recipes from Supabase: {str(e)}")
            import traceback
            traceback.print_exc()


# Global instance
similarity_service = SimilarityService()
