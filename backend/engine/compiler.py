import json
import hashlib
from typing import Dict, Any, Tuple
from pydantic import ValidationError
from backend.schemas.workflow_schema import WorkflowConfigSchema
from backend.models.enums import WorkflowCategory

class CompilationError(Exception):
    pass

class HRAgentCompiler:
    """
    HR Agent Compiler:
    Validates declarative workflow schemas, verifies state-graph transitions,
    and produces a deterministic runtime specification with a SHA-256 integrity hash.
    """

    @classmethod
    def compile(cls, raw_config: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
        """
        Validates and compiles a workflow schema.
        Returns: (compiled_config_dict, sha256_hash)
        """
        # Step 1: Pydantic Validation
        try:
            validated: WorkflowConfigSchema = WorkflowConfigSchema.model_validate(raw_config)
        except ValidationError as e:
            raise CompilationError(f"Workflow schema validation failed: {e.json()}")

        # Step 2: Validate Transitions and Graph Integrity
        if validated.category == WorkflowCategory.HIRING and validated.stages:
            stage_ids = {s.stage_id for s in validated.stages}
            terminal_states = {"completed", "escalated"}
            for stage in validated.stages:
                for transition in stage.transitions:
                    if transition not in stage_ids and transition not in terminal_states:
                        raise CompilationError(
                            f"Stage '{stage.stage_id}' references unknown transition '{transition}'. "
                            f"Valid targets: {list(stage_ids | terminal_states)}"
                        )

        # Step 3: Validate Action Tools
        if validated.category == WorkflowCategory.ASSISTANCE:
            if not validated.authorized_actions and not validated.rag_policy_sources:
                raise CompilationError("Assistance workflow must declare authorized_actions or rag_policy_sources.")

        # Step 4: Serialize to normalized JSON and compute deterministic SHA-256
        compiled_dict = validated.model_dump(mode="json")
        normalized_json = json.dumps(compiled_dict, sort_keys=True, separators=(",", ":"))
        compiled_hash = hashlib.sha256(normalized_json.encode("utf-8")).hexdigest()

        return compiled_dict, compiled_hash

    @classmethod
    def verify_hash(cls, config_dict: Dict[str, Any], expected_hash: str) -> bool:
        """
        Verifies that a stored configuration matches its compiled integrity hash.
        """
        try:
            _, computed_hash = cls.compile(config_dict)
            return computed_hash == expected_hash
        except Exception:
            return False
