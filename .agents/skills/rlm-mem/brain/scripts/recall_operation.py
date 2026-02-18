"""
RLM-MEM - RECALL Operation (D3.2)
High-level memory retrieval using RLM-based natural language queries.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import time
from datetime import datetime
from pathlib import Path
import difflib
import math
import re

# Handle both relative and direct imports
try:
    from brain.scripts.memory_store import ChunkStore
except ImportError:
    from memory_store import ChunkStore


@dataclass
class RecallResult:
    """Result of a RECALL operation."""
    answer: str
    confidence: float = 0.0
    source_chunks: List[str] = field(default_factory=list)
    traversal_path: List[str] = field(default_factory=list)
    iterations_used: int = 0
    cost_usd: float = 0.0


class RecallOperation:
    """
    High-level RECALL operation for memory retrieval.
    
    Uses RLM (Recursive Language Model) approach with the REPL environment
    to search, retrieve, and synthesize information from stored memories.
    """
    
    def __init__(
        self,
        chunk_store: ChunkStore,
        llm_client=None,
        max_iterations: int = 10,
        timeout_seconds: int = 60
    ):
        """
        Initialize RECALL operation.
        
        Args:
            chunk_store: Storage backend for chunks
            llm_client: LLM client for recursive queries
            max_iterations: Maximum recursive iterations
            timeout_seconds: Query timeout
            
        Raises:
            ValueError: If required parameters are missing
        """
        if chunk_store is None:
            raise ValueError("chunk_store is required")
        
        self.chunk_store = chunk_store
        self.llm_client = llm_client
        self.max_iterations = max_iterations
        self.timeout_seconds = timeout_seconds
    
    def recall(
        self,
        query: str,
        conversation_id: str = None,
        max_results: int = 5,
        min_confidence: float = 0.5
    ) -> RecallResult:
        """
        Recall information based on natural language query.
        
        Args:
            query: Natural language query
            conversation_id: Optional conversation context filter
            max_results: Maximum number of source chunks to return
            min_confidence: Minimum confidence threshold
            
        Returns:
            RecallResult with answer and metadata
        """
        if not query or not query.strip():
            return RecallResult(
                answer="No query provided",
                confidence=0.0
            )
        
        # If no LLM client, fall back to basic keyword search
        if self.llm_client is None:
            return self._basic_search(query, conversation_id, max_results)
        
        # Use REPL for intelligent retrieval
        return self._repl_retrieval(query, conversation_id, max_results, min_confidence)
    
    # Query expansion synonyms for common concepts
    QUERY_SYNONYMS = {
        # Task/Project management
        'task': ['task', 'bead', 'issue', 'work item', 'todo'],
        'tracking': ['tracking', 'management', 'organization', 'workflow'],
        'beads': ['beads', 'tasks', 'issues', 'tickets'],
        
        # Memory
        'memory': ['memory', 'storage', 'remember', 'recall', 'chunk'],
        'remember': ['remember', 'store', 'save', 'record'],
        
        # Project
        'project': ['project', 'rlm-mem', 'system', 'brain'],
        'status': ['status', 'state', 'progress', 'complete', 'done'],
        
        # Architecture
        'architecture': ['architecture', 'design', 'structure', 'system'],
        'components': ['components', 'parts', 'modules', 'pieces'],
        
        # Testing
        'test': ['test', 'testing', 'validate', 'verify', 'pytest'],
        
        # Files
        'file': ['file', 'document', 'code', 'script'],
        'format': ['format', 'structure', 'layout', 'style'],
    }
    
    def _expand_query(self, query: str) -> List[str]:
        """Expand query with synonyms for better matching."""
        query_lower = query.lower()
        terms = set(query_lower.split())
        
        # Add synonyms for each term
        expanded = set(terms)
        for term in list(terms):
            for key, synonyms in self.QUERY_SYNONYMS.items():
                if term == key or term in synonyms:
                    expanded.update(synonyms)
        
        return list(expanded)

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize into lowercase alphanumeric tokens."""
        if not text:
            return []
        return re.findall(r"[a-z0-9_]+", text.lower())

    def _extract_created_at(self, chunk) -> Optional[datetime]:
        """Extract chunk creation timestamp across legacy/layered shapes."""
        created_str = getattr(chunk.metadata, "created", None)
        if not created_str:
            return None
        try:
            return datetime.fromisoformat(created_str.replace("Z", "+00:00"))
        except ValueError:
            return None

    def _fuzzy_term_match_score(self, term: str, candidate_tokens: set) -> float:
        """Return a small score for close typo matches."""
        if len(term) < 5 or not candidate_tokens:
            return 0.0

        best = 0.0
        for token in candidate_tokens:
            if not token or token[0] != term[0]:
                continue
            if abs(len(token) - len(term)) > 2:
                continue
            sim = difflib.SequenceMatcher(None, term, token).ratio()
            if sim > best:
                best = sim

        if best >= 0.92:
            return 1.6
        if best >= 0.88:
            return 1.0
        return 0.0
    
    def _basic_search(
        self,
        query: str,
        conversation_id: str = None,
        max_results: int = 5
    ) -> RecallResult:
        """
        Improved keyword search with tag boosting and recency weighting.
        """
        # Get candidate chunks
        if conversation_id:
            chunk_ids = self.chunk_store.list_chunks(
                conversation_id=conversation_id
            )
        else:
            chunk_ids = self.chunk_store.list_chunks()
        
        expanded_terms = self._expand_query(query)
        query_phrase = query.strip().lower()
        query_tokens = set(self._tokenize(" ".join(expanded_terms)))
        if not query_tokens:
            query_tokens = set(self._tokenize(query))

        candidates = []

        for chunk_id in chunk_ids:
            chunk = self.chunk_store.get_chunk(chunk_id)
            if chunk is None:
                continue
            content_tokens = self._tokenize(chunk.content)
            content_token_counts: Dict[str, int] = {}
            for token in content_tokens:
                content_token_counts[token] = content_token_counts.get(token, 0) + 1

            tag_tokens = set()
            for tag in chunk.tags:
                tag_tokens.update(self._tokenize(tag))

            candidates.append({
                "id": chunk_id,
                "chunk": chunk,
                "content_token_counts": content_token_counts,
                "content_token_set": set(content_token_counts.keys()),
                "tag_tokens": tag_tokens,
                "created_at": self._extract_created_at(chunk),
            })

        if not candidates:
            return RecallResult(
                answer="No relevant memories found",
                confidence=0.0,
                source_chunks=[]
            )

        # Lightweight IDF weighting over current candidate set.
        doc_count = len(candidates)
        doc_frequency = {term: 0 for term in query_tokens}
        for candidate in candidates:
            token_set = candidate["content_token_set"] | candidate["tag_tokens"]
            for term in query_tokens:
                if term in token_set:
                    doc_frequency[term] += 1

        now = time.time()
        matches = []
        for candidate in candidates:
            chunk = candidate["chunk"]
            score = 0.0

            content_lower = chunk.content.lower()
            if query_phrase and query_phrase in content_lower:
                score += 6.0

            for term in query_tokens:
                term_df = doc_frequency.get(term, 0)
                idf = 1.0 + math.log((doc_count + 1) / (term_df + 1))

                term_frequency = candidate["content_token_counts"].get(term, 0)
                if term_frequency > 0:
                    score += term_frequency * (1.0 + idf)
                else:
                    score += self._fuzzy_term_match_score(term, candidate["content_token_set"])

                if term in candidate["tag_tokens"]:
                    score += 8.0 * (1.0 + (idf * 0.2))
                else:
                    score += self._fuzzy_term_match_score(term, candidate["tag_tokens"])

            if score <= 0:
                continue

            # Confidence weighting: prefer high-confidence memories for ties.
            confidence = max(0.0, min(1.0, getattr(chunk.metadata, "confidence", 0.7)))
            score *= 0.85 + (0.3 * confidence)

            # Recency weighting: mild effect so relevance still dominates.
            created_dt = candidate["created_at"]
            if created_dt is not None:
                age_seconds = now - created_dt.timestamp()
                age_days = age_seconds / (24 * 3600)
                if age_days <= 7:
                    score *= 1.10
                elif age_days <= 30:
                    score *= 1.04
                elif age_days > 180:
                    score *= 0.92

            matches.append((candidate["id"], score, chunk, created_dt))

        # Sort by score, then recency as deterministic tie-breaker.
        matches.sort(
            key=lambda x: (
                x[1],
                x[3].timestamp() if x[3] is not None else 0.0
            ),
            reverse=True
        )
        
        # Build answer from top matches
        top_matches = matches[:max_results]
        if not top_matches:
            return RecallResult(
                answer="No relevant memories found",
                confidence=0.0,
                source_chunks=[]
            )
        
        # Combine content from matches
        contents = [match[2].content for match in top_matches]
        answer = "\n\n".join(contents)
        
        # Weighted confidence reflects ranking quality.
        total_score = sum(match[1] for match in top_matches)
        if total_score > 0:
            avg_confidence = sum(
                max(0.0, min(1.0, getattr(match[2].metadata, "confidence", 0.7))) * match[1]
                for match in top_matches
            ) / total_score
        else:
            avg_confidence = 0.0
        
        return RecallResult(
            answer=answer,
            confidence=avg_confidence,
            source_chunks=[match[0] for match in top_matches],
            iterations_used=1
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get recall operation statistics."""
        return {
            "total_queries": 0,  # Would track in production
            "avg_confidence": 0.0,
            "avg_iterations": 0.0,
            "total_cost_usd": 0.0
        }
