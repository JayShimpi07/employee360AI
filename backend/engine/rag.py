import re
import math
import hashlib
from typing import List, Dict, Any, Tuple
import numpy as np

class GroundedRAGEngine:
    """
    Lightweight, deterministic local RAG Engine.
    Performs text chunking, dense semantic embedding projection (384-dim),
    and cosine similarity search with confidence gating.
    """

    DIMENSION = 384

    @classmethod
    def chunk_document(cls, text: str, chunk_size: int = 350, overlap: int = 50) -> List[Dict[str, Any]]:
        """
        Splits text into overlapping semantic paragraph chunks.
        """
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        chunk_idx = 0

        for para in paragraphs:
            # If paragraph is within reasonable size, treat as chunk
            if len(para) <= chunk_size:
                chunks.append({
                    "chunk_index": chunk_idx,
                    "content": para,
                    "length": len(para)
                })
                chunk_idx += 1
            else:
                # Split by sentences
                sentences = re.split(r'(?<=[.!?])\s+', para)
                current_chunk = ""
                for sent in sentences:
                    if len(current_chunk) + len(sent) < chunk_size:
                        current_chunk += " " + sent if current_chunk else sent
                    else:
                        if current_chunk:
                            chunks.append({
                                "chunk_index": chunk_idx,
                                "content": current_chunk.strip(),
                                "length": len(current_chunk.strip())
                            })
                            chunk_idx += 1
                        current_chunk = sent
                if current_chunk:
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "content": current_chunk.strip(),
                        "length": len(current_chunk.strip())
                    })
                    chunk_idx += 1

        return chunks

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """
        Generates a normalized 384-dimensional dense semantic embedding vector.
        Uses character n-gram hashing and word frequency projections.
        """
        clean_text = text.lower().strip()
        tokens = re.findall(r'\b[a-z0-9_-]+\b', clean_text)
        
        vec = np.zeros(cls.DIMENSION, dtype=np.float32)

        if not tokens:
            return vec.tolist()

        # Word & Subword Feature Projection
        for i, token in enumerate(tokens):
            # Primary word hash
            h1 = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16) % cls.DIMENSION
            weight = 1.0 / (1.0 + math.log1p(i))
            vec[h1] += weight * 1.5

            # Secondary character trigram hashes
            if len(token) >= 3:
                for j in range(len(token) - 2):
                    trigram = token[j:j+3]
                    h2 = int(hashlib.sha256(trigram.encode('utf-8')).hexdigest(), 16) % cls.DIMENSION
                    vec[h2] += 0.4

        # L2 Normalization
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return vec.tolist()

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        """
        Computes cosine similarity between two vectors (-1.0 to 1.0).
        """
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    @classmethod
    def search_similar(
        cls, query: str, chunks: List[Dict[str, Any]], top_k: int = 3, threshold: float = 0.20
    ) -> List[Dict[str, Any]]:
        """
        Scores all chunks against query and returns top-k results above similarity threshold.
        """
        query_vec = cls.generate_embedding(query)
        scored = []

        for chunk in chunks:
            chunk_vec = chunk.get("embedding") or cls.generate_embedding(chunk["content"])
            sim = cls.cosine_similarity(query_vec, chunk_vec)
            if sim >= threshold:
                scored.append({
                    "chunk_index": chunk.get("chunk_index", 0),
                    "content": chunk["content"],
                    "similarity": round(sim, 4),
                    "document_id": chunk.get("document_id")
                })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]
