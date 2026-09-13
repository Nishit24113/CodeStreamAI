"""
Unit tests for embeddings service
"""

import pytest
from app.services.embeddings_service import EmbeddingsService


@pytest.fixture
def embeddings_service():
    """Create embeddings service instance"""
    return EmbeddingsService()


def test_generate_embedding(embeddings_service):
    """Test single embedding generation"""
    code = """
def hello_world():
    print("Hello, World!")
    """

    embedding = embeddings_service.generate_embedding(code, "python")

    assert isinstance(embedding, list)
    assert len(embedding) == 384  # all-MiniLM-L6-v2 dimension
    assert all(isinstance(x, float) for x in embedding)


def test_generate_embeddings_batch(embeddings_service):
    """Test batch embedding generation"""
    codes = [
        "def add(a, b): return a + b",
        "def multiply(x, y): return x * y",
        "def subtract(a, b): return a - b"
    ]
    languages = ["python", "python", "python"]

    embeddings = embeddings_service.generate_embeddings_batch(codes, languages)

    assert len(embeddings) == 3
    assert all(len(emb) == 384 for emb in embeddings)


def test_compute_similarity(embeddings_service):
    """Test similarity computation"""
    code1 = "def hello(): print('hello')"
    code2 = "def hello(): print('hello')"
    code3 = "function add(a, b) { return a + b; }"

    emb1 = embeddings_service.generate_embedding(code1, "python")
    emb2 = embeddings_service.generate_embedding(code2, "python")
    emb3 = embeddings_service.generate_embedding(code3, "javascript")

    # Same code should be very similar
    similarity_same = embeddings_service.compute_similarity(emb1, emb2)
    assert similarity_same > 0.95

    # Different code should be less similar
    similarity_diff = embeddings_service.compute_similarity(emb1, emb3)
    assert similarity_diff < similarity_same


def test_preprocess_code(embeddings_service):
    """Test code preprocessing"""
    code_with_comments = '''
    """This is a docstring"""
    def hello():
        # This is a comment
        print("Hello")
    '''

    cleaned = embeddings_service.preprocess_code(code_with_comments, "python")

    assert '"""' not in cleaned  # Docstrings removed
    assert cleaned.strip()  # Not empty


def test_extract_code_features(embeddings_service):
    """Test code feature extraction"""
    code = """
import os

class MyClass:
    def __init__(self):
        pass

    def method(self):
        if True:
            for i in range(10):
                print(i)
    """

    features = embeddings_service.extract_code_features(code, "python")

    assert features["language"] == "python"
    assert features["has_classes"] is True
    assert features["has_functions"] is True
    assert features["has_imports"] is True
    assert features["complexity_estimate"] > 0
    assert features["lines_of_code"] > 0


def test_generate_code_hash(embeddings_service):
    """Test code hash generation"""
    code1 = "def hello(): print('hello')"
    code2 = "def hello(): print('hello')"
    code3 = "def goodbye(): print('bye')"

    hash1 = embeddings_service.generate_code_hash(code1)
    hash2 = embeddings_service.generate_code_hash(code2)
    hash3 = embeddings_service.generate_code_hash(code3)

    # Same code = same hash
    assert hash1 == hash2

    # Different code = different hash
    assert hash1 != hash3

    # Hash should be hex string
    assert all(c in '0123456789abcdef' for c in hash1)
    assert len(hash1) == 64  # SHA256 = 64 hex chars
