# EMPLOYEE360 AI — SYSTEM ARCHITECTURE & AGENT CORE
**Document ID:** DOC-02  
**Subject:** 7-Layer Architecture, Core Operating Loop, and Agentic Subsystems  
**Target Environment:** Local Python 3.12 Backend + Node.js 22 / Next.js 14 Frontend  

---

## 1. Architectural Philosophy: The Modular Monolith

To maximize development velocity, maintainability, and clean state sharing without distributed systems overhead, Employee360 AI is structured as a **clean 7-Layer Modular Monolith**.

```
+-------------------------------------------------------------------------------+
|  LAYER 1: CLIENT WEB APPLICATIONS (Next.js 14 + React + TypeScript)         |
|  - HR Command Center & Config Studio    - Candidate Voice Interview Portal    |
|  - Employee Self-Service & Onboarding   - Adversarial Proctoring Lab          |
+-------------------------------------------------------------------------------+
                                      |
                                      v (HTTP REST + WebSockets)
+-------------------------------------------------------------------------------+
|  LAYER 2: API GATEWAY & ACCESS CONTROL (FastAPI + Pydantic v2)               |
|  - JWT Bearer Auth (HR/Employee)       - HMAC Signed Tokens (Candidate)       |
|  - Rate Limiting & WebSocket Hub        - Role-Based Access Control (RBAC)    |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|  LAYER 3: WORKFLOW CONFIGURATION & COMPILER                                  |
|  - Declarative Workflow Engine         - HR Agent Compiler (Pydantic models)  |
|  - Schema Validator & Hash Verifier    - Competency & Rubric Manager          |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|  LAYER 4: AUTONOMOUS AGENT CORE (State Machine & Reasoning Engines)           |
|  - Task Planning & Orchestrator        - Contextual Turn & History Engine     |
|  - Evidence Sufficiency Engine         - Grounded RAG Knowledge Retriever     |
|  - Two-Phase Action Engine & Verifier  - Escalation Manager                   |
+-------------------------------------------------------------------------------+
                      |                                       |
                      v                                       v
+-----------------------------------+   +---------------------------------------+
| LAYER 5: PROCTORING ENGINE (PS2)  |   | LAYER 6: MODEL PROVIDER ABSTRACTIONS  |
| - OpenCV & MediaPipe Face Mesh    |   | - STT: faster-whisper / Web Speech    |
| - Gaze & Head Pose Estimator      |   | - LLM: Pluggable Gemini/Ollama/OpenAI |
| - Voice Activity & Secondary VAD  |   | - TTS: Kokoro / Edge-TTS              |
| - Non-Punitive Anomaly Logger     |   | - Embeddings: HuggingFace BGE/MiniLM  |
+-----------------------------------+   +---------------------------------------+
                      |                                       |
                      +-------------------+-------------------+
                                          |
                                          v
+-------------------------------------------------------------------------------+
|  LAYER 7: PERSISTENCE & AUDIT                                                |
|  - PostgreSQL 16 with pgvector (or SQLite fallback for zero-install dev)     |
|  - Local Media & Snapshot Storage     - Tamper-Evident Audit Event Ledger     |
+-------------------------------------------------------------------------------+
```

---

## 2. Deep Dive: Autonomous Agent Subsystems

### 2.1 The HR Agent Compiler
The Compiler translates human-authored JSON/YAML workflow schemas into an executable state graph.
* **Input:** Workflow schema (e.g., `hiring_software_engineer_v1.json`).
* **Validation:** Strict validation of required fields, evaluation rubrics, allowed tool functions, and escalation triggers.
* **Compilation Output:** A deterministic state machine graph with explicit transitions, prompt templates, and rubric matrices.
* **Versioning:** Stored with a cryptographic hash (`compiled_hash`). Every interview or HR session records the exact version hash used to guarantee reproducibility.

### 2.2 The Evidence Sufficiency Engine
During an interview, the agent must not accept vague or superficial answers.
* **Claim Extraction:** Parses candidate speech into factual claims and skill demonstrations.
* **Rubric Mapping:** Maps statements to defined competencies (e.g., "System Design", "Problem Solving").
* **Sufficiency Threshold:** If evidence confidence score $< 0.70$, the state machine enters a **Follow-up Probe Loop**:
  $$\text{Evidence Insufficient} \longrightarrow \text{Generate Targeted Probe} \longrightarrow \text{Evaluate Candidate Clarification} \longrightarrow \text{Update Evidence Record}$$
* Only when sufficient evidence is accumulated (or max turns reached) does the agent transition to the next competency.

### 2.3 Proof-Carrying Decisions
Every evaluation report links hiring outcomes directly to verified transcript citations:
$$\text{Candidate Recommendation} = f(\text{Rubric Requirements}, \text{Extracted Evidence Quotes}, \text{Confidence Scores})$$
An HR reviewer can click any competency score and immediately view the underlying transcript snippet and audio timestamp.

### 2.4 Two-Phase Action Engine (With State Verification)
For Onboarding and Employee Assistance workflows:
* **Phase 1 (Execution):** The agent dispatches an authorized mock API action (e.g., `submit_leave_request(emp_id, dates)`).
* **Phase 2 (Verification):** The agent executes a follow-up query against the mock system state to confirm that the leave balance was decremented and ticket status changed to `CONFIRMED`.
* If verification fails, the agent automatically flags the error and triggers an HR escalation ticket.

### 2.5 Real-Time Voice Conversation Loop
To achieve conversational fluency:
1. Candidate speaks $\to$ Browser Web Audio API streams PCM audio chunks over WebSocket.
2. Server receives chunks $\to$ `faster-whisper` performs streaming speech-to-text.
3. Voice Activity Detection (VAD) detects end of speech turn $\to$ LLM generates token stream.
4. First sentence boundary detected $\to$ TTS converts sentence to audio stream and sends to browser.
5. Target end-to-end conversation turnaround latency: $< 1.5$ seconds.
