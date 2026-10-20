# EMPLOYEE360 AI — DEVELOPMENT ROADMAP & LOCAL PHASE GUIDE
**Document ID:** DOC-06  
**Subject:** Phase-Wise Implementation Backlog, Local Execution Plan (No-Docker), and Definition of Done  
**Environment:** Windows 11 | Python 3.12+ (venv) | Node.js v22+ (npm)  

---

## 1. Local Development Strategy (Zero-Docker Workflow)

To enable rapid iteration and eliminate containerization friction for the team, the project is configured for **native local development**:
* **Backend:** Python 3.12 virtual environment (`.venv`), running FastAPI via `uvicorn backend.main:app --reload --port 8000`.
* **Frontend:** Next.js 14 / React 19 application running via `npm run dev` on port 3000.
* **Database & Vector Storage:** 
  - Dual-mode database layer: Local PostgreSQL with `pgvector` OR zero-config SQLite with a numpy/cosine vector search abstraction for instant plug-and-play development across team laptops.
  - Configurable via a single switch in `.env`: `DATABASE_URL=sqlite+aiosqlite:///./employee360.db`.

---

## 2. Phase-by-Phase Implementation Backlog

### Phase 0: Discovery, Architecture Blueprint & Project Scaffolding (Current)
* [x] Deep dive into Zensar HR brief, requirements, and constraints.
* [x] 7-layer architecture and data flow design.
* [x] Relational database schema with vector embedding strategy.
* [x] Complete project documentation suite in `documents/`.
* [x] Generate self-contained `EMPLOYEE360_AI_MASTER_BLUEPRINT.pdf` for cross-team onboarding.
* [ ] Scaffold project directories: `backend/`, `frontend/`, `documents/`, `tests/`.
* [ ] Create `.env.example`, `.gitignore`, and `requirements.txt`.

**Definition of Done (Phase 0):**
1. All 6 technical documents created in `documents/`.
2. Master PDF blueprint generated and readable by Antigravity and human mentors.
3. Clean workspace scaffolded with Python venv and Node scripts ready to execute.

---

### Phase 1: Application Foundation & HR Agent Compiler
* [ ] Initialize FastAPI backend with asynchronous database models and Alembic migrations.
* [ ] Set up Next.js 14 frontend shell with modern CSS/Tailwind design tokens.
* [ ] Implement RBAC authentication:
  - JWT Bearer tokens for HR Admins, HR Reviewers, and Employees.
  - Cryptographically signed HMAC-SHA256 tokens for candidate interview invitations.
* [ ] Implement **HR Agent Compiler**:
  - Pydantic schema validation for versioned workflows (`HIRING`, `ONBOARDING`, `ASSISTANCE`).
  - Compiler outputs compiled state graphs with SHA-256 integrity hashes.
* [ ] Build **HR Command Center & Agent Studio UI**:
  - Requisition creation, competency rubric editor, and workflow version manager.
* [ ] Seed synthetic enterprise data (mock HR admin, sample jobs, competencies, mock policies).

**Definition of Done (Phase 1):**
1. Backend launches cleanly on `http://localhost:8000/docs` with all CRUD and compiler endpoints functional.
2. Frontend loads on `http://localhost:3000` with clean login and HR dashboard.
3. HR Admin can create a job and compile an interview workflow.
4. Generates an HMAC-signed candidate interview link.
5. Unit tests for compiler and authentication pass with $\ge 80\%$ test coverage.

---

### Phase 2: First Working Hiring Interview (Voice Engine & Turn Loop)
* [x] Candidate Interview Portal UI:
  - System checks for camera and microphone permissions.
  - Candidate consent agreement screen.
* [x] High-speed WebSocket streaming connection (`/ws/v1/interview/{session_id}`).
* [x] Integrate STT pipeline:
  - Audio chunk ingestion $\to$ streaming speech-to-text via `faster-whisper`.
* [x] Turn-taking orchestrator:
  - Voice Activity Detection (VAD) for turn completion detection.
  - Prompt orchestrator for next-question generation.
* [x] Integrate low-latency TTS:
  - Stream synthesized audio back to candidate browser.
* [x] Persist conversation transcripts and turn latencies to database.

**Definition of Done (Phase 2):**
1. A candidate can open an invite link in a browser, grant mic permissions, and conduct a full spoken voice interview.
2. System maintains multi-turn conversation context.
3. Complete transcript and audio turn metadata are stored in the database.

---

### Phase 3: Agent Intelligence & Evidence Sufficiency Engine (100% Completed)
* [x] Ingest HR knowledge documents into chunked vector store (384-dimensional dense semantic embeddings in `backend/engine/rag.py`).
* [x] "Defend Your Resume" claim extractor: parses candidate resume text into verifiable technical claims (`backend/engine/resume_defender.py`).
* [x] **Evidence Sufficiency Engine**:
  - Evaluates candidate answers against competency rubrics with verbatim quote citations (`backend/engine/evidence_engine.py`).
  - Dynamically triggers targeted follow-up probes when confidence $< 0.70$ (`backend/engine/orchestrator.py`).
* [x] Proof-carrying candidate evaluation report generator with sufficiency ratio (`backend/engine/decision_engine.py`).
* [x] HR Reviewer Dashboard & Decision Center: interactive report viewer with clickable transcript citations modal and Grounded RAG Knowledge Base explorer (`frontend/src/components/EvidenceDecisionCenter.tsx`).

---

### Phase 4: Interview Integrity & Proctoring (PS2) (100% Completed)
* [x] Browser canvas video keyframe sampler (1 FPS) and focus loss listener (`frontend/src/components/CandidateInterview.tsx`).
* [x] Anomaly detection pipeline (`backend/engine/proctoring.py` & `backend/api/v1/proctoring.py`):
  - Face count (absence or multiple people).
  - Head pose and gaze deviation estimator.
  - Secondary voice activity and window blur detectors.
* [x] Timestamped proctoring event logger with frame snapshots saved to `/storage/proctoring/` and integrated into `EvaluationReport.proctoring_integrity_score`.
* [x] Built **Adversarial Proctoring Lab** UI (`frontend/src/components/AdversarialProctoringLab.tsx`) with live webcam HUD, synthetic attack simulation, and DOC-05 empirical benchmark matrix.

---

### Phase 5: Autonomous Workflows (Onboarding & Employee Assistance)
* [ ] Controlled Mock Action Registry (`request_leave`, `submit_tax_form`, `it_hardware_ticket`).
* [ ] Two-phase action execution and state verification engine.
* [ ] Employee Self-Service Portal:
  - Conversational HR policy inquiry with grounded citations.
  - Autonomous case creation, action execution, and verification.
* [ ] Employee Onboarding Portal:
  - Checklist tracking, document submission verification, proactive reminders.

---

### Phase 6: Research Evaluation & Fairness Lab
* [ ] Benchmarking harness: measure TTFT, E2E spoken latency, and task completion.
* [ ] Grounding evaluation: test hallucination rate against mock policy base.
* [ ] Proctoring accuracy matrix: calculate Precision, Recall, and False Alarm rates.
* [ ] **Counterfactual Fairness Lab**: synthetic attribute permutation to audit evaluation stability.

---

### Phase 7: Product Hardening & Demonstration Packaging
* [ ] End-to-end automated integration tests.
* [ ] UI polish and dark/light mode optimization.
* [ ] Final project documentation and demonstration presentation materials for Zensar mentors.
