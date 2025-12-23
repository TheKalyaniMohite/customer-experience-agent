"""
Knowledge Base (KB) service for indexing and searching markdown articles.
"""

import os
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

# Path to KB articles
KB_DIR = Path(__file__).parent.parent / "kb"


@dataclass
class KBChunk:
    """A searchable chunk from a KB article."""
    source_file: str
    heading: str
    content: str
    chunk_id: str = field(default="")
    
    def __post_init__(self):
        if not self.chunk_id:
            self.chunk_id = f"{self.source_file}:{self.heading}"


@dataclass
class KBSearchResult:
    """A search result with relevance score."""
    source_file: str
    heading: str
    snippet: str
    score: float
    
    def to_dict(self) -> dict:
        return {
            "source_file": self.source_file,
            "heading": self.heading,
            "snippet": self.snippet,
            "score": round(self.score, 3),
        }


class KnowledgeBase:
    """In-memory knowledge base with keyword search."""
    
    def __init__(self):
        self.chunks: List[KBChunk] = []
        self._loaded = False
    
    def load(self) -> None:
        """Load all markdown files from the KB directory."""
        if self._loaded:
            return
        
        if not KB_DIR.exists():
            logger.warning(f"KB directory does not exist: {KB_DIR}")
            return
        
        md_files = list(KB_DIR.glob("*.md"))
        logger.info(f"Found {len(md_files)} KB articles")
        
        for md_file in md_files:
            try:
                content = md_file.read_text(encoding="utf-8")
                chunks = self._split_into_chunks(md_file.name, content)
                self.chunks.extend(chunks)
                logger.info(f"Loaded {len(chunks)} chunks from {md_file.name}")
            except Exception as e:
                logger.error(f"Error loading {md_file}: {e}")
        
        self._loaded = True
        logger.info(f"KB loaded: {len(self.chunks)} total chunks")
    
    def _split_into_chunks(self, filename: str, content: str) -> List[KBChunk]:
        """Split markdown content into chunks by headings."""
        chunks = []
        
        # Split by headings (## or ###)
        sections = re.split(r'\n(?=#{1,3}\s)', content)
        
        for section in sections:
            section = section.strip()
            if not section:
                continue
            
            # Extract heading
            heading_match = re.match(r'^(#{1,3})\s+(.+?)(?:\n|$)', section)
            if heading_match:
                heading = heading_match.group(2).strip()
                body = section[heading_match.end():].strip()
            else:
                heading = "Introduction"
                body = section
            
            # Skip empty sections
            if not body or len(body) < 20:
                continue
            
            # Split long sections into smaller chunks (~500 chars)
            if len(body) > 600:
                sub_chunks = self._split_long_section(body, max_chars=500)
                for i, sub_body in enumerate(sub_chunks):
                    chunk_heading = f"{heading}" if i == 0 else f"{heading} (cont.)"
                    chunks.append(KBChunk(
                        source_file=filename,
                        heading=chunk_heading,
                        content=sub_body,
                    ))
            else:
                chunks.append(KBChunk(
                    source_file=filename,
                    heading=heading,
                    content=body,
                ))
        
        return chunks
    
    def _split_long_section(self, text: str, max_chars: int = 500) -> List[str]:
        """Split long text into smaller chunks at paragraph boundaries."""
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            if len(current_chunk) + len(para) + 2 <= max_chars:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks if chunks else [text[:max_chars]]
    
    def search(self, query: str, top_k: int = 3) -> List[KBSearchResult]:
        """
        Search the knowledge base using keyword scoring.
        Returns top_k results sorted by relevance.
        """
        if not self._loaded:
            self.load()
        
        if not query or not self.chunks:
            return []
        
        # Normalize and tokenize query
        query_terms = self._tokenize(query.lower())
        if not query_terms:
            return []
        
        # Score each chunk
        scored_results = []
        for chunk in self.chunks:
            score = self._score_chunk(chunk, query_terms)
            if score > 0:
                # Create snippet (first 200 chars or highlight matching area)
                snippet = self._create_snippet(chunk.content, query_terms)
                scored_results.append(KBSearchResult(
                    source_file=chunk.source_file,
                    heading=chunk.heading,
                    snippet=snippet,
                    score=score,
                ))
        
        # Sort by score descending
        scored_results.sort(key=lambda x: x.score, reverse=True)
        
        return scored_results[:top_k]
    
    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words, removing stopwords."""
        stopwords = {
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
            'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'under', 'again', 'further', 'then', 'once', 'here',
            'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
            'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
            'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
            'and', 'but', 'if', 'or', 'because', 'until', 'while', 'what',
            'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am',
            'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
            'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him',
            'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its',
            'itself', 'they', 'them', 'their', 'theirs', 'themselves',
        }
        
        # Extract words
        words = re.findall(r'\b[a-z]+\b', text)
        
        # Filter stopwords and short words
        return [w for w in words if w not in stopwords and len(w) > 2]
    
    def _score_chunk(self, chunk: KBChunk, query_terms: List[str]) -> float:
        """Score a chunk based on keyword matches."""
        content_lower = chunk.content.lower()
        heading_lower = chunk.heading.lower()
        
        score = 0.0
        content_terms = set(self._tokenize(content_lower))
        heading_terms = set(self._tokenize(heading_lower))
        
        for term in query_terms:
            # Exact match in heading (high weight)
            if term in heading_terms:
                score += 5.0
            elif term in heading_lower:
                score += 3.0
            
            # Exact match in content
            if term in content_terms:
                score += 2.0
            
            # Partial/substring match in content
            if term in content_lower:
                # Count occurrences for bonus
                count = content_lower.count(term)
                score += min(count * 0.5, 3.0)  # Cap at 3 bonus points
        
        # Boost for matching multiple terms
        matched_terms = sum(1 for t in query_terms if t in content_lower or t in heading_lower)
        if matched_terms > 1:
            score *= (1 + 0.2 * (matched_terms - 1))
        
        return score
    
    def _create_snippet(self, content: str, query_terms: List[str], max_length: int = 200) -> str:
        """Create a snippet, preferring content near matching terms."""
        content_lower = content.lower()
        
        # Find best starting position (near first matching term)
        best_pos = 0
        for term in query_terms:
            pos = content_lower.find(term)
            if pos != -1:
                best_pos = max(0, pos - 30)  # Start 30 chars before match
                break
        
        # Extract snippet
        if len(content) <= max_length:
            return content
        
        snippet = content[best_pos:best_pos + max_length]
        
        # Clean up snippet boundaries
        if best_pos > 0:
            # Find first space after position
            space_pos = snippet.find(' ')
            if space_pos != -1 and space_pos < 20:
                snippet = snippet[space_pos + 1:]
            snippet = "..." + snippet
        
        if best_pos + max_length < len(content):
            # Find last space
            last_space = snippet.rfind(' ')
            if last_space > len(snippet) - 30:
                snippet = snippet[:last_space]
            snippet = snippet + "..."
        
        return snippet


# Singleton instance
_kb_instance: Optional[KnowledgeBase] = None


def get_kb() -> KnowledgeBase:
    """Get or create the KB singleton."""
    global _kb_instance
    if _kb_instance is None:
        _kb_instance = KnowledgeBase()
        _kb_instance.load()
    return _kb_instance


def search_kb(query: str, top_k: int = 3) -> List[dict]:
    """
    Search the knowledge base.
    Returns list of dicts with source_file, heading, snippet, score.
    """
    kb = get_kb()
    results = kb.search(query, top_k=top_k)
    return [r.to_dict() for r in results]


def reload_kb() -> None:
    """Force reload the knowledge base (useful after adding articles)."""
    global _kb_instance
    _kb_instance = KnowledgeBase()
    _kb_instance.load()


