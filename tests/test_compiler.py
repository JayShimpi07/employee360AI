import pytest
from backend.engine.compiler import HRAgentCompiler, CompilationError
from backend.models.enums import WorkflowCategory

def test_hiring_workflow_compilation_success():
    valid_config = {
        "workflow_id": "wf_test_hiring",
        "name": "Test Hiring Workflow",
        "version": 1,
        "category": "HIRING",
        "persona": {
            "name": "Alex",
            "role": "Interviewer",
            "tone": "objective",
            "instruction": "Test instruction"
        },
        "stages": [
            {
                "stage_id": "intro",
                "type": "GREETING",
                "script": "Hello",
                "transitions": ["technical"]
            },
            {
                "stage_id": "technical",
                "type": "COMPETENCY_ASSESSMENT",
                "competencies": [
                    {
                        "name": "Problem Solving",
                        "min_evidence_score": 0.70,
                        "probe_questions": ["Explain your debugging method"]
                    }
                ],
                "transitions": ["completed"]
            }
        ]
    }

    compiled_dict, compiled_hash = HRAgentCompiler.compile(valid_config)
    assert compiled_dict["workflow_id"] == "wf_test_hiring"
    assert len(compiled_hash) == 64 # SHA-256 hex length
    assert HRAgentCompiler.verify_hash(compiled_dict, compiled_hash) is True

def test_hiring_workflow_invalid_transition():
    invalid_config = {
        "workflow_id": "wf_broken_graph",
        "name": "Broken Graph",
        "version": 1,
        "category": "HIRING",
        "persona": {
            "name": "Alex",
            "role": "Interviewer",
            "tone": "objective",
            "instruction": "Test"
        },
        "stages": [
            {
                "stage_id": "intro",
                "type": "GREETING",
                "script": "Hello",
                "transitions": ["ghost_stage_not_found"] # INVALID
            }
        ]
    }

    with pytest.raises(CompilationError) as exc_info:
        HRAgentCompiler.compile(invalid_config)
    assert "references unknown transition" in str(exc_info.value)

def test_assistance_workflow_compilation():
    assistance_config = {
        "workflow_id": "wf_test_assistance",
        "name": "Test Assistance",
        "version": 1,
        "category": "ASSISTANCE",
        "persona": {
            "name": "Harper",
            "role": "HR Assistant",
            "tone": "supportive",
            "instruction": "Help employees"
        },
        "authorized_actions": [
            {
                "action_name": "request_leave",
                "parameters": ["start_date", "end_date"],
                "verification_method": "check_balance"
            }
        ]
    }

    compiled_dict, compiled_hash = HRAgentCompiler.compile(assistance_config)
    assert compiled_dict["category"] == "ASSISTANCE"
    assert len(compiled_dict["authorized_actions"]) == 1
    assert len(compiled_hash) == 64
