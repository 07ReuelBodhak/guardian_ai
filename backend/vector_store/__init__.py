"""
ChromaDB Vector Store wrapper for Guardian AI.

Uses ChromaDB's built-in embedding model (onnxruntime-based all-MiniLM-L6-v2).
No external API calls needed for embeddings — runs 100% locally.

The collection is persisted to `backend/vector_store/chroma_db/` so it
survives restarts.

Usage:
    from vector_store import upsert, query

    upsert("msg_abc123", "I'm feeling great today!", user_id="user123", role="user")
    results = query("happy and energetic", user_id="user123", k=5)
"""

import os
from pathlib import Path
import chromadb

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
    _collection = _client.get_or_create_collection(
        name="guardian_messages",
        metadata={"hnsw:space": "cosine"}  # cosine similarity
    )
    return _collection


def upsert(message_id: str, text: str, user_id: str = "", role: str = "user"):
    """
    Embed a message and store it in ChromaDB.

    Args:
        message_id: The SQLite Message.id (cuid) for this message.
        text: The raw message text to embed.
        user_id: The user's ID (for metadata filtering).
        role: "user" or "ai".
    """
    collection = _get_collection()

    collection.upsert(
        ids=[message_id],
        documents=[text],
        metadatas=[{
            "user_id": user_id,
            "role": role
        }]
    )


def query(query_text: str, user_id: str = None, k: int = 5) -> list[dict]:
    """
    Find the k most similar messages to query_text.

    Args:
        query_text: The text to search for.
        user_id: Optional — filter results to this user only.
        k: Number of nearest neighbors to return.

    Returns:
        A list of dicts: [{"id": str, "text": str, "user_id": str, "role": str, "distance": float}, ...]
    """
    collection = _get_collection()

    if collection.count() == 0:
        return []

    # Clamp k to available docs
    actual_k = min(k, collection.count())

    # Build the query kwargs
    query_kwargs = {
        "query_texts": [query_text],
        "n_results": actual_k
    }

    # Filter by user_id if provided
    if user_id:
        query_kwargs["where"] = {"user_id": user_id}

    results = collection.query(**query_kwargs)

    # Format the results into a clean list
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
