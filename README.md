# Employee360 AI

**An Evidence-Driven Autonomous AI Framework for Intelligent Employee Lifecycle Management**  
*Final-Year Engineering Capstone Project | Assigned by Zensar HR*

---

## 🌟 Quick Onboarding for Team Members & Antigravity

If you or a team member are opening this repository in Antigravity or any IDE:
1. Open the [documents/EMPLOYEE360_AI_MASTER_BLUEPRINT.pdf](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/EMPLOYEE360_AI_MASTER_BLUEPRINT.pdf) or markdown version [documents/EMPLOYEE360_AI_MASTER_BLUEPRINT.md](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/EMPLOYEE360_AI_MASTER_BLUEPRINT.md).
2. By sharing this single blueprint, an AI agent or mentor will understand 100% of the project concept, architecture, constraints, database schemas, and phase backlog!

---

## 📚 Complete Project Documentation Suite

All detailed architectural and design specifications are cataloged inside the `documents/` directory:

| Document | File Link | Description |
| :--- | :--- | :--- |
| **DOC-01** | [Concept & Vision](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/01_PROJECT_CONCEPT_AND_VISION.md) | Vision, Zensar problem statements (PS1 & PS2), constraints, and user roles. |
| **DOC-02** | [System Architecture & Agent Core](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/02_SYSTEM_ARCHITECTURE_AND_AGENT_CORE.md) | 7-layer architecture, 7-step autonomous operating loop, and compiler engine. |
| **DOC-03** | [Database Schema & API Spec](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/03_DATABASE_SCHEMA_AND_API_SPEC.md) | Relational ERD, table fields, FastAPI REST routes, and WebSocket protocol. |
| **DOC-04** | [Workflow Schemas & Configurations](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/04_WORKFLOW_SCHEMAS_AND_CONFIGURATIONS.md) | Declarative JSON schemas for Hiring, Onboarding, and Assistance workflows. |
| **DOC-05** | [Research Evaluation & Labs](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/05_RESEARCH_EVALUATION_AND_LABS.md) | Latency benchmarks, Adversarial Proctoring Lab, and Counterfactual Fairness Lab. |
| **DOC-06** | [Development Roadmap & Phase Guide](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/06_DEVELOPMENT_ROADMAP_AND_PHASE_GUIDE.md) | Step-by-step implementation guide (Phases 0–7) with Definitions of Done. |
| **MASTER** | [Master Blueprint (PDF)](file:///c:/Users/jaysh/OneDrive/Desktop/Employee365/documents/EMPLOYEE360_AI_MASTER_BLUEPRINT.pdf) | Self-contained, printable master document for Antigravity and project mentors. |

---

## 🚀 Local Development Setup (Zero-Docker Workflow)

We are running native local environments to enable fast iteration without container overhead.

### Prerequisites
* **Python 3.12+**
* **Node.js v20+** / npm

### Step 1: Environment Setup
```bash
# Copy environment configuration
cp .env.example .env
```

### Step 2: Backend (FastAPI)
```bash
# In the repository root:
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Install dependencies:
pip install -r requirements.txt
# Run local dev server:
uvicorn backend.main:app --reload --port 8000
```
API Documentation will be live at: `http://localhost:8000/docs`

### Step 3: Frontend (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```
Client UI will be live at: `http://localhost:3000`

---

## 🔒 Enterprise Guardrails & Zensar Constraints
* **English Only:** All speech recognition, LLM reasoning, and rubrics operate in English.
* **Synthetic Data:** Zero live enterprise integration. Uses simulated corporate services.
* **No Telephony:** 100% browser-based audio and video over WebSockets.
* **Non-Punitive Anomaly Signals:** Proctoring flags are logged as confidence-weighted audit signals for human review, never as automated disqualification.
