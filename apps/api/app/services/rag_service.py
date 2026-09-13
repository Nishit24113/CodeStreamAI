"""
RAG (Retrieval Augmented Generation) service for context-aware AI code reviews
Combines vector search with AI analysis for better insights
"""

from typing import List, Dict, Optional
from app.services.embeddings_service import EmbeddingsService
from app.services.pinecone_service import PineconeService
from app.services.bedrock_service import BedrockService


class RAGService:
    """
    Service for RAG-powered code reviews
    Retrieves similar code and uses it as context for AI analysis
    """

    def __init__(self):
        """Initialize RAG service with embeddings, vector search, and AI"""
        self.embeddings_service = EmbeddingsService()
        self.pinecone_service = PineconeService()
        self.bedrock_service = BedrockService()

    def retrieve_similar_code(
        self,
        query_code: str,
        language: str = "python",
        top_k: int = 3,
        min_similarity: float = 0.75
    ) -> List[Dict]:
        """
        Retrieve similar code snippets for context

        Args:
            query_code: Code to find similar examples for
            language: Programming language
            top_k: Number of similar examples to retrieve
            min_similarity: Minimum similarity threshold

        Returns:
            List of similar code snippets with metadata
        """
        # Generate embedding for query code
        query_embedding = self.embeddings_service.generate_embedding(
            query_code,
            language
        )

        # Search for similar code
        filter_dict = {"language": language} if language else None
        results = self.pinecone_service.search_similar_code(
            query_embedding=query_embedding,
            top_k=top_k,
            filter_dict=filter_dict,
            include_metadata=True
        )

        # Filter by similarity threshold
        similar_codes = [
            {
                "code": result["metadata"].get("code", ""),
                "similarity": result["score"],
                "language": result["metadata"].get("language", ""),
                "description": result["metadata"].get("description", "")
            }
            for result in results
            if result["score"] >= min_similarity
        ]

        return similar_codes

    def build_rag_prompt(
        self,
        code: str,
        language: str,
        analysis_type: str,
        similar_codes: List[Dict]
    ) -> str:
        """
        Build enhanced prompt with retrieved context

        Args:
            code: Code to analyze
            language: Programming language
            analysis_type: Type of analysis (bugs, security, etc.)
            similar_codes: Retrieved similar code snippets

        Returns:
            Enhanced prompt with context
        """
        # Base prompt based on analysis type
        base_prompts = {
            "comprehensive": "Provide a comprehensive code review covering quality, bugs, security, and performance.",
            "bugs": "Focus on identifying potential bugs, edge cases, and logic errors.",
            "security": "Analyze for security vulnerabilities, injection risks, and unsafe practices.",
            "performance": "Evaluate performance characteristics, bottlenecks, and optimization opportunities."
        }

        prompt = f"""You are an expert code reviewer. Analyze the following {language} code.

ANALYSIS TYPE: {base_prompts.get(analysis_type, base_prompts['comprehensive'])}

CODE TO REVIEW:
```{language}
{code}
```
"""

        # Add similar code context if available
        if similar_codes:
            prompt += "\n\nCONTEXT - Similar Code Patterns Found:\n"
            for idx, similar in enumerate(similar_codes, 1):
                similarity_pct = int(similar["similarity"] * 100)
                prompt += f"\nExample {idx} (Similarity: {similarity_pct}%):\n"
                if similar.get("description"):
                    prompt += f"Description: {similar['description']}\n"
                prompt += f"```{similar['language']}\n{similar['code']}\n```\n"

            prompt += "\nConsider these similar patterns when analyzing the code. "
            prompt += "Look for: (1) Common pitfalls from similar code, "
            prompt += "(2) Best practices demonstrated, (3) Anti-patterns to avoid.\n"

        # Add analysis instructions
        prompt += """
PROVIDE:
1. **Summary**: Brief overview of code quality (2-3 sentences)
2. **Issues Found**: List specific problems with severity (Critical/High/Medium/Low)
3. **Recommendations**: Concrete improvements with code examples
4. **Security Concerns**: Any security vulnerabilities (if applicable)
5. **Performance Notes**: Optimization opportunities (if applicable)
6. **Best Practices**: Alignment with language conventions

Format your response clearly with markdown sections.
"""

        return prompt

    async def analyze_with_rag(
        self,
        code: str,
        language: str = "python",
        analysis_type: str = "comprehensive",
        use_rag: bool = True,
        top_k_context: int = 3
    ) -> str:
        """
        Analyze code with RAG-enhanced context

        Args:
            code: Code to analyze
            language: Programming language
            analysis_type: Type of analysis
            use_rag: Whether to use RAG (retrieve similar code)
            top_k_context: Number of similar examples to retrieve

        Returns:
            Complete AI analysis result
        """
        similar_codes = []

        # Retrieve similar code if RAG is enabled
        if use_rag:
            try:
                similar_codes = self.retrieve_similar_code(
                    query_code=code,
                    language=language,
                    top_k=top_k_context,
                    min_similarity=0.75
                )
            except Exception as e:
                print(f"Error retrieving similar code: {e}")
                # Continue without RAG context

        # Build enhanced prompt
        prompt = self.build_rag_prompt(
            code=code,
            language=language,
            analysis_type=analysis_type,
            similar_codes=similar_codes
        )

        # Generate analysis (non-streaming for complete result)
        analysis = ""
        async for token in self.bedrock_service.analyze_code_stream(
            code=prompt,
            language=language,
            analysis_type=analysis_type
        ):
            analysis += token

        return analysis

    async def analyze_with_rag_stream(
        self,
        code: str,
        language: str = "python",
        analysis_type: str = "comprehensive",
        use_rag: bool = True,
        top_k_context: int = 3
    ):
        """
        Streaming version of RAG-enhanced analysis

        Args:
            code: Code to analyze
            language: Programming language
            analysis_type: Type of analysis
            use_rag: Whether to use RAG
            top_k_context: Number of similar examples

        Yields:
            Analysis tokens as they're generated
        """
        similar_codes = []

        # Retrieve similar code if RAG is enabled
        if use_rag:
            try:
                similar_codes = self.retrieve_similar_code(
                    query_code=code,
                    language=language,
                    top_k=top_k_context,
                    min_similarity=0.75
                )
                # Yield context info first
                if similar_codes:
                    yield f"\n🔍 **Found {len(similar_codes)} similar code patterns for context**\n\n"
            except Exception as e:
                print(f"Error retrieving similar code: {e}")

        # Build enhanced prompt
        prompt = self.build_rag_prompt(
            code=code,
            language=language,
            analysis_type=analysis_type,
            similar_codes=similar_codes
        )

        # Stream analysis
        async for token in self.bedrock_service.analyze_code_stream(
            code=prompt,
            language=language,
            analysis_type=analysis_type
        ):
            yield token
