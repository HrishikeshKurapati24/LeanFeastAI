"""
Vector store service for Pinecone integration
Handles Pinecone client initialization, index management, and embeddings
"""
import os
from typing import Optional, List, Any
from pinecone import Pinecone, ServerlessSpec
from pinecone import Index

# Pinecone configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "leanfeast-recipes"
DIMENSION = 768  # all-mpnet-base-v2 embedding dimension
METRIC = "cosine"

# Global Pinecone client instance
_pinecone_client: Optional[Pinecone] = None
_index: Optional[Index] = None


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


# Global embedding model instance
_embedding_model: Optional[Any] = None
EMBEDDING_MODEL_NAME = "models/text-embedding-004"


def get_embedding_model():
    """
    Load and return the Google Gemini embedding model instance (singleton)
    Uses models/text-embedding-004 which produces 768-dimensional embeddings
    
    Returns:
        GoogleGenerativeAIEmbeddings model instance
    """
    global _embedding_model
    
    if _embedding_model is None:
        try:
            print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable is required for embeddings")
                
            _embedding_model = GoogleGenerativeAIEmbeddings(
                model=EMBEDDING_MODEL_NAME,
                google_api_key=api_key,
                task_type="retrieval_document"
            )
            print(f"Embedding model loaded successfully (Google Gemini)")
        except Exception as e:
            print(f"Error loading embedding model: {str(e)}")
            raise
    
    return _embedding_model


def encode_text(text: str) -> List[float]:
    """
    Generate embedding for a single text string using Gemini API
    
    Args:
        text: Text to encode
        
    Returns:
        List of floats representing the embedding vector (768 dimensions)
    """
    model = get_embedding_model()
    try:
        # Use embed_query for single text
        return model.embed_query(text)
    except Exception as e:
        print(f"Error encoding text: {str(e)}")
        raise


def encode_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple text strings (batch encoding) using Gemini API
    
    Args:
        texts: List of texts to encode
        
    Returns:
        List of embedding vectors (each is a list of 768 floats)
    """
    model = get_embedding_model()
    try:
        # Use embed_documents for batch texts
        return model.embed_documents(texts)
    except Exception as e:
        print(f"Error encoding texts: {str(e)}")
        raise


def reset_index() -> None:
    """
    Reset the global index instance (useful for testing or reconnection)
    """
    global _index
    _index = None

