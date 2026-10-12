from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.database import get_db
from backend.models.models import WorkflowDefinition, WorkflowVersion, User
from backend.models.enums import UserRole, WorkflowCategory
from backend.engine.compiler import HRAgentCompiler, CompilationError
from backend.api.deps import require_roles

router = APIRouter(prefix="/workflows", tags=["Agent Configuration Studio & Compiler"])

@router.get("/")
async def list_workflows(
    category: WorkflowCategory = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(WorkflowDefinition)
    if category:
        query = query.where(WorkflowDefinition.category == category)
    result = await db.execute(query)
    workflows = result.scalars().all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "category": w.category.value,
            "description": w.description,
            "created_at": w.created_at.isoformat()
        }
        for w in workflows
    ]

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_workflow(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HR_ADMIN]))
):
    name = payload.get("name")
    category = payload.get("category")
    if not name or not category:
        raise HTTPException(status_code=400, detail="Name and category are required.")
    
    definition = WorkflowDefinition(
        name=name,
        category=WorkflowCategory(category),
        description=payload.get("description", "")
    )
    db.add(definition)
    await db.commit()
    await db.refresh(definition)
    return {"id": definition.id, "name": definition.name, "category": definition.category.value}

@router.post("/{workflow_id}/compile")
async def compile_workflow_version(
    workflow_id: str,
    raw_config: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.HR_ADMIN]))
):
    # Verify workflow definition exists
    result = await db.execute(select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow definition not found.")

    # Execute HR Agent Compiler
    try:
        compiled_dict, compiled_hash = HRAgentCompiler.compile(raw_config)
    except CompilationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Calculate version number
    count_res = await db.execute(
        select(WorkflowVersion).where(WorkflowVersion.workflow_id == workflow_id)
    )
    existing_versions = count_res.scalars().all()
    version_num = len(existing_versions) + 1

    # Save compiled version
    version = WorkflowVersion(
        workflow_id=workflow_id,
        version_number=version_num,
        config_json=compiled_dict,
        compiled_hash=compiled_hash,
        is_active=True
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)

    return {
        "version_id": version.id,
        "workflow_id": workflow_id,
        "version_number": version.version_number,
        "compiled_hash": version.compiled_hash,
        "is_active": version.is_active,
        "created_at": version.created_at.isoformat()
    }

@router.get("/{workflow_id}/versions")
async def get_workflow_versions(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WorkflowVersion).where(WorkflowVersion.workflow_id == workflow_id).order_by(WorkflowVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": v.id,
            "version_number": v.version_number,
            "compiled_hash": v.compiled_hash,
            "is_active": v.is_active,
            "created_at": v.created_at.isoformat(),
            "config_json": v.config_json
        }
        for v in versions
    ]
