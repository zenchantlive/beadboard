"""
RLM-MEM - Chunking Engine
D1.2: Semantic content chunking for RLM Memory System

Splits content into bounded semantic chunks (100-800 tokens) with content type detection.
"""

import re
from typing import List, Optional
from dataclasses import dataclass, field

# Try to import tiktoken for accurate token counting
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False

try:
    from .memory_store import Chunk, ChunkMetadata, ChunkLinks, ChunkType
except ImportError:
    # Fallback for direct execution
    from memory_store import Chunk, ChunkMetadata, ChunkLinks, ChunkType


@dataclass
class ChunkResult:
    """Result of chunking a piece of content."""
    content: str
    tokens: int
    type: str
    tags: List[str] = field(default_factory=list)


class ChunkingEngine:
    """
    Splits content into bounded semantic chunks.
    
    Strategy: Simple Bounded Semantic
    1. Split on paragraphs (\n\n)
    2. Merge small paragraphs (< min_tokens) with next
    3. Split large paragraphs (> max_tokens) at sentence boundaries
    4. Detect content type (fact, preference, pattern, note, decision)
    """
    
    def __init__(self, min_tokens: int = 100, max_tokens: int = 800):
        """
        Initialize the chunking engine.
        
        Args:
            min_tokens: Minimum tokens per chunk (default: 100)
            max_tokens: Maximum tokens per chunk (default: 800)
        """
        self.min_tokens = min_tokens
        self.max_tokens = max_tokens
        
        # Initialize tiktoken encoder if available
        self._encoder = None
        if TIKTOKEN_AVAILABLE:
            try:
                self._encoder = tiktoken.get_encoding("cl100k_base")
            except Exception:
                pass  # Fall back to character-based estimation
    
    def count_tokens(self, text: str) -> int:
        """
        Estimate token count.
        
        Uses tiktoken if available, otherwise uses len/4 approximation
        which works reasonably well for English text.
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Estimated token count
        """
        if text is None or text == "":
            return 0
            
        if self._encoder is not None:
            try:
                return len(self._encoder.encode(text))
            except Exception:
                pass  # Fall back to approximation
        
        # Character-based approximation: ~4 chars per token for English
        # This is a rough estimate but works for most cases
        return max(1, len(text) // 4)
    
    def detect_content_type(self, content: str) -> str:
        """
        Detect if content is fact, preference, pattern, note, or decision.
        
        Detection rules (case-insensitive, word boundaries respected):
        - Decision: "decided", "chose", "selected", "going with"
        - Preference: "prefer", "like", "want", "rather"
        - Fact: "is a", "are a", "works as", "located in"
        - Pattern: "usually", "often", "tends to", "pattern"
        - Default: "note"
        
        Args:
            content: Content to analyze
            
        Returns:
            Content type string
        """
        if not content:
            return ChunkType.NOTE.value
            
        content_lower = content.lower()
        
        # Decision indicators (highest priority - explicit actions)
        decision_patterns = [
            r'\bdecided\b', r'\bchose\b', r'\bselected\b', 
            r'\bgoing with\b', r'\bwent with\b', r'\bopted for\b',
            r'\bsettled on\b', r'\bconcluded\b'
        ]
        for pattern in decision_patterns:
            if re.search(pattern, content_lower):
                return ChunkType.DECISION.value
        
        # Pattern indicators (habits, recurring behaviors) - check BEFORE preference
        # because phrases like "generally prefer" describe patterns, not preferences
        pattern_patterns = [
            r'\busually\b', r'\boften\b', r'\btends to\b', r'\bpattern\b',
            r'\balways\b', r'\btypically\b', r'\bgenerally\b',
            r'\bfrequently\b', r'\bregularly\b', r'\bevery time\b',
            r'\bmost of the time\b', r'\bwhenever\b'
        ]
        for pattern in pattern_patterns:
            if re.search(pattern, content_lower):
                return ChunkType.PATTERN.value
        
        # Preference indicators
        preference_patterns = [
            r'\bprefer\b', r'\blike\b', r'\bwant\b', r'\brather\b',
            r'\bdislike\b', r'\bhate\b', r'\bwish\b', r'\bwould like\b',
            r'\bfavorite\b', r'\bfavour\b'
        ]
        for pattern in preference_patterns:
            if re.search(pattern, content_lower):
                return ChunkType.PREFERENCE.value
        
        # Fact indicators (statements of truth)
        fact_patterns = [
            r'\bis a\b', r'\bare a\b', r'\bworks as\b', r'\blocated in\b',
            r'\bis an\b', r'\bare an\b', r'\bwas a\b', r'\bwere a\b',
            r'\bworks at\b', r'\bworks for\b', r'\blives in\b',
            r'\bborn in\b', r'\bstudied at\b', r'\bgraduated from\b',
            r'\bhas\s+\d+', r'\bthere are\s+\d+', r'\bthere is\s+'
        ]
        for pattern in fact_patterns:
            if re.search(pattern, content_lower):
                return ChunkType.FACT.value
        
        # Default: note
        return ChunkType.NOTE.value
    
    def _split_into_paragraphs(self, content: str) -> List[str]:
        """
        Split content into paragraphs on double newlines.
        
        Handles edge cases like multiple consecutive newlines and whitespace.
        """
        # Split on double newlines
        raw_paragraphs = re.split(r'\n\n+', content)
        
        # Clean up each paragraph
        paragraphs = []
        for p in raw_paragraphs:
            # Strip whitespace and normalize internal whitespace
            cleaned = p.strip()
            if cleaned:
                # Normalize internal newlines (preserve single newlines within paragraphs)
                cleaned = re.sub(r'[ \t]+', ' ', cleaned)
                paragraphs.append(cleaned)
        
        return paragraphs
    
    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.
        
        Handles abbreviations and edge cases reasonably well.
        """
        # Pattern for sentence boundaries
        # Matches . ? or ! followed by space or end of string
        # Handles quotes and parentheses
        sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z"\'\(])|(?<=[.!?])$'
        
        sentences = re.split(sentence_pattern, text)
        
        # Clean up
        result = []
        for s in sentences:
            cleaned = s.strip()
            if cleaned:
                result.append(cleaned)
        
        return result
    
    def _split_large_chunk(self, content: str) -> List[str]:
        """
        Split a large chunk (> max_tokens) at sentence boundaries.
        
        Tries to create chunks that are as close to max_tokens as possible
        without exceeding it.
        """
        sentences = self._split_sentences(content)
        
        if len(sentences) <= 1:
            # Cannot split by sentences, force split by token count
            return self._force_split(content)
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            # If a single sentence exceeds max_tokens, force split it
            if sentence_tokens > self.max_tokens:
                # First, flush current chunk if any
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
                    current_chunk = []
                    current_tokens = 0
                
                # Force split this long sentence
                chunks.extend(self._force_split(sentence))
                continue
            
            # Check if adding this sentence would exceed max_tokens
            if current_tokens + sentence_tokens > self.max_tokens and current_chunk:
                # Flush current chunk
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_tokens = sentence_tokens
            else:
                # Add to current chunk
                current_chunk.append(sentence)
                current_tokens += sentence_tokens
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    def _force_split(self, content: str) -> List[str]:
        """
        Force split content into chunks of approximately max_tokens.
        
        Used when sentence splitting isn't sufficient.
        """
        total_tokens = self.count_tokens(content)
        
        if total_tokens <= self.max_tokens:
            return [content]
        
        # Calculate approximate characters per chunk
        # We use character count as a proxy for token count
        chars_per_token = len(content) / total_tokens
        chars_per_chunk = int(self.max_tokens * chars_per_token * 0.95)  # 5% safety margin
        
        chunks = []
        start = 0
        
        while start < len(content):
            end = start + chars_per_chunk
            
            if end >= len(content):
                # Last chunk
                chunks.append(content[start:].strip())
                break
            
            # Try to find a word boundary
            # Look for space, period, or other punctuation
            search_end = min(end + 50, len(content))  # Look ahead 50 chars
            boundary = end
            
            # Find the last space or punctuation before search_end
            for i in range(search_end - 1, start, -1):
                if content[i] in ' \t\n.,;:!?':
                    boundary = i + 1
                    break
            
            chunk = content[start:boundary].strip()
            if chunk:
                chunks.append(chunk)
            
            start = boundary
        
        return chunks
    
    def chunk(self, content: str, conversation_id: str,
              tags: List[str] = None) -> List[ChunkResult]:
        """
        Split content into bounded semantic chunks.
        
        Strategy: Simple Bounded Semantic
        1. Split on paragraphs (\n\n)
        2. Merge small paragraphs (< min_tokens) with next
        3. Split large paragraphs (> max_tokens) at sentence boundaries
        4. Detect content type (fact, preference, pattern, note, decision)
        
        Args:
            content: Text content to chunk
            conversation_id: Source conversation ID
            tags: Optional list of tags to apply to all chunks
            
        Returns:
            List of ChunkResult objects ready for storage
        """
        if not content or not content.strip():
            return []
        
        tags = tags or []
        
        # Step 1: Split into paragraphs
        paragraphs = self._split_into_paragraphs(content)
        
        # Step 2: Process paragraphs - handle size bounds
        raw_chunks = []
        
        for paragraph in paragraphs:
            tokens = self.count_tokens(paragraph)
            
            if tokens > self.max_tokens:
                # Split large paragraph at sentence boundaries
                split_chunks = self._split_large_chunk(paragraph)
                raw_chunks.extend(split_chunks)
            else:
                raw_chunks.append(paragraph)
        
        # Step 3: Merge small chunks
        merged_chunks = self._merge_small_chunks(raw_chunks)
        
        # Step 4: Create ChunkResult objects with type detection
        results = []
        for chunk_content in merged_chunks:
            chunk_tokens = self.count_tokens(chunk_content)
            content_type = self.detect_content_type(chunk_content)
            
            result = ChunkResult(
                content=chunk_content,
                tokens=chunk_tokens,
                type=content_type,
                tags=tags.copy()
            )
            results.append(result)
        
        return results
    
    def _merge_small_chunks(self, chunks: List[str]) -> List[str]:
        """
        Merge chunks that are below min_tokens with adjacent chunks.
        
        Strategy:
        - Try to merge with next chunk (if same content type)
        - If merging would exceed max_tokens, keep as-is (it's the best we can do)
        - Don't merge chunks with different content types (semantic boundaries)
        - Handle the last chunk specially - merge with previous if possible
        """
        if not chunks:
            return []
        
        if len(chunks) == 1:
            return chunks
        
        result = []
        i = 0
        
        while i < len(chunks):
            current = chunks[i]
            current_tokens = self.count_tokens(current)
            current_type = self.detect_content_type(current)
            
            # If current chunk is large enough, add it
            if current_tokens >= self.min_tokens:
                result.append(current)
                i += 1
                continue
            
            # Current chunk is too small - try to merge with next
            if i + 1 < len(chunks):
                next_chunk = chunks[i + 1]
                next_tokens = self.count_tokens(next_chunk)
                next_type = self.detect_content_type(next_chunk)
                
                # Don't merge if content types differ (preserve semantic boundaries)
                if current_type != next_type:
                    result.append(current)  # Add as-is even if small
                    i += 1
                    continue
                
                # Check if merging would exceed max_tokens
                combined_tokens = current_tokens + next_tokens
                
                if combined_tokens <= self.max_tokens:
                    # Merge current with next
                    merged = current + "\n\n" + next_chunk
                    # Replace next chunk with merged version
                    chunks[i + 1] = merged
                    i += 1
                    continue
                else:
                    # Can't merge without exceeding max
                    # Add current as-is (it's below min but we can't help it)
                    result.append(current)
                    i += 1
                    continue
            else:
                # This is the last chunk and it's too small
                # Try to merge with previous result if possible
                if result:
                    prev = result[-1]
                    prev_tokens = self.count_tokens(prev)
                    prev_type = self.detect_content_type(prev)
                    combined_tokens = prev_tokens + current_tokens
                    
                    # Only merge if types match
                    if combined_tokens <= self.max_tokens and prev_type == current_type:
                        # Merge with previous
                        result[-1] = prev + "\n\n" + current
                    else:
                        # Can't merge, add as-is
                        result.append(current)
                else:
                    # No previous chunk, add as-is
                    result.append(current)
                
                i += 1
        
        return result


def chunk_and_store(content: str, conversation_id: str, 
                    store, tags: List[str] = None,
                    min_tokens: int = 100, max_tokens: int = 800) -> List[Chunk]:
    """
    Convenience function to chunk content and store in ChunkStore.
    
    Args:
        content: Text to chunk and store
        conversation_id: Source conversation ID
        store: ChunkStore instance
        tags: Optional tags for all chunks
        min_tokens: Minimum tokens per chunk
        max_tokens: Maximum tokens per chunk
        
    Returns:
        List of created Chunk objects
    """
    engine = ChunkingEngine(min_tokens=min_tokens, max_tokens=max_tokens)
    chunk_results = engine.chunk(content, conversation_id, tags)
    
    created_chunks = []
    for result in chunk_results:
        chunk = store.create_chunk(
            content=result.content,
            chunk_type=result.type,
            conversation_id=conversation_id,
            tokens=result.tokens,
            tags=result.tags
        )
        created_chunks.append(chunk)
    
    return created_chunks


# ============== Testing ==============

if __name__ == "__main__":
    print("=" * 60)
    print("Chunking Engine - Self Test")
    print("=" * 60)
    
    # Test 1: Basic multi-paragraph content
    print("\n[Test 1] Multi-paragraph content")
    content = """Paragraph 1. Short.

Paragraph 2 is longer with multiple sentences. It should stand alone.

This is a decision: We chose to use RLM architecture."""
    
    engine = ChunkingEngine()
    chunks = engine.chunk(content, "test-conv")
    
    print(f"Input paragraphs: 3")
    print(f"Output chunks: {len(chunks)}")
    for i, c in enumerate(chunks, 1):
        print(f"  Chunk {i}: {c.type}, {c.tokens} tokens")
        print(f"    Content: {c.content[:60]}...")
    
    # Test 2: Content type detection
    print("\n[Test 2] Content type detection")
    test_cases = [
        ("I prefer chocolate over vanilla", "preference"),
        ("We decided to use Python", "decision"),
        ("Python is a programming language", "fact"),
        ("I usually wake up early", "pattern"),
        ("This is just a random note", "note"),
    ]
    
    for text, expected in test_cases:
        detected = engine.detect_content_type(text)
        status = "[OK]" if detected == expected else "[FAIL]"
        print(f"  {status} '{text[:40]}...' -> {detected} (expected: {expected})")
    
    # Test 3: Small paragraph merging
    print("\n[Test 3] Small paragraph merging")
    content = """A.

B.

C is a longer paragraph with more content that should stand on its own."""
    
    chunks = engine.chunk(content, "test-conv")
    print(f"Input paragraphs: 3 (two very short)")
    print(f"Output chunks: {len(chunks)}")
    for i, c in enumerate(chunks, 1):
        print(f"  Chunk {i}: {c.tokens} tokens - {c.content[:50]}...")
    
    # Test 4: Large paragraph splitting
    print("\n[Test 4] Large paragraph splitting")
    # Generate a paragraph that's definitely over 800 tokens
    large_content = " ".join([f"This is sentence number {i} in a very long paragraph." 
                              for i in range(1, 201)])  # ~200 sentences
    
    chunks = engine.chunk(large_content, "test-conv")
    total_tokens = sum(c.tokens for c in chunks)
    print(f"Input: ~{engine.count_tokens(large_content)} tokens")
    print(f"Output chunks: {len(chunks)}")
    for i, c in enumerate(chunks, 1):
        status = "[OK]" if 100 <= c.tokens <= 800 else "[FAIL]"
        print(f"  {status} Chunk {i}: {c.tokens} tokens")
    
    # Test 5: Token counting comparison
    print("\n[Test 5] Token counting")
    test_text = "This is a test sentence with exactly twelve tokens."
    estimated = engine.count_tokens(test_text)
    print(f"  Text: '{test_text}'")
    print(f"  Estimated tokens: {estimated}")
    print(f"  Tiktoken available: {TIKTOKEN_AVAILABLE}")
    
    # Test 6: Integration with ChunkStore
    print("\n[Test 6] Integration with ChunkStore")
    try:
        from .memory_store import ChunkStore
        
        store = ChunkStore("brain/memory")
        test_content = """First fact: Python is a programming language.

Second decision: We chose to implement async support.

Third preference: I prefer using type hints."""
        
        created = chunk_and_store(
            content=test_content,
            conversation_id="integration-test",
            store=store,
            tags=["test", "integration"]
        )
        
        print(f"  Created {len(created)} chunks:")
        for c in created:
            print(f"    - {c.id}: {c.type}, {c.tokens} tokens")
        
        # Cleanup - archive the test chunks
        for c in created:
            store.delete_chunk(c.id, permanent=False)
        print("  ✓ Test chunks archived")
        
    except Exception as e:
        print(f"  [SKIP] Integration test skipped: {e}")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)
