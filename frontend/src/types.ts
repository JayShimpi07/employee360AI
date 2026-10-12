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
