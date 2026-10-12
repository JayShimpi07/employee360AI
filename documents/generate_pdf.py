"""
Employee360 AI - Master Blueprint PDF Generator
Generates a comprehensive, enterprise-grade PDF blueprint for the Employee360 AI project.
"""

import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

class BlueprintPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("helvetica", "B", 8)
            self.set_text_color(100, 116, 139)
            self.cell(120, 8, "EMPLOYEE360 AI - MASTER BLUEPRINT & ARCHITECTURE SPEC", border=0, align="L")
            self.cell(70, 8, "ZENSAR HR CAPSTONE", border=0, align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_draw_color(226, 232, 240)
            self.line(10, self.get_y() + 1, 200, self.get_y() + 1)
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()} | Confidential - Final-Year Engineering Project for Zensar HR", align="C")

    def chapter_title(self, num_str, label):
        self.set_font("helvetica", "B", 13)
        self.set_text_color(15, 23, 42)
        self.set_fill_color(241, 245, 249)
        title = f"{num_str}. {label}"
        self.cell(0, 8.5, title, fill=True, align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def section_subtitle(self, label):
        self.set_font("helvetica", "B", 10.5)
        self.set_text_color(30, 58, 138)
        self.cell(0, 6, label, align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1)

    def body_paragraph(self, text):
        self.set_font("helvetica", "", 9.5)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 4.8, text)
        self.ln(2)

    def bullet_point(self, title, desc):
        self.set_font("helvetica", "B", 9)
        self.set_text_color(30, 41, 59)
        self.write(4.5, f"  * {title}: ")
        self.set_font("helvetica", "", 9)
        self.set_text_color(71, 85, 105)
        self.write(4.5, f"{desc}\n")
        self.ln(1)

    def highlight_box(self, text):
        self.set_fill_color(238, 242, 255)
        self.set_draw_color(199, 210, 254)
        self.set_text_color(30, 58, 138)
        self.set_font("helvetica", "B", 9)
        curr_y = self.get_y()
        self.rect(10, curr_y, 190, 9, style="DF")
        self.set_xy(12, curr_y + 1.5)
        self.cell(186, 6, text, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_xy(10, curr_y + 12)


def build_pdf(output_path):
    pdf = BlueprintPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # COVER TITLE
    pdf.set_font("helvetica", "B", 20)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 11, "EMPLOYEE360 AI", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("helvetica", "B", 11.5)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(0, 6, "An Evidence-Driven Autonomous AI Framework for Intelligent Employee Lifecycle Management", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font("helvetica", "I", 8.5)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 5, "Final-Year Engineering Project Assigned by Zensar HR | Master Architectural Primer", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(3)

    pdf.highlight_box("Autonomous Loop: Understand -> Plan -> Gather Evidence -> Check Policy -> Act -> Verify -> Audit")

    # 1. PROJECT CONCEPT
    pdf.chapter_title("1", "Executive Summary & Core Paradigm")
    pdf.body_paragraph(
        "Employee360 AI is an evidence-driven, configurable autonomous AI framework engineered to manage three foundational pillars of the corporate employee lifecycle: (1) Hiring & Candidate Assessment, (2) Employee Onboarding, and (3) Employee Assistance & HR Case Resolution. Traditional HR chatbots are shallow FAQ responders that lack agency, evidence tracking, and policy verification. Employee360 AI replaces them with a single shared autonomous agent core configured by declarative, versioned schemas."
    )
    pdf.bullet_point("Hiring & Assessment", "Voice AI interview, 'Defend Your Resume' claim extraction, competency evidence mapping, real-time follow-up probes, and automated interview-integrity proctoring.")
    pdf.bullet_point("Employee Onboarding", "Interactive joining checklists, policy Q&A, document collection, proactive reminders, and mock action completion.")
    pdf.bullet_point("Employee Assistance", "Grounded policy RAG, autonomous execution of authorized mock HR transactions (leave, benefits, IT tickets), two-phase action verification, and escalation.")
    pdf.bullet_point("Proof-Carrying Decisions", "No black-box scores. Every recommendation is backed by a verified chain: Requirement -> Evidence Quote -> Source Document -> Rule -> Confidence -> Reviewer.")

    # 2. ZENSAR SCOPE & CONSTRAINTS
    pdf.chapter_title("2", "Zensar Scope, Problem Statements & Constraints")
    pdf.body_paragraph(
        "The project addresses two connected problem statements with strict enterprise guardrails:"
    )
    pdf.bullet_point("PS1: Conversational HR Agent (Primary)", "Develop one configurable agent conducting natural spoken dialogue in English (sub-1.5s latency), retrieving grounded answers via RAG, handling multi-turn context, and managing interruption and silence.")
    pdf.bullet_point("PS2: Interview Proctoring (Secondary)", "Integrate parallel multi-modal anomaly detection (candidate absence, multiple faces, gaze/head pose deviation, secondary voices). Strictly non-punitive: anomalies are logged with snapshots as reviewer audit evidence, never as automated disqualification.")
    pdf.bullet_point("Project Constraints", "English-only; synthetic data and zero live integrations with Zensar internal ERP/Workday; no telephony (browser WebSockets only); local-first execution (no-Docker native setup).")

    # 3. ROLES AND ACCESS CONTROL
    pdf.chapter_title("3", "Target Roles and Access Control (RBAC)")
    pdf.bullet_point("HR Administrator", "Configures jobs, competencies, evaluation rubrics, knowledge bases, and generates secure candidate interview invite links.")
    pdf.bullet_point("Candidate", "Opens secure link using one-time cryptographic HMAC token (no employee account required); completes camera/mic test, consent, and voice interview.")
    pdf.bullet_point("Employee", "Authenticates to Self-Service portal; queries policy documents; submits onboarding checklist items; requests mock HR actions.")
    pdf.bullet_point("HR Reviewer / Mentor", "Inspects proof-carrying evaluation reports, clickable transcript citations, proctoring anomaly evidence snapshots, and system audit logs.")

    # 4. SYSTEM ARCHITECTURE
    pdf.add_page()
    pdf.chapter_title("4", "Seven-Layer System Architecture")
    pdf.body_paragraph(
        "Employee360 AI is structured as a high-performance modular monolith running locally on standard development hardware:"
    )
    pdf.bullet_point("Layer 1: Client Interfaces", "Next.js 14 + React + TypeScript web application with dedicated portals: HR Command Center, Candidate Interview Studio, Employee Self-Service, and Adversarial Proctoring Lab.")
    pdf.bullet_point("Layer 2: API Gateway & Auth", "FastAPI gateway with JWT Bearer authentication for employees/admins and HMAC signed tokens for candidates; bi-directional WebSocket hub.")
    pdf.bullet_point("Layer 3: Workflow Compiler", "Pydantic-based HR Agent Compiler that validates declarative JSON/YAML schemas, generates state graphs, and binds competency rubrics.")
    pdf.bullet_point("Layer 4: Autonomous Agent Core", "LangGraph / deterministic state orchestrator, turn management, Evidence Sufficiency Engine, Grounded RAG, and Two-Phase Action Engine.")
    pdf.bullet_point("Layer 5: Proctoring Engine (PS2)", "OpenCV + MediaPipe Face Mesh (468 3D landmarks for gaze and head-pose), face count detector, and acoustic voice activity detector.")
    pdf.bullet_point("Layer 6: Model Abstractions", "Pluggable provider interfaces for STT (faster-whisper), TTS (Kokoro/Edge-TTS), LLM (Google Gemini / Ollama Llama 3 / OpenAI), and dense embeddings.")
    pdf.bullet_point("Layer 7: Persistence & Audit", "PostgreSQL with pgvector (or zero-config SQLite local vector fallback), local media snapshot storage, and immutable audit ledger.")

    # 5. DATABASE ENTITIES & API DESIGN
    pdf.chapter_title("5", "Database Schema & API Specifications")
    pdf.body_paragraph(
        "Core relational entities and their responsibilities:"
    )
    pdf.bullet_point("users & workflow_versions", "RBAC credentials and immutable compiled workflow schemas with SHA-256 integrity hashes.")
    pdf.bullet_point("jobs & competencies", "Job requisitions linked to competency matrices, evaluation criteria, and rubric weights.")
    pdf.bullet_point("interview_sessions & turns", "Tracks candidate sessions, cryptographic tokens, sequential dialogue turns, audio clip paths, and turn latencies.")
    pdf.bullet_point("evidence_records & proctoring", "Verified candidate claims mapped to competencies (confidence 0-1) and proctoring anomaly events with frame snapshots.")
    pdf.bullet_point("hr_cases, actions & onboarding", "Employee support tickets, authorized mock action receipts (two-phase verified), and onboarding task checklists.")
    pdf.bullet_point("FastAPI API Routes", "/api/v1/auth, /api/v1/workflows, /api/v1/jobs, /api/v1/interviews, /api/v1/evidence, /api/v1/proctoring, /api/v1/knowledge, /api/v1/employee, /api/v1/audit, and WebSocket /ws/v1/interview/{session_id}.")

    # 6. EXPERIMENTAL RESEARCH LABS
    pdf.chapter_title("6", "Empirical Research & Experimental Labs")
    pdf.body_paragraph(
        "As a final-year engineering capstone, Employee360 AI produces measurable, reproducible research data:"
    )
    pdf.bullet_point("Conversational Metrics", "Time-to-First-Token (TTFT < 600ms), End-to-End Spoken Latency (< 1.5s), Task Completion Rate, and Information Extraction F1.")
    pdf.bullet_point("Grounding & RAG Metrics", "Citation grounding percentage, hallucination frequency, and escalation precision.")
    pdf.bullet_point("Evidence Sufficiency Metrics", "Competency coverage score and follow-up probe effectiveness rate.")
    pdf.bullet_point("Adversarial Proctoring Lab", "Synthetic testbed evaluating precision, recall, and false alarm rate against phone glances, whisper coaching, absence, and seat switching.")
    pdf.bullet_point("Counterfactual Fairness Lab", "Synthetic attribute permutation (demographic indicators) holding technical claims constant to audit score stability.")

    # 7. DEVELOPMENT ROADMAP
    pdf.chapter_title("7", "Phase-Wise Roadmap & Local Execution Guide")
    pdf.body_paragraph(
        "The project executes strictly in sequence without premature complexity:"
    )
    pdf.bullet_point("Phase 0 (Current)", "Architecture Blueprint, Documentation Suite, and Master Blueprint PDF.")
    pdf.bullet_point("Phase 1", "FastAPI + Next.js 14 foundation, RBAC Auth, HR Agent Compiler, and Seed Data.")
    pdf.bullet_point("Phase 2", "Spoken voice interview, WebSocket streaming, faster-whisper STT, TTS, and transcript persistence.")
    pdf.bullet_point("Phase 3", "Grounded RAG, 'Defend Your Resume', Evidence Sufficiency Engine, and Proof-Carrying Reports.")
    pdf.bullet_point("Phase 4", "Interview integrity proctoring (OpenCV/MediaPipe) and Adversarial Proctoring Lab.")
    pdf.bullet_point("Phase 5", "Autonomous Onboarding & Employee Assistance, Controlled Action Registry, and Two-Phase Verifier.")
    pdf.bullet_point("Phase 6 & 7", "Research evaluation benchmarks, Counterfactual Fairness Lab, testing, and final packaging.")
    pdf.body_paragraph(
        "Local Run Commands: Backend: 'uvicorn backend.main:app --reload --port 8000' | Frontend: 'npm run dev' (port 3000)."
    )

    pdf.output(output_path)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    target = os.path.join(out_dir, "EMPLOYEE360_AI_MASTER_BLUEPRINT.pdf")
    build_pdf(target)
