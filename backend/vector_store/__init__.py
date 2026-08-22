"""
ChromaDB Vector Store wrapper for Guardian AI.

Uses Cohere's Embedding API to keep local memory usage low.
The collection is persisted to `backend/vector_store/chroma_db/` so it
survives restarts.
"""

import os
from pathlib import Path
import chromadb
import chromadb.utils.embedding_functions as embedding_functions
from dotenv import load_dotenv

load_dotenv()

# Persistent storage directory
CHROMA_DIR = str(Path(__file__).parent / "chroma_db")

# Lazy-loaded client and collection
_client = None
_collection = None

def _get_collection():
    """Lazy-load the ChromaDB client and collection."""
    global _client, _collection
    if _collection is not None:
        return _collection

    _client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    # Use Cohere to avoid loading massive ONNX models into RAM
    cohere_ef = embedding_functions.CohereEmbeddingFunction(
        api_key=os.getenv("COHERE_API_KEY", ""),
        model_name="embed-english-v3.0"
    )

    _collection = _client.get_or_create_collection(
        name="guardian_messages_cohere",
        embedding_function=cohere_ef,
        metadata={"hnsw:space": "cosine"}
    )
    return _collection


def upsert(message_id: str, text: str, user_id: str = "", role: str = "user"):
    collection = _get_collection()
    
    # Cohere requires a valid API key. If it's missing, gracefully fail instead of crashing.
    if not os.getenv("COHERE_API_KEY"):
        print("[VectorStore] Warning: COHERE_API_KEY not found. Skipping upsert.")
        return

    collection.upsert(
        ids=[message_id],
        documents=[text],
        metadatas=[{
            "user_id": user_id,
            "role": role
        }]
    )


def query(query_text: str, user_id: str = None, k: int = 5) -> list[dict]:
    collection = _get_collection()

    if not os.getenv("COHERE_API_KEY") or collection.count() == 0:
        return []

    actual_k = min(k, collection.count())
    if actual_k == 0:
        return []

    query_kwargs = {
        "query_texts": [query_text],
        "n_results": actual_k
    }

    if user_id:
        query_kwargs["where"] = {"user_id": user_id}

    results = collection.query(**query_kwargs)

    output = []
    if results and results["ids"] and results["ids"][0]:
        for i, msg_id in enumerate(results["ids"][0]):
            output.append({
                "id": msg_id,
                "text": results["documents"][0][i] if results["documents"] else "",
                "user_id": results["metadatas"][0][i].get("user_id", "") if results["metadatas"] else "",
                "role": results["metadatas"][0][i].get("role", "") if results["metadatas"] else "",
                "distance": results["distances"][0][i] if results["distances"] else 0.0
            })

    return output
