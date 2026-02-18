"""
RLM-MEM - REASON Operation (D3.3)
High-level memory analysis and synthesis using RLM.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import time

# Handle both relative and direct imports
try:
    from brain.scripts.memory_store import ChunkStore
    from brain.scripts.recall_operation import RecallOperation, RecallResult
except ImportError:
    from memory_store import ChunkStore
    from recall_operation import RecallOperation, RecallResult


@dataclass
class ReasonResult:
    """Result of a REASON operation."""
    synthesis: str
    insights: List[str] = field(default_factory=list)
    evidence: Dict[str, List[str]] = field(default_factory=dict)
    contradictions: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.0
    source_chunks: List[str] = field(default_factory=list)
    iterations_used: int = 0
    cost_usd: float = 0.0


class ReasonOperation:
    """
    High-level REASON operation for memory analysis and synthesis.
    
    Uses RLM to:
    - Analyze patterns across memories
    - Synthesize insights from multiple sources
    - Identify contradictions or gaps
    - Generate conclusions with evidence
    """
    
    def __init__(
        self,
        chunk_store: ChunkStore,
        llm_client=None,
        max_iterations: int = 10
    ):
        """
        Initialize REASON operation.
        
        Args:
            chunk_store: Storage backend
            llm_client: LLM for reasoning
            max_iterations: Maximum analysis iterations
        """
        if chunk_store is None:
            raise ValueError("chunk_store is required")
        
        self.chunk_store = chunk_store
        self.llm_client = llm_client
        self.max_iterations = max_iterations
        
        # Initialize recall for gathering evidence
        self._recall = None
        if llm_client is not None:
            self._recall = RecallOperation(
                chunk_store=chunk_store,
                llm_client=llm_client,
                max_iterations=max_iterations
            )
    
    def reason(
        self,
        query: str,
        context_chunks: List[str] = None,
        analysis_type: str = "synthesis"
    ) -> ReasonResult:
        """
        Perform reasoning analysis on memories.
        """
        if not query or not query.strip():
            return ReasonResult(
                synthesis="No query provided",
                confidence=0.0
            )
        
        # Gather evidence
        if context_chunks:
            evidence = self._gather_evidence(context_chunks)
        else:
            evidence = self._search_evidence(query)
        
        if not evidence:
            return ReasonResult(
                synthesis="No relevant evidence found for analysis",
                confidence=0.0
            )
        
        # 1. Always check for contradictions in evidence
        contradictions = self._detect_contradictions(evidence["chunks"])

        # 2. Perform analysis based on type
        if analysis_type == "synthesis":
            result = self._synthesize(query, evidence)
        elif analysis_type == "comparison":
            result = self._compare(query, evidence)
        elif analysis_type == "pattern":
            result = self._find_patterns(query, evidence)
        elif analysis_type == "gap":
            result = self._identify_gaps(query, evidence)
        else:
            result = self._synthesize(query, evidence)

        # 3. Ensure contradictions are attached
        if contradictions and not result.contradictions:
            result.contradictions = contradictions
            if "Identified" not in "".join(result.insights):
                result.insights.append(f"Identified {len(contradictions)} potential conflicts in memory")
        
        return result
    
    def _gather_evidence(self, chunk_ids: List[str]) -> Dict[str, Any]:
        """Gather evidence from specific chunks."""
        evidence = {
            "chunks": [],
            "tags": set(),
            "types": set()
        }
        
        for chunk_id in chunk_ids:
            chunk = self.chunk_store.get_chunk(chunk_id)
            if chunk:
                evidence["chunks"].append(chunk)
                evidence["tags"].update(chunk.tags)
                evidence["types"].add(chunk.type)
        
        evidence["tags"] = list(evidence["tags"])
        evidence["types"] = list(evidence["types"])
        
        return evidence
    
    def _search_evidence(self, query: str) -> Dict[str, Any]:
        """Search for relevant evidence."""
        # Use recall to find relevant chunks
        if self._recall is None:
            # Fallback to basic search
            chunk_ids = self.chunk_store.list_chunks()
            return self._gather_evidence(chunk_ids[:10])
        
        recall_result = self._recall.recall(query, max_results=10)
        return self._gather_evidence(recall_result.source_chunks)
    
    def _synthesize(self, query: str, evidence: Dict[str, Any]) -> ReasonResult:
        """Synthesize insights from evidence with contradiction surfacing."""
        chunks = evidence["chunks"]
        
        # 1. Sort chunks by confidence and recency (if available)
        def chunk_sort_key(c):
            conf = getattr(c.metadata, 'confidence', 0.5)
            # Try to get timestamp for recency boost
            ts = 0.0
            try:
                created = getattr(c.metadata, 'created', "")
                if created:
                    from datetime import datetime
                    ts = datetime.fromisoformat(created.replace("Z", "+00:00")).timestamp()
            except Exception:
                pass
            return (conf, ts)

        sorted_chunks = sorted(chunks, key=chunk_sort_key, reverse=True)
        
        # 2. Extract unique contents
        seen_contents = set()
        unique_chunks = []
        for chunk in sorted_chunks:
            # Simple deduplication based on content normalization
            norm_content = " ".join(chunk.content.lower().split())
            if norm_content not in seen_contents:
                seen_contents.add(norm_content)
                unique_chunks.append(chunk)

        # 3. Detect contradictions
        contradictions = self._detect_contradictions(unique_chunks)
        
        # 4. Build synthesis
        contents = [c.content for c in unique_chunks]
        if not contents:
            return ReasonResult(
                synthesis="No content to synthesize",
                confidence=0.0
            )
        
        synthesis = self._build_synthesis(query, contents)
        
        # 5. Extract insights
        insights = self._extract_insights(contents)
        if contradictions:
            insights.append(f"Identified {len(contradictions)} potential conflicts in memory")

        # 6. Calculate aggregate confidence
        avg_confidence = sum(
            getattr(c.metadata, 'confidence', 0.7) for c in unique_chunks
        ) / len(unique_chunks) if unique_chunks else 0.0
        
        return ReasonResult(
            synthesis=synthesis,
            insights=insights,
            evidence={"sources": [c.id for c in unique_chunks]},
            contradictions=contradictions,
            confidence=avg_confidence,
            source_chunks=[c.id for c in unique_chunks],
            iterations_used=1
        )
    
    def _build_synthesis(self, query: str, contents: List[str]) -> str:
        """Build structured synthesis text."""
        if not contents:
            return "No information available"
        
        # Improved synthesis: summary header + ranked list
        synthesis_parts = [f"Synthesized analysis for: \"{query}\"", ""]
        synthesis_parts.append(f"Based on {len(contents)} unique sources (ranked by relevance):")
        for i, content in enumerate(contents[:7], 1):
            # Clean up content for list display
            clean_content = content.replace("\n", " ").strip()
            synthesis_parts.append(f" {i}. {clean_content}")
        
        if len(contents) > 7:
            synthesis_parts.append(f" ... and {len(contents) - 7} other supporting memories.")
            
        return "\n".join(synthesis_parts)

    def _detect_contradictions(self, chunks: List[Any]) -> List[Dict[str, Any]]:
        """
        Identify potential conflicts across memory chunks using non-LLM heuristics.
        """
        conflicts = []
        
        # 1. Group by tag/topic
        topic_groups = {}
        for chunk in chunks:
            for tag in chunk.tags:
                if tag not in topic_groups:
                    topic_groups[tag] = []
                topic_groups[tag].append(chunk)
        
        # 2. Check for opposite sentiments/values within the same tag
        # Heuristic: "prefer X" vs "prefer Y" or "not X" vs "is X"
        NEGATIONS = {"not", "don't", "dislike", "hate", "avoid", "stop"}
        
        for tag, group in topic_groups.items():
            if len(group) < 2:
                continue
            
            # Simple pair-wise comparison
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    c1, c2 = group[i], group[j]
                    
                    # Heuristic: If both talk about "prefer" but have different words
                    # e.g. "prefer dark mode" vs "prefer light mode"
                    c1_words = set(c1.content.lower().split())
                    c2_words = set(c2.content.lower().split())
                    
                    if ("prefer" in c1_words or "prefers" in c1_words) and ("prefer" in c2_words or "prefers" in c2_words):
                        # Significant difference in specific preference
                        if len(c1_words ^ c2_words) >= 2: 
                            conflicts.append({
                                "type": "potential_preference_conflict",
                                "topic": tag,
                                "chunks": [c1.id, c2.id],
                                "reason": f"Divergent preferences detected for topic '{tag}'"
                            })

                    # Check for explicit negation
                    # If one has a negation word and the other doesn't for the same tag
                    c1_negated = any(n in c1_words for n in NEGATIONS)
                    c2_negated = any(n in c2_words for n in NEGATIONS)
                    
                    if c1_negated != c2_negated:
                        conflicts.append({
                            "type": "negation_conflict",
                            "topic": tag,
                            "chunks": [c1.id, c2.id],
                            "reason": f"Opposing sentiments detected for topic '{tag}'"
                        })

        # Deduplicate conflicts
        unique_conflicts = []
        seen_pairs = set()
        for c in conflicts:
            pair = tuple(sorted(c["chunks"]))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                unique_conflicts.append(c)
                
        return unique_conflicts
    
    def _extract_insights(self, contents: List[str]) -> List[str]:
        """Extract key insights from contents."""
        insights = []
        
        # Simple insight extraction - look for patterns
        for content in contents:
            if "prefer" in content.lower():
                insights.append(f"Preference identified: {content[:100]}...")
            if "like" in content.lower():
                insights.append(f"Positive sentiment: {content[:100]}...")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_insights = []
        for insight in insights:
            if insight not in seen:
                seen.add(insight)
                unique_insights.append(insight)
        
        return unique_insights[:5]  # Top 5 insights
    
    def _compare(self, query: str, evidence: Dict[str, Any]) -> ReasonResult:
        """Compare different pieces of evidence."""
        chunks = evidence["chunks"]
        
        if len(chunks) < 2:
            return ReasonResult(
                synthesis="Need at least 2 items to compare",
                confidence=0.0
            )
        
        # Build comparison
        comparison_parts = [f"Comparison Analysis: \"{query}\"", ""]
        for i, chunk in enumerate(chunks, 1):
            comparison_parts.append(f" Option {i}: {chunk.content}")
        
        synthesis = "\n".join(comparison_parts)
        
        return ReasonResult(
            synthesis=synthesis,
            insights=[f"Comparing {len(chunks)} distinct sources"],
            confidence=0.7,
            source_chunks=[chunk.id for chunk in chunks]
        )
    
    def _find_patterns(self, query: str, evidence: Dict[str, Any]) -> ReasonResult:
        """Find patterns across evidence."""
        chunks = evidence["chunks"]
        tags = evidence.get("tags", [])
        types = evidence.get("types", [])
        
        insights = []
        
        # Pattern: Common tags
        if tags:
            insights.append(f"Common themes: {', '.join(tags[:5])}")
        
        # Pattern: Content types
        if types:
            insights.append(f"Source types: {', '.join(types)}")
        
        # Pattern: Temporal (if timestamps available)
        if chunks:
            dates = []
            for c in chunks:
                d = getattr(c.metadata, 'created', getattr(c.metadata, 'created_at', None))
                if d: dates.append(d[:10])
            if dates:
                insights.append(f"Evidence spans {len(set(dates))} unique days")
        
        return ReasonResult(
            synthesis=f"Found {len(insights)} patterns across {len(chunks)} memories",
            insights=insights,
            confidence=0.75,
            source_chunks=[chunk.id for chunk in chunks]
        )
    
    def _identify_gaps(self, query: str, evidence: Dict[str, Any]) -> ReasonResult:
        """Identify gaps in knowledge."""
        chunks = evidence["chunks"]
        
        gaps = []
        
        # Check for low confidence items
        low_confidence = [
            chunk for chunk in chunks
            if getattr(chunk.metadata, 'confidence', 0.7) < 0.6
        ]
        if low_confidence:
            gaps.append(f"{len(low_confidence)} sources have low confidence scores")
        
        # Check for missing links
        unlinked = [
            chunk for chunk in chunks
            if not getattr(chunk, 'links', None) or (not chunk.links.context_of and not chunk.links.related_to)
        ]
        if unlinked:
            gaps.append(f"{len(unlinked)} items are isolated (no graph links)")
        
        if not gaps:
            gaps.append("No significant structural gaps identified in the available evidence")
        
        return ReasonResult(
            synthesis=f"Knowledge Gap Analysis: {'; '.join(gaps)}",
            insights=gaps,
            confidence=0.6,
            source_chunks=[chunk.id for chunk in chunks]
        )
    
    def analyze_contradictions(
        self,
        chunk_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Analyze chunks for potential contradictions.
        
        Args:
            chunk_ids: Chunks to analyze
            
        Returns:
            List of potential contradictions
        """
        contradictions = []
        
        chunks = []
        for chunk_id in chunk_ids:
            chunk = self.chunk_store.get_chunk(chunk_id)
            if chunk:
                chunks.append(chunk)
        
        # Simple contradiction detection
        # Look for chunks with contradicts links
        for chunk in chunks:
            if hasattr(chunk.links, 'contradicts') and chunk.links.contradicts:
                for target_id in chunk.links.contradicts:
                    contradictions.append({
                        "chunk_a": chunk.id,
                        "chunk_b": target_id,
                        "reasoning": "Explicit contradiction link"
                    })
        
        return contradictions
    
    def get_stats(self) -> Dict[str, Any]:
        """Get reasoning operation statistics."""
        return {
            "total_analyses": 0,
            "avg_confidence": 0.0,
            "avg_insights": 0.0
        }
