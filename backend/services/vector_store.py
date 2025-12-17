"""
Vector store service for Pinecone integration
Handles Pinecone client initialization, index management, and embeddings
"""
import os
from typing import Optional, List
from pinecone import Pinecone, ServerlessSpec
from pinecone import Index
from sentence_transformers import SentenceTransformer

# Pinecone configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "leanfeast-recipes"
DIMENSION = 768  # all-mpnet-base-v2 embedding dimension
METRIC = "cosine"

# Global Pinecone client instance
_pinecone_client: Optional[Pinecone] = None
_index: Optional[Index] = None

# Global embedding model instance
_embedding_model: Optional[SentenceTransformer] = None
EMBEDDING_MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"


def get_pinecone_client() -> Pinecone:
    """
    Initialize and return Pinecone client instance (singleton)
    
    Returns:
        Pinecone client instance
        
    Raises:
        ValueError: If PINECONE_API_KEY is not set
    """
    global _pinecone_client
    
    if _pinecone_client is None:
        if not PINECONE_API_KEY:
            raise ValueError(
                "PINECONE_API_KEY environment variable is required. "
                "Please set it in your .env file or environment variables."
            )
        _pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
        print(f"Pinecone client initialized")
    
    return _pinecone_client


def get_pinecone_index() -> Index:
    """
    Get or create Pinecone index for recipes (singleton)
    
    Returns:
        Pinecone Index instance
        
    Raises:
        ValueError: If PINECONE_API_KEY is not set
        Exception: If index creation fails
    """
    global _index
    
    if _index is None:
        client = get_pinecone_client()
        
        # Check if index exists
        existing_indexes = [idx.name for idx in client.list_indexes()]
        
        if INDEX_NAME not in existing_indexes:
            print(f"Creating Pinecone index '{INDEX_NAME}' with dimension {DIMENSION}")
            try:
                client.create_index(
                    name=INDEX_NAME,
                    dimension=DIMENSION,
                    metric=METRIC,
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
                print(f"Index '{INDEX_NAME}' created successfully")
            except Exception as e:
                print(f"Error creating index '{INDEX_NAME}': {str(e)}")
                # Index might already exist (race condition), try to connect anyway
                pass
        else:
            print(f"Index '{INDEX_NAME}' already exists")
        
        # Connect to index
        _index = client.Index(INDEX_NAME)
        print(f"Connected to Pinecone index '{INDEX_NAME}'")
    
    return _index


def get_embedding_model() -> SentenceTransformer:
    """
    Load and return the embedding model instance (singleton)
    Uses all-mpnet-base-v2 which produces 768-dimensional embeddings
    
    Returns:
        SentenceTransformer model instance
        
    Raises:
        Exception: If model loading fails
    """
    global _embedding_model
    
    if _embedding_model is None:
        try:
            print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
            _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
            print(f"Embedding model loaded successfully")
        except Exception as e:
            print(f"Error loading embedding model: {str(e)}")
            raise
    
    return _embedding_model


def encode_text(text: str) -> List[float]:
    """
    Generate embedding for a single text string
    
    Args:
        text: Text to encode
        
    Returns:
        List of floats representing the embedding vector (768 dimensions)
        
    Raises:
        Exception: If encoding fails
    """
    model = get_embedding_model()
    try:
        embedding = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Error encoding text: {str(e)}")
        raise


def encode_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple text strings (batch encoding)
    
    Args:
        texts: List of texts to encode
        
    Returns:
        List of embedding vectors (each is a list of 768 floats)
        
    Raises:
        Exception: If encoding fails
    """
    model = get_embedding_model()
    try:
        embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
        return embeddings.tolist()
    except Exception as e:
        print(f"Error encoding texts: {str(e)}")
        raise


def reset_index() -> None:
    """
    Reset the global index instance (useful for testing or reconnection)
    """
    global _index
    _index = None

