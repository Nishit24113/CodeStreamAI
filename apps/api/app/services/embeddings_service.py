"""
Code embeddings service using sentence-transformers
Generates vector representations of code for semantic search
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Optional
import hashlib
import re


class EmbeddingsService:
    """
    Service for generating code embeddings using sentence-transformers
    Model: all-MiniLM-L6-v2 (384 dimensions, fast and accurate)
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize embeddings service

        Args:
            model_name: HuggingFace model name for embeddings
        """
        self.model = SentenceTransformer(model_name)
        self.dimension = 384  # all-MiniLM-L6-v2 embedding size

    def preprocess_code(self, code: str, language: str = "python") -> str:
        """
        Preprocess code for better embeddings

        Args:
            code: Raw code string
            language: Programming language

        Returns:
            Cleaned code string
        """
        # Remove excessive whitespace
        code = re.sub(r'\n\s*\n', '\n\n', code)

        # Remove long comment blocks (keep short ones for context)
        code = re.sub(r'"""[\s\S]*?"""', '', code)  # Python docstrings
        code = re.sub(r'/\*[\s\S]*?\*/', '', code)  # Multi-line comments

        # Normalize indentation
        lines = code.split('\n')
        min_indent = min([len(line) - len(line.lstrip())
                         for line in lines if line.strip()], default=0)
        normalized = '\n'.join([line[min_indent:] if len(line) > min_indent else line
                               for line in lines])

        return normalized.strip()

    def generate_embedding(self, code: str, language: str = "python") -> List[float]:
        """
        Generate embedding vector for a single code snippet

        Args:
            code: Code string
            language: Programming language

        Returns:
            384-dimensional embedding vector
        """
        # Preprocess code
        clean_code = self.preprocess_code(code, language)

        # Add language prefix for better context
        text = f"[{language}] {clean_code}"

        # Generate embedding
        embedding = self.model.encode(text, convert_to_numpy=True)

        return embedding.tolist()

    def generate_embeddings_batch(
        self,
        codes: List[str],
        languages: Optional[List[str]] = None,
        batch_size: int = 32
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple code snippets (batched for efficiency)

        Args:
            codes: List of code strings
            languages: List of programming languages (optional)
            batch_size: Batch size for encoding

        Returns:
            List of 384-dimensional embedding vectors
        """
        if languages is None:
            languages = ["python"] * len(codes)

        # Preprocess all codes
        clean_codes = [self.preprocess_code(code, lang)
                      for code, lang in zip(codes, languages)]

        # Add language prefixes
        texts = [f"[{lang}] {code}" for lang, code in zip(languages, clean_codes)]

        # Generate embeddings in batches
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=True
        )

        return embeddings.tolist()

    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Compute cosine similarity between two embeddings

        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector

        Returns:
            Similarity score (0-1, higher is more similar)
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        # Cosine similarity
        similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

        return float(similarity)

    def generate_code_hash(self, code: str) -> str:
        """
        Generate unique hash for code (for deduplication)

        Args:
            code: Code string

        Returns:
            SHA256 hash
        """
        return hashlib.sha256(code.encode()).hexdigest()

    def extract_code_features(self, code: str, language: str = "python") -> Dict:
        """
        Extract metadata features from code (for filtering)

        Args:
            code: Code string
            language: Programming language

        Returns:
            Dictionary of code features
        """
        lines = code.split('\n')

        features = {
            "lines_of_code": len([l for l in lines if l.strip()]),
            "total_lines": len(lines),
            "language": language,
            "has_functions": bool(re.search(r'\bdef\s+\w+\s*\(', code)) if language == "python"
                                  else bool(re.search(r'\bfunction\s+\w+\s*\(', code)),
            "has_classes": bool(re.search(r'\bclass\s+\w+', code)),
            "has_imports": bool(re.search(r'\bimport\s+', code)),
            "complexity_estimate": len(re.findall(r'\b(if|for|while|switch|case)\b', code)),
        }

        return features
