# EMPLOYEE360 AI — RESEARCH EVALUATION & EXPERIMENTAL LABS
**Document ID:** DOC-05  
**Subject:** Empirical Research Plan, Performance Metrics, Adversarial Proctoring Lab, and Fairness Lab  
**Academic Requirement:** Final-Year Capstone Project Evaluation Rigor  

---

## 1. Research Objectives

As a final-year engineering capstone assigned by Zensar HR, Employee360 AI is not merely a software demonstration; it must produce **empirically measured, reproducible research findings** across conversational quality, decision grounding, proctoring reliability, and fairness.

---

## 2. Experimental Metrics & Evaluation Framework

### 2.1 Conversational & Turn-Taking Performance (PS1)
* **Time-to-First-Token (TTFT):** Latency from user utterance completion (VAD trigger) to first token streamed from LLM (target: $< 600\text{ ms}$).
* **End-to-End Spoken Latency (E2E):** Total time from silence cutoff to candidate hearing first audio chunk from TTS (target: $< 1.5\text{ s}$).
* **Task Completion Rate:** Percentage of candidate interviews or employee requests successfully carried through to terminal state without system crash.
* **Information Extraction F1:** Precision and Recall of the agent in capturing required candidate fields.

### 2.2 Grounding & Hallucination Mitigation (PS1)
* **Context Grounding Rate:** Percentage of policy answers that cite verified paragraphs from ingested HR policy documents.
* **Hallucination Detection Frequency:** Count of ungrounded factual claims.
* **Escalation Precision:** Percentage of ambiguous/out-of-policy queries where the system correctly deferred to a human HR ticket rather than guessing.

### 2.3 Evidence Sufficiency Engine Accuracy
* **Competency Coverage Score:** $\frac{\text{Competencies with Sufficient Evidence}}{\text{Total Required Competencies}}$.
* **Probe Effectiveness:** Rate at which follow-up probe questions increase evidence confidence score from $< 0.70$ to $\ge 0.70$.

### 2.4 Proctoring Anomaly Detection Performance (PS2)
Evaluated across controlled synthetic test sessions:
$$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad F_1 = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

| Anomaly Detector | Detection Method | Benchmark Target | Known Environmental Limitations |
| :--- | :--- | :--- | :--- |
| **Candidate Absence** | MediaPipe Face Count $= 0$ | Recall $\ge 98\%$, Latency $< 300\text{ ms}$ | Blocked camera, low ambient lighting. |
| **Multiple Faces** | MediaPipe Face Count $> 1$ | Precision $\ge 92\%$ | Posters/portraits in background. |
| **Gaze Deviation** | 3D Iris / Pupil Angle Estimation | Precision $\ge 85\%$ | Multi-monitor setups, prescription glasses. |
| **Secondary Voice** | Voice Activity + Speaker Diarization | Precision $\ge 80\%$ | TV/street background noise. |

---

## 3. The Adversarial Proctoring Lab (PS2 Testbed)

To evaluate proctoring models safely without invading real candidates' privacy, the project includes an **Adversarial Proctoring Lab**:
* **Synthetic Attack Scenarios:** Pre-recorded and live scripted test scenarios:
  1. *Phone Glance Attack:* Candidate repeatedly checks a smartphone below camera frame.
  2. *Whisper / Coaching Attack:* An off-camera person whispers technical answers.
  3. *Impersonation Attack:* Candidate switches seats during the interview.
  4. *Tab Switch / Browser Blur Attack:* Candidate navigates to search engines or documentation.
* **Evaluation Output:** The Lab produces an automated ROC curve, Confusion Matrix, and False Alarm Rate per detector.

---

## 4. The Counterfactual Fairness Lab

To evaluate whether the evidence-based evaluation model exhibits bias:
* **Controlled Variations:** Synthetic candidate transcripts are subjected to counterfactual attribute swaps (e.g., swapping names, gender pronouns, demographic markers, or non-native accent indicators) while holding all technical claims and job-relevant evidence identical.
* **Fairness Metric:** The variance in final competency scores $\sigma^2(\text{Score})$ across demographic variants should approach $0$. Any divergence is flagged and documented in the capstone research report.
