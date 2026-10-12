# EMPLOYEE360 AI — WORKFLOW SCHEMAS & CONFIGURATIONS
**Document ID:** DOC-04  
**Subject:** Declarative Configuration Architecture, Workflow Schemas, and Dynamic Compiler  

---

## 1. Declarative Workflow Configuration Paradigm

A fundamental requirement from Zensar HR is that **a single core agent engine** powers all three HR lifecycle use cases without code forks:
1. **Hiring Interview Workflow**
2. **Onboarding Checklist Workflow**
3. **Employee Assistance & Case Resolution Workflow**

Each workflow is defined as a declarative JSON/YAML document adhering to the `WorkflowSchema` contract. The **HR Agent Compiler** parses this schema, checks constraints, and outputs a compiled runtime state graph.

---

## 2. Hiring Workflow Configuration Example

```json
{
  "$schema": "https://employee360.ai/schemas/v1/workflow.json",
  "workflow_id": "wf_hiring_swe_v1",
  "name": "Software Engineer Hiring Interview",
  "version": 1,
  "category": "HIRING",
  "persona": {
    "name": "Alex",
    "role": "Senior Technical HR Interviewer",
    "tone": "professional, supportive, thorough",
    "instruction": "Conduct a technical and behavioral evaluation. Ensure candidate explains practical implementation details."
  },
  "stages": [
    {
      "stage_id": "intro_and_consent",
      "type": "GREETING",
      "script": "Welcome! I am your AI interviewer. Before we begin, please confirm you are ready and agree to session recording.",
      "transitions": ["defend_resume"]
    },
    {
      "stage_id": "defend_resume",
      "type": "RESUME_VERIFICATION",
      "objective": "Probe top claims extracted from the candidate's uploaded resume.",
      "claim_extraction_required": true,
      "max_turns": 4,
      "transitions": ["competency_evaluation"]
    },
    {
      "stage_id": "competency_evaluation",
      "type": "COMPETENCY_ASSESSMENT",
      "competencies": [
        {
          "name": "System Architecture",
          "min_evidence_score": 0.70,
          "probe_questions": [
            "Can you explain the architecture of the most complex system you built?",
            "How did you handle scalability and fault tolerance in that design?"
          ],
          "follow_up_strategy": "TARGETED_PROBE_ON_INSUFFICIENT"
        },
        {
          "name": "Problem Solving & Debugging",
          "min_evidence_score": 0.70,
          "probe_questions": [
            "Describe a challenging bug you encountered in production and how you isolated it."
          ]
        }
      ],
      "transitions": ["candidate_qa"]
    },
    {
      "stage_id": "candidate_qa",
      "type": "CLOSING",
      "script": "That completes our questions. Do you have any questions about the role or team?",
      "transitions": ["completed"]
    }
  ],
  "proctoring_policy": {
    "enabled": true,
    "detectors": ["FACE_PRESENCE", "MULTIPLE_FACES", "GAZE_DEVIATION", "SECOND_VOICE"],
    "action_on_flag": "LOG_AUDIT_ONLY" // Non-punitive
  },
  "escalation_rules": {
    "on_connectivity_loss": "PAUSE_AND_NOTIFY",
    "on_inconclusive_evidence": "FLAG_FOR_HUMAN_INTERVIEW"
  }
}
```

---

## 3. Onboarding Workflow Configuration Example

```json
{
  "$schema": "https://employee360.ai/schemas/v1/workflow.json",
  "workflow_id": "wf_onboarding_eng_v1",
  "name": "Engineering New Hire Onboarding",
  "version": 1,
  "category": "ONBOARDING",
  "checklist_items": [
    {
      "task_id": "task_id_verification",
      "title": "Government ID Submission",
      "action_trigger": "submit_identity_doc",
      "required_verification": true
    },
    {
      "task_id": "task_it_laptop_setup",
      "title": "Select Developer Machine",
      "action_trigger": "submit_hardware_preference",
      "options": ["MacBook Pro 16", "Dell XPS 15 (Linux)"]
    },
    {
      "task_id": "task_policy_signoff",
      "title": "Information Security Sign-off",
      "action_trigger": "sign_infosec_policy"
    }
  ],
  "proactive_reminders": {
    "enabled": true,
    "interval_hours": 24,
    "max_reminders": 3
  }
}
```

---

## 4. Employee Assistance & Case Resolution Workflow

```json
{
  "$schema": "https://employee360.ai/schemas/v1/workflow.json",
  "workflow_id": "wf_employee_assistance_v1",
  "name": "Employee HR Self-Service & Ticket Resolution",
  "version": 1,
  "category": "ASSISTANCE",
  "authorized_actions": [
    {
      "action_name": "request_leave",
      "parameters": ["leave_type", "start_date", "end_date", "reason"],
      "verification_method": "check_leave_balance_and_ticket_status"
    },
    {
      "action_name": "download_tax_statement",
      "parameters": ["financial_year"],
      "verification_method": "verify_document_generated"
    }
  ],
  "rag_policy_sources": ["zensar_leave_policy_2026.pdf", "health_benefits_guide.pdf"],
  "escalation_conditions": {
    "low_retrieval_confidence": "CREATE_HUMAN_HR_TICKET",
    "unauthorized_action_attempt": "REJECT_AND_LOG_SECURITY_AUDIT"
  }
}
```

---

## 5. Adding New Workflows Without Code Changes

To implement a new corporate workflow (e.g., "Annual Performance Review" or "Exit Clearance"):
1. The HR Admin accesses the **Agent Configuration Studio** in the UI.
2. Selects or clones a template and configures the stages, competencies, knowledge sources, and action tools.
3. Clicks **Validate & Compile**.
4. The backend **HR Agent Compiler** verifies that all tools exist in the controlled registry and all rubric metrics are sound.
5. The workflow is given a new cryptographic version hash and activated immediately.
