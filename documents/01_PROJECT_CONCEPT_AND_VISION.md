# EMPLOYEE360 AI — COMPLETE PROJECT CONCEPT & VISION
**Document ID:** DOC-01  
**Project Title:** An Evidence-Driven Autonomous AI Framework for Intelligent Employee Lifecycle Management  
**Project Type:** Final-Year Engineering Capstone Project | AI/ML | Agentic AI | Generative AI | Audio & Computer Vision  
**Corporate Sponsor:** Zensar HR  
**Execution Mode:** Local Development (Phased Architecture, Docker-free for initial development)  

---

## 1. Executive Summary & Vision

Employee360 AI is an evidence-driven, configurable autonomous AI framework engineered to manage three foundational pillars of the corporate employee lifecycle:
1. **Hiring & Candidate Assessment:** Spoken AI voice interviews, "Defend Your Resume" claim verification, competency evidence mapping, real-time follow-up probes, and automated interview-integrity proctoring.
2. **Employee Onboarding:** Guided joining checklists, policy guidance, document verification, proactive reminders, and mock action completion.
3. **Employee Assistance & HR Case Resolution:** Policy consultation via Grounded Retrieval-Augmented Generation (RAG), autonomous execution of authorized mock HR transactions (leave, benefits, IT requests), two-phase action verification, and policy escalation.

### The Problem with Traditional HR Chatbots
Traditional HR bots are simple FAQ retrieval tools. They are stateless, cannot reason over multi-step workflows, cannot gather or verify evidence against formal rubrics, cannot execute actions safely, and provide black-box answers without audit trails.

### The Employee360 AI Solution: One Configurable Agent Core
Rather than building three disconnected applications, Employee360 AI creates **one shared autonomous agent core**. The agent's persona, interview questions, evaluation rubrics, knowledge sources, allowed actions, and escalation policies are loaded from **declarative, versioned workflow configuration schemas**. Adding a new HR process requires creating a validated configuration rather than writing new application code.

---

## 2. Core Autonomous Operating Loop

Every interaction and transaction in Employee360 AI follows a deterministic 7-step cycle:

$$\mathbf{Understand} \longrightarrow \mathbf{Plan} \longrightarrow \mathbf{Gather\ Evidence} \longrightarrow \mathbf{Check\ Policy} \longrightarrow \mathbf{Act} \longrightarrow \mathbf{Verify} \longrightarrow \mathbf{Audit}$$

1. **Understand:** Interpret the user's intent, current conversation context, active workflow configuration, and target outcome.
2. **Plan:** Identify necessary questions, approved knowledge sources, verification checks, and workflow milestones.
3. **Gather Evidence:** Collect spoken answers, resume claims, documents, and supported session signals.
4. **Check Policy:** Verify that the proposed response or action complies with approved company policies, configured rules, and user permissions.
5. **Act:** Ask targeted follow-up questions, retrieve grounded answers, create an HR case, or trigger an authorized action.
6. **Verify:** Perform a two-phase check to verify that the action actually completed in the underlying system.
7. **Audit:** Record inputs, evidence quotes, confidence scores, policy references, and unresolved gaps in an immutable audit log.

---

## 3. Zensar Problem Statements & Scope

### Problem Statement 1 (PS1): Conversational HR Agent (Primary Priority)
Develop one configurable AI agent capable of:
* Conducting natural spoken voice conversations (STT $\to$ LLM $\to$ TTS).
* Grounding responses in approved HR policy documents (RAG).
* Maintaining multi-turn conversation context across three workflows (Hiring, Onboarding, Assistance).
* Managing voice dynamics: interruption handling, silence detection, noisy audio, and sub-1.5s latency.
* Running on low-cost/free local hardware and open-source models wherever possible.

### Problem Statement 2 (PS2): Automated Interview Proctoring (Secondary Priority)
After PS1 is operational, integrate multi-modal anomaly detection during candidate interviews:
* **Visual Anomaly Signals:** Candidate absence (0 faces), multiple people in frame (>1 faces), head pose / gaze deviation extremes.
* **Audio Anomaly Signals:** Secondary voices, background coaching, acoustic volume surges.
* **Device / Session Signals:** Tab switching, full-screen exits, connectivity drops.
* **Non-Punitive Rule:** A detected anomaly is strictly treated as an **audit evidence signal for human reviewer inspection**, never as automated disqualification.

---

## 4. Target Users and Role-Based Access Control (RBAC)

1. **HR Administrator:**
   * Configures job requisitions, competencies, and evaluation rubrics.
   * Uploads and manages approved HR policy knowledge bases.
   * Generates secure, time-limited candidate interview links.
   * Reviews proof-carrying candidate evaluation reports and audit logs.
2. **Candidate:**
   * Accesses interview via an authenticated one-time cryptographic invitation token (no full employee account required).
   * Reviews consent terms and hardware check (camera & microphone).
   * Participates in an interactive, voice-driven AI interview with adaptive questioning.
3. **Employee:**
   * Logs into Employee Self-Service portal.
   * Asks policy queries with cited document sources.
   * Tracks onboarding milestones and submits mock documents.
   * Raises HR assistance tickets and observes autonomous action resolution.
4. **HR Reviewer / Mentor:**
   * Inspects evidence links connecting candidate quotes to competency scores.
   * Reviews flagged proctoring anomalies with timestamped frame snapshots and confidence metrics.
   * Inspects system execution logs, latency measurements, and fairness benchmarks.

---

## 5. Zensar Constraints & Guardrails

* **Language:** English-only interaction.
* **Data Privacy:** Synthetic candidate/employee data by default; zero connection to live Zensar corporate systems.
* **No Telephony:** Browser-based audio/video over WebSockets only.
* **Phasing:** Prioritize PS1 (Conversational Core) before PS2 (Proctoring Engine).
* **Local-First Architecture:** Open-source models (`faster-whisper`, `MediaPipe`, local embeddings) with pluggable LLM interfaces.
