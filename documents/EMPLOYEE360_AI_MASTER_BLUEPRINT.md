# EMPLOYEE360 AI — COMPLETE MASTER BLUEPRINT & SYSTEM SPECIFICATION
**Project Title:** An Evidence-Driven Autonomous AI Framework for Intelligent Employee Lifecycle Management  
**Project Category:** Final-Year Engineering Capstone Project | Enterprise AI Framework  
**Corporate Sponsor:** Zensar HR  
**Document Type:** Master Architectural Specification & Agent Onboarding Blueprint  
**Environment:** Windows 11 / Linux | Python 3.12+ (FastAPI) | Node.js v22+ (Next.js 14) | Local Native Execution  

---

## 1. Executive Summary & Vision

Employee360 AI is an evidence-driven, configurable autonomous AI framework engineered to manage three foundational pillars of the corporate employee lifecycle:
1. **Hiring & Candidate Assessment:** Spoken AI voice interviews, "Defend Your Resume" claim verification, competency evidence mapping, real-time follow-up probes, and automated interview-integrity proctoring.
2. **Employee Onboarding:** Guided joining checklists, policy guidance, document verification, proactive reminders, and mock action completion.
3. **Employee Assistance & HR Case Resolution:** Policy consultation via Grounded Retrieval-Augmented Generation (RAG), autonomous execution of authorized mock HR transactions (leave, benefits, IT requests), two-phase action verification, and policy escalation.

### The Paradigm Shift: From Shallow Chatbot to Autonomous Agentic Core
Traditional HR bots are simple FAQ retrieval tools. They are stateless, cannot reason over multi-step workflows, cannot gather or verify evidence against formal rubrics, cannot execute actions safely, and provide black-box answers without audit trails.

Employee360 AI unifies these processes under **one shared configurable agent core**. The agent's persona, interview questions, evaluation rubrics, knowledge sources, allowed actions, and escalation policies are loaded from **declarative, versioned workflow configuration schemas**.

---

## 2. Core Autonomous Operating Loop

Every interaction and transaction in Employee360 AI follows a deterministic 7-step cycle:
$$\mathbf{Understand} \longrightarrow \mathbf{Plan} \longrightarrow \mathbf{Gather\ Evidence} \longrightarrow \mathbf{Check\ Policy} \longrightarrow \mathbf{Act} \longrightarrow \mathbf{Verify} \longrightarrow \mathbf{Audit}$$

1. **Understand:** Interpret user intent, current conversation context, active workflow configuration, and target outcome.
2. **Plan:** Identify necessary questions, approved knowledge sources, verification checks, and workflow milestones.
3. **Gather Evidence:** Collect spoken answers, resume claims, documents, and supported session signals.
4. **Check Policy:** Verify that the proposed response or action complies with approved company policies, configured rules, and user permissions.
5. **Act:** Ask targeted follow-up questions, retrieve grounded answers, create an HR case, or trigger an authorized action.
6. **Verify:** Perform a two-phase check to verify that the action actually completed in the underlying system.
7. **Audit:** Record inputs, evidence quotes, confidence scores, policy references, and unresolved gaps in an immutable audit log.

### Proof-Carrying Decisions
Every evaluation report links hiring outcomes directly to verified transcript citations:
$$\text{Candidate Recommendation} = f(\text{Rubric Requirements}, \text{Extracted Evidence Quotes}, \text{Confidence Scores})$$
No black-box AI scores are permitted. Every recommendation is traceable from Requirement $\to$ Evidence Quote $\to$ Rule $\to$ Confidence $\to$ Reviewer Escalation.

---

## 3. Zensar Problem Statements & Project Constraints

### PS1: Conversational HR Agent (Primary Priority)
* Conduct natural spoken voice conversations (STT $\to$ LLM $\to$ TTS) with sub-1.5s latency.
* Ground responses in approved HR policy documents via RAG.
* Maintain multi-turn context across Hiring, Onboarding, and Assistance.
* Handle interruption, silence detection, and background noise.

### PS2: Automated Interview Proctoring (Secondary Priority)
* Video signals: Candidate absence (0 faces), multiple people (>1 faces), head pose & gaze deviation.
* Audio signals: Secondary voices, background coaching, acoustic volume surges.
* Strict constraint: Anomaly signals are logged with confidence metrics and timestamped snapshots for human reviewer inspection; the AI never makes autonomous disqualification decisions.

### Project Boundaries & Constraints
* **English Language Only:** All speech, prompts, and rubrics operate strictly in English.
* **Synthetic Data & Zero Live Integrations:** No live connection to Zensar Active Directory, Workday, or SAP.
* **No Telephony:** Browser-based audio/video over WebSockets only.
* **Local-First & Open-Source:** Native Python and Node.js execution without Docker overhead.

---

## 4. Target Users and Role-Based Access Control (RBAC)

1. **HR Administrator:** Configures job requisitions, competencies, rubrics, approved knowledge bases; issues candidate invitations; inspects audit logs.
2. **Candidate:** Accesses interview via an authenticated one-time cryptographic invitation token (HMAC-SHA256); completes hardware check, consent, and voice interview.
3. **Employee:** Accesses Self-Service portal; queries policy documents; submits onboarding documents; requests mock HR actions (leave, benefits).
4. **HR Reviewer / Mentor:** Inspects candidate proof-carrying reports, audit records, and flagged proctoring anomalies with snapshots.

---

## 5. Seven-Layer System Architecture

* **Layer 1: Client Web Interfaces (Next.js 14 + React + TypeScript):** HR Command Center, Candidate Interview Portal, Employee Self-Service, Adversarial Proctoring Lab.
* **Layer 2: API Gateway & Access Control (FastAPI):** JWT Bearer auth for employees/admins, HMAC tokens for candidates, WebSocket hub.
* **Layer 3: Configuration & Compiler:** Declarative schema validator, HR Agent Compiler, Rubric Manager.
* **Layer 4: Autonomous Agent Core:** State machine orchestrator, Turn engine, Evidence Sufficiency Engine, Grounded RAG, Two-Phase Action Engine.
* **Layer 5: Proctoring & Signal Processing (PS2):** OpenCV + MediaPipe Face Mesh, Gaze estimator, Voice Activity Detector.
* **Layer 6: Model & Service Abstractions:** `faster-whisper` (STT), Kokoro/Edge-TTS (TTS), Pluggable LLM (Gemini, Llama 3 via Ollama, OpenAI), HuggingFace BGE embeddings.
* **Layer 7: Persistence & Audit:** PostgreSQL 16 with `pgvector` (or zero-config SQLite fallback), local snapshot storage, tamper-evident audit ledger.

---

## 6. Complete Database Schema & API Module Plan

### Relational Entities
* `users`: Authentication credentials and roles (`HR_ADMIN`, `HR_REVIEWER`, `EMPLOYEE`).
* `workflow_definitions` & `workflow_versions`: Immutable versioned workflow configuration schemas.
* `jobs` & `competencies`: Requisition descriptions, competency matrices, weights, and rubrics.
* `interview_sessions`: Candidate interview records with HMAC token hashes and completion status.
* `transcript_turns`: Turn-by-turn dialogue text, audio URLs, and latency metrics.
* `evidence_records`: Extracted statements mapped to competencies with confidence scores and quotes.
* `proctoring_events`: Timestamped anomalies with frame snapshots and detector confidence.
* `evaluation_reports`: Consolidated proof-carrying evaluation reports with human override flags.
* `knowledge_documents` & `document_chunks`: Policy texts and 384-dimensional vector embeddings.
* `hr_cases` & `case_actions`: Employee support tickets, action payloads, and verification receipts.
* `onboarding_tasks`: New hire checklist items (`PENDING`, `SUBMITTED`, `VERIFIED`).
* `audit_logs`: Immutable ledger recording all actor actions and system transitions.

### API Routing Architecture
* `/api/v1/auth`: Authentication, JWT issuance, candidate token validation.
* `/api/v1/workflows`: Workflow CRUD, schema compilation, version activation.
* `/api/v1/jobs`: Requisition management, competency rubric configuration.
* `/api/v1/interviews`: Interview invitation dispatch, candidate onboarding, session state.
* `/ws/v1/interview/{session_id}`: High-throughput WebSocket for audio streaming, STT/TTS turns, and proctoring frame ingestion.
* `/api/v1/evidence`: Competency mapping, gap query, follow-up probe resolution.
* `/api/v1/proctoring`: Proctoring anomaly event stream, reviewer overrides, Adversarial Lab hooks.
* `/api/v1/knowledge`: Document ingestion, chunking, pgvector semantic search.
* `/api/v1/onboarding`: Task tracking, document submission verification, proactive alerts.
* `/api/v1/cases`: Employee assistance case lifecycle and mock action dispatch.
* `/api/v1/audit`: Queryable audit ledger for compliance reviews.

---

## 7. Research Evaluation & Experimental Labs

* **Conversational Metrics:** Time-to-First-Token (TTFT $< 600\text{ ms}$), End-to-End spoken latency ($< 1.5\text{ s}$), task completion rate.
* **Grounding Metrics:** Context grounding percentage, hallucination frequency, escalation precision.
* **Evidence Sufficiency Metrics:** Competency coverage score, probe effectiveness rate.
* **Proctoring Anomaly Accuracy:** Precision, Recall, False Alarm Rate, and Latency per detector.
* **Adversarial Proctoring Lab:** Synthetic testbed simulating phone glances, whisper coaching, candidate absence, and impersonation.
* **Counterfactual Fairness Lab:** Demographic attribute perturbation to verify evaluation score stability.

---

## 8. Development Roadmap (Phases 0–7)

* **Phase 0 (Current):** Concept, Architecture Blueprint, Database Schema, Documentation Suite, Master Blueprint PDF.
* **Phase 1:** Application Foundation, FastAPI backend, Next.js frontend, RBAC Auth, HR Agent Compiler, Seed Data.
* **Phase 2:** Spoken Voice Interview, WebSocket streaming, STT (`faster-whisper`), TTS, Transcript persistence.
* **Phase 3:** Grounded RAG, "Defend Your Resume", Evidence Sufficiency Engine, Proof-Carrying Decision Reports.
* **Phase 4:** Proctoring Engine (OpenCV/MediaPipe), Anomaly Logger, Adversarial Proctoring Lab.
* **Phase 5:** Autonomous Onboarding & Employee Assistance, Controlled Action Registry, Two-Phase Verifier.
* **Phase 6:** Research Benchmarking, Fairness Lab, Latency optimization.
* **Phase 7:** Hardening, Security audit, Comprehensive testing, Final Demo packaging.
