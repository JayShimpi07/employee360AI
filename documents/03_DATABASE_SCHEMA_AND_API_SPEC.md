# EMPLOYEE360 AI — DATABASE SCHEMA & API SPECIFICATIONS
**Document ID:** DOC-03  
**Subject:** Relational Data Model, Vector Embeddings, REST Endpoints, and WebSocket Protocol  
**Persistence Engine:** PostgreSQL 16 + pgvector (with SQLite local fallback abstraction)  

---

## 1. Relational Data Model

The persistence layer is structured to guarantee referential integrity, historical versioning, and auditable evidence chains.

```
+--------------------+        +---------------------+        +--------------------+
|       users        | 1    * | workflow_definitions| 1    * |        jobs        |
|--------------------|--------|---------------------|--------|--------------------|
| id (UUID PK)       |        | id (UUID PK)        |        | id (UUID PK)       |
| email              |        | name                |        | title              |
| hashed_password    |        | type (ENUM)         |        | department         |
| role (ENUM)        |        | description         |        | workflow_ver_id FK |
+--------------------+        +---------------------+        +--------------------+
                                         | 1                            | 1
                                         | *                            | *
                              +---------------------+        +--------------------+
                              |  workflow_versions  |        |    competencies    |
                              |---------------------|        |--------------------|
                              | id (UUID PK)        |        | id (UUID PK)       |
                              | workflow_id FK      |        | job_id FK          |
                              | version_number      |        | name               |
                              | config_json (JSONB) |        | rubric_json (JSONB)|
                              | compiled_hash       |        | weight (FLOAT)     |
                              +---------------------+        +--------------------+
                                         | 1                            | 1
                                         | *                            | *
                              +---------------------+        +--------------------+
                              | interview_sessions  | 1    * |  evidence_records  |
                              |---------------------|--------|--------------------|
                              | id (UUID PK)        |        | id (UUID PK)       |
                              | job_id FK           |        | session_id FK      |
                              | candidate_name      |        | competency_id FK   |
                              | invite_token_hash   |        | claim_text         |
                              | status (ENUM)       |        | quote_evidence     |
                              +---------------------+        | confidence (FLOAT) |
                                 | 1          | 1            | status (ENUM)      |
                                 | *          | *            +--------------------+
              +--------------------+          +--------------------+
              |  transcript_turns  |          | proctoring_events  |
              |--------------------|          |--------------------|
              | id (UUID PK)       |          | id (UUID PK)       |
              | session_id FK      |          | session_id FK      |
              | speaker (AI/CAND)  |          | timestamp_ms       |
              | text               |          | anomaly_type (ENUM)|
              | latency_ms         |          | confidence (FLOAT) |
              | audio_url          |          | frame_snapshot_url |
              +--------------------+          +--------------------+
```

### Table Definitions & Key Fields
* **`users`**: Manages authentication and roles (`HR_ADMIN`, `HR_REVIEWER`, `EMPLOYEE`).
* **`workflow_definitions` & `workflow_versions`**: Maintains immutable versions of compiled workflow schemas.
* **`jobs` & `competencies`**: Defines requisitions, target skills, rubric criteria, and weightages.
* **`interview_sessions`**: Tracks candidate interviews from invitation to completion. Authenticated via hashed one-time tokens.
* **`transcript_turns`**: Logs every speech turn with speaker identifier, text transcript, audio clip URL, and turn latency.
* **`evidence_records`**: Maps verified candidate statements directly to competency rubrics with confidence scores and evidence status (`SUPPORTED`, `PARTIAL`, `INSUFFICIENT`).
* **`proctoring_events`**: Logs anomaly detections (multiple faces, absence, gaze deviation, second voice) with confidence scores and frame snapshot paths.
* **`evaluation_reports`**: Consolidates competency scores, evidence traces, proctoring summaries, and human-in-the-loop sign-offs.
* **`knowledge_documents` & `document_chunks`**: Stores HR policy documents and dense embeddings (`vector(384)`) for semantic retrieval.
* **`hr_cases` & `case_actions`**: Manages employee support tickets, authorized mock action calls, and two-phase verification receipts.
* **`onboarding_tasks`**: Tracks new hire tasks (`PENDING`, `SUBMITTED`, `VERIFIED`).
* **`audit_logs`**: Immutable ledger recording all actor actions, payload changes, and system transitions.

---

## 2. API Endpoints Specification (FastAPI REST)

### Authentication & Sessions (`/api/v1/auth`)
* `POST /login` $\to$ Returns JWT access token (HR Admin, Reviewer, Employee).
* `POST /candidate/verify-token` $\to$ Validates HMAC signed interview invite token; returns temporary session JWT.

### Workflow Studio & Compiler (`/api/v1/workflows`)
* `GET /` $\to$ List workflow definitions.
* `POST /` $\to$ Create new workflow configuration schema.
* `POST /{id}/compile` $\to$ Validates schema against Pydantic models; generates state graph and stores version with hash.
* `GET /{id}/versions` $\to$ List immutable configuration versions.

### Requisitions & Competencies (`/api/v1/jobs`)
* `GET /` $\to$ List active job postings.
* `POST /` $\to$ Create job posting linked to a compiled workflow version.
* `POST /{id}/competencies` $\to$ Define competency evaluation rubrics and weights.

### Candidate Interviews (`/api/v1/interviews`)
* `POST /invite` $\to$ Creates candidate interview session and generates secure invitation link: `/interview/{token}`.
* `GET /{session_id}` $\to$ Fetch session metadata and state.
* `GET /{session_id}/report` $\to$ Fetch finalized proof-carrying evaluation report.

### Grounded Knowledge Base (`/api/v1/knowledge`)
* `POST /documents/upload` $\to$ Upload HR policy document (PDF/Markdown).
* `POST /documents/{id}/index` $\to$ Chunks text, computes embeddings, and stores in vector index.
* `POST /query` $\to$ Perform cosine similarity search with similarity threshold gating.

### Employee Assistance & Onboarding (`/api/v1/employee`)
* `GET /onboarding/tasks` $\to$ Fetch assigned onboarding checklist items.
* `POST /onboarding/tasks/{id}/submit` $\to$ Submit task/document for verification.
* `POST /cases` $\to$ Create HR assistance case.
* `POST /cases/{id}/execute-action` $\to$ Execute authorized mock action and perform two-phase verification.

---

## 3. High-Speed WebSocket Protocol (`/ws/v1/interview/{session_id}`)

A single bidirectional WebSocket connection handles real-time conversational streaming and parallel proctoring signals.

### Client-to-Server Messages
```json
// 1. Audio stream chunk (Base64 PCM or Float32Array)
{
  "type": "audio_chunk",
  "data": "<base64_pcm_data>",
  "timestamp_ms": 12450
}

// 2. Video keyframe snapshot (1 FPS downsampled JPEG)
{
  "type": "video_frame",
  "data": "<base64_jpeg_data>",
  "timestamp_ms": 13000
}

// 3. User browser event
{
  "type": "browser_signal",
  "event": "visibility_change", // e.g. "tab_switch", "blur"
  "timestamp_ms": 14200
}
```

### Server-to-Client Messages
```json
// 1. Streaming transcription feedback
{
  "type": "transcript_partial",
  "text": "In my previous project, I designed a microservices..."
}

// 2. Agent spoken audio chunk
{
  "type": "agent_audio",
  "data": "<base64_audio_data>",
  "turn_index": 3
}

// 3. Turn state transition
{
  "type": "turn_status",
  "status": "LISTENING" // or "THINKING", "SPEAKING"
}
```
