"""
Pinecone vector database service for semantic code search
"""

from pinecone import Pinecone, ServerlessSpec
from typing import List, Dict, Optional, Any
import os
from dotenv import load_dotenv
import time

load_dotenv()


class PineconeService:
    """
    Service for managing Pinecone vector database operations
    """

    def __init__(self):
        """Initialize Pinecone client and index"""
        api_key = os.getenv("PINECONE_API_KEY")

        if not api_key:
            raise ValueError("PINECONE_API_KEY not found in environment")

        self.pc = Pinecone(api_key=api_key)
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "codestream-code-embeddings")
        self.dimension = 384  # all-MiniLM-L6-v2 dimension

        # Initialize index
        self._ensure_index_exists()
        self.index = self.pc.Index(self.index_name)

    def _ensure_index_exists(self):
        """Create Pinecone index if it doesn't exist"""
        existing_indexes = [idx.name for idx in self.pc.list_indexes()]

        if self.index_name not in existing_indexes:
            print(f"Creating Pinecone index: {self.index_name}")
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=os.getenv("PINECONE_REGION", "us-east-1")
                )
            )
            # Wait for index to be ready
            time.sleep(5)
            print(f"✅ Index {self.index_name} created successfully")

    def upsert_code(
        self,
        code_id: str,
        embedding: List[float],
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Insert or update code embedding in Pinecone

        Args:
            code_id: Unique identifier for code snippet
            embedding: 384-dimensional embedding vector
            metadata: Code metadata (language, user_id, etc.)

        Returns:
            Success boolean
        """
        try:
            self.index.upsert(
                vectors=[{
                    "id": code_id,
                    "values": embedding,
                    "metadata": metadata
                }]
            )
            return True
        except Exception as e:
            print(f"Error upserting to Pinecone: {e}")
            return False

    def upsert_batch(
        self,
        code_ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        batch_size: int = 100
    ) -> int:
        """
        Batch upsert multiple code embeddings

        Args:
            code_ids: List of unique identifiers
            embeddings: List of embedding vectors
            metadatas: List of metadata dicts
            batch_size: Number of vectors per batch

        Returns:
            Number of successfully upserted vectors
        """
        total_upserted = 0

        for i in range(0, len(code_ids), batch_size):
            batch_ids = code_ids[i:i + batch_size]
            batch_embeddings = embeddings[i:i + batch_size]
            batch_metadatas = metadatas[i:i + batch_size]

            vectors = [
                {
                    "id": code_id,
                    "values": embedding,
                    "metadata": metadata
                }
                for code_id, embedding, metadata
                in zip(batch_ids, batch_embeddings, batch_metadatas)
            ]

            try:
                self.index.upsert(vectors=vectors)
                total_upserted += len(vectors)
            except Exception as e:
                print(f"Error in batch upsert: {e}")

        return total_upserted

    def search_similar_code(
        self,
        query_embedding: List[float],
        top_k: int = 10,
        filter_dict: Optional[Dict] = None,
        include_metadata: bool = True
    ) -> List[Dict]:
        """
        Search for similar code using vector similarity

        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_dict: Metadata filters (e.g., {"language": "python"})
            include_metadata: Whether to include metadata in results

        Returns:
            List of similar code snippets with scores
        """
        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                filter=filter_dict,
                include_metadata=include_metadata
            )

            matches = []
            for match in results.matches:
                matches.append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata if include_metadata else None
                })

            return matches

        except Exception as e:
            print(f"Error searching Pinecone: {e}")
            return []

    def delete_code(self, code_id: str) -> bool:
        """
        Delete code embedding from Pinecone

        Args:
            code_id: Unique identifier

        Returns:
            Success boolean
        """
        try:
            self.index.delete(ids=[code_id])
            return True
        except Exception as e:
            print(f"Error deleting from Pinecone: {e}")
            return False

    def delete_by_filter(self, filter_dict: Dict) -> bool:
        """
        Delete vectors by metadata filter

        Args:
            filter_dict: Metadata filter (e.g., {"user_id": "123"})

        Returns:
            Success boolean
        """
        try:
            self.index.delete(filter=filter_dict)
            return True
        except Exception as e:
            print(f"Error deleting by filter: {e}")
            return False

    def get_index_stats(self) -> Dict:
        """
        Get Pinecone index statistics

        Returns:
            Dictionary with index stats
        """
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.total_vector_count,
                "dimension": stats.dimension,
                "namespaces": stats.namespaces
            }
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {}
