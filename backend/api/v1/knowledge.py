from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.core.database import get_db
from backend.models.models import KnowledgeDocument, DocumentChunk, User
from backend.models.enums import UserRole
from backend.engine.rag import GroundedRAGEngine
from backend.api.deps import require_roles

router = APIRouter(prefix="/knowledge", tags=["Grounded Knowledge Base & RAG"])

@router.post("/documents")
async def create_document(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HR_ADMIN]))
):
    title = payload.get("title")
    category = payload.get("category", "POLICY")
    content = payload.get("content", "")
    source_filename = payload.get("source_filename", "policy.txt")

    if not title or not content:
        raise HTTPException(status_code=400, detail="Title and content are required.")

    # 1. Create document
    doc = KnowledgeDocument(
        title=title,
        category=category,
        source_filename=source_filename,
        version=1
    )
    db.add(doc)
    await db.flush()

    # 2. Chunk text and generate dense vector embeddings
    chunks_data = GroundedRAGEngine.chunk_document(content)
    for c in chunks_data:
        emb = GroundedRAGEngine.generate_embedding(c["content"])
        chunk_obj = DocumentChunk(
            document_id=doc.id,
            chunk_index=c["chunk_index"],
            content=c["content"],
            embedding_json=emb,
            metadata_json={"length": c["length"]}
        )
        db.add(chunk_obj)

    await db.commit()
    await db.refresh(doc)

    return {
        "id": doc.id,
        "title": doc.title,
        "category": doc.category,
        "chunks_indexed": len(chunks_data),
        "embedding_dimensions": GroundedRAGEngine.DIMENSION
    }

@router.get("/documents")
async def list_documents(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(KnowledgeDocument).options(selectinload(KnowledgeDocument.chunks))
    )
    docs = res.scalars().all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "category": d.category,
            "source_filename": d.source_filename,
            "chunk_count": len(d.chunks),
            "created_at": d.created_at.isoformat()
        }
        for d in docs
    ]

@router.post("/query")
async def query_knowledge(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    query_text = payload.get("query", "").strip()
    top_k = payload.get("top_k", 3)
    threshold = payload.get("threshold", 0.35)

    if not query_text:
        raise HTTPException(status_code=400, detail="Query parameter is required.")

    # Fetch all chunks
    res = await db.execute(select(DocumentChunk))
    chunks = res.scalars().all()

    chunk_dicts = [
        {
            "chunk_index": c.chunk_index,
            "content": c.content,
            "embedding": c.embedding_json,
            "document_id": c.document_id
        }
        for c in chunks
    ]

    matches = GroundedRAGEngine.search_similar(query_text, chunk_dicts, top_k=top_k, threshold=threshold)

    # Check hallucination guardrail: if best match is below 0.40, report ungrounded
    is_grounded = bool(matches and matches[0]["similarity"] >= 0.45)

    return {
        "query": query_text,
        "is_grounded": is_grounded,
        "matches": matches,
        "guardrail_status": "GROUNDED_POLICY" if is_grounded else "POLICY_GAP_ESCALATION_REQUIRED"
    }
