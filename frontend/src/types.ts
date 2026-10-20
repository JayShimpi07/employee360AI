export type UserRole = 'HR_ADMIN' | 'HR_REVIEWER' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Competency {
  id: string;
  job_id: string;
  name: string;
  description: string;
  rubric_json: Record<string, any>;
  weight: number;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  description: string;
  workflow_version_id: string;
  created_by: string;
  competencies: Competency[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  category: 'HIRING' | 'ONBOARDING' | 'ASSISTANCE';
  description: string;
  created_at: string;
}

export interface WorkflowVersion {
  id: string;
  version_number: number;
  compiled_hash: string;
  is_active: boolean;
  created_at: string;
  config_json: Record<string, any>;
}

export interface SystemStats {
  total_users: number;
  total_jobs: number;
  total_interviews: number;
  total_workflows: number;
}

export interface InviteCandidateResponse {
  session_id: string;
  candidate_name: string;
  candidate_email: string;
  invite_url: string;
  invite_token: string;
}

export interface OnboardingTaskItem {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  completed_at?: string | null;
  due_date?: string | null;
}

export interface OnboardingTasksResponse {
  employee_id: string;
  employee_name: string;
  total_tasks: number;
  verified_tasks: number;
  completion_percentage: number;
  tasks: OnboardingTaskItem[];
}

export interface CaseActionItem {
  id: string;
  action_name: string;
  input_payload: Record<string, any>;
  result_payload: Record<string, any>;
  receipt_hash?: string | null;
  verified: boolean;
  created_at: string;
}

export interface HRCaseItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  resolution_notes?: string | null;
  created_at: string;
  actions: CaseActionItem[];
}

export interface HarperChatResponse {
  reply: string;
  action_executed: boolean;
  action_name?: string;
  receipt_hash?: string;
  verification_status?: string;
  details?: Record<string, any>;
  grounded: boolean;
  citations: Array<{ source: string; section?: string; snippet: string; similarity?: number }>;
  guardrail_status?: string;
}

export interface FairnessPersona {
  id: string;
  name: string;
  demographic: string;
  pronouns: string;
  education: string;
  style: string;
}

export interface PersonaEvaluation {
  competency: string;
  confidence_score: number;
  evidence_status: string;
  citations_count: number;
  citations: string[];
}

export interface PersonaResult {
  persona_id: string;
  name: string;
  demographic: string;
  pronouns: string;
  education: string;
  average_score: number;
  evaluations: PersonaEvaluation[];
}

export interface FairnessAuditResult {
  audit_timestamp: string;
  personas_audited: number;
  mean_score: number;
  variance: number;
  standard_deviation: number;
  max_score_disparity: number;
  demographic_parity_ratio_pct: number;
  is_fairness_certified: boolean;
  certificate_hash: string;
  personas: PersonaResult[];
}

export interface LatencyMetric {
  average: number;
  target_ms: number;
  passed_sla: boolean;
}

export interface LiveLatencyAudit {
  iterations: number;
  ttft_ms: LatencyMetric;
  rag_search_ms: LatencyMetric;
  e2e_spoken_latency_ms: LatencyMetric;
  task_completion_rate_pct: number;
}

export interface GroundingAccuracyMatrix {
  total_policy_queries_evaluated: number;
  context_grounding_rate_pct: number;
  hallucination_rate_pct: number;
  escalation_precision_pct: number;
  policy_gap_escalation_count: number;
  guardrail_status: string;
}

export interface ProctoringConfusionDetector {
  anomaly_type: string;
  detector_name: string;
  benchmark_target: string;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  sla_compliant: boolean;
}

export interface ResearchBenchmarksSummary {
  conversational_latency: LiveLatencyAudit;
  grounding_mitigation: GroundingAccuracyMatrix;
  proctoring_confusion_matrix: ProctoringConfusionDetector[];
}
