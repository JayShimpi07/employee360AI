import {
  OnboardingTasksResponse, HRCaseItem, HarperChatResponse,
  FairnessPersona, FairnessAuditResult, ResearchBenchmarksSummary, LiveLatencyAudit
} from './types';

const API_BASE = '/api/v1';

export function getStoredToken(): string | null {
  return localStorage.getItem('employee360_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('employee360_token', token);
  } else {
    localStorage.removeItem('employee360_token');
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    return apiRequest<{ access_token: string; role: string; user_id: string; full_name: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
  },
  getMe: async () => {
    return apiRequest<any>('/auth/me');
  },

  // System
  getStats: async () => {
    return apiRequest<{ total_users: number; total_jobs: number; total_interviews: number; total_workflows: number }>(
      '/system/stats'
    );
  },

  // Jobs & Competencies
  getJobs: async () => {
    return apiRequest<any[]>('/jobs/');
  },
  createJob: async (jobData: any) => {
    return apiRequest<any>('/jobs/', { method: 'POST', body: JSON.stringify(jobData) });
  },
  inviteCandidate: async (inviteData: { job_id: string; candidate_name: string; candidate_email: string; resume_text?: string }) => {
    return apiRequest<any>('/jobs/invite', { method: 'POST', body: JSON.stringify(inviteData) });
  },

  // Workflows & Compiler
  getWorkflows: async () => {
    return apiRequest<any[]>('/workflows/');
  },
  getWorkflowVersions: async (workflowId: string) => {
    return apiRequest<any[]>(`/workflows/${workflowId}/versions`);
  },
  compileWorkflow: async (workflowId: string, rawConfig: any) => {
    return apiRequest<any>(`/workflows/${workflowId}/compile`, {
      method: 'POST',
      body: JSON.stringify(rawConfig),
    });
  },

  // Evidence & Decision Engine
  getEvidenceReports: async () => {
    return apiRequest<any[]>('/evidence/reports');
  },
  getEvidenceReport: async (sessionId: string) => {
    return apiRequest<any>(`/evidence/sessions/${sessionId}/report`);
  },
  evaluateSession: async (sessionId: string) => {
    return apiRequest<any>(`/evidence/sessions/${sessionId}/evaluate`, { method: 'POST' });
  },
  signoffReport: async (reportId: string, status: string, notes: string) => {
    return apiRequest<any>(`/evidence/reports/${reportId}/signoff`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Interviews & Transcripts
  getInterviewTranscript: async (sessionId: string) => {
    return apiRequest<any[]>(`/interviews/${sessionId}/transcript`);
  },

  // Grounded Knowledge Base & RAG
  getKnowledgeDocuments: async () => {
    return apiRequest<any[]>('/knowledge/documents');
  },
  queryKnowledge: async (query: string, top_k: number = 3, threshold: number = 0.35) => {
    return apiRequest<any>('/knowledge/query', {
      method: 'POST',
      body: JSON.stringify({ query, top_k, threshold }),
    });
  },

  // Interview Integrity & Proctoring (PS2)
  analyzeProctoringFrame: async (sessionId: string, frameData: string, timestampOffsetMs: number) => {
    return apiRequest<any>(`/proctoring/sessions/${sessionId}/analyze-frame`, {
      method: 'POST',
      body: JSON.stringify({ frame_data: frameData, timestamp_offset_ms: timestampOffsetMs }),
    });
  },
  recordBrowserEvent: async (sessionId: string, event: string, timestampOffsetMs: number) => {
    return apiRequest<any>(`/proctoring/sessions/${sessionId}/browser-event`, {
      method: 'POST',
      body: JSON.stringify({ event, timestamp_offset_ms: timestampOffsetMs }),
    });
  },
  getSessionProctoringSummary: async (sessionId: string) => {
    return apiRequest<any>(`/proctoring/sessions/${sessionId}/summary`);
  },
  simulateAdversarialProctoring: async (scenario: string) => {
    return apiRequest<any>('/proctoring/lab/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    });
  },
  getProctoringBenchmarks: async () => {
    return apiRequest<any[]>('/proctoring/lab/benchmarks');
  },

  // Employee Self-Service & Autonomous Workflows (Phase 5)
  getOnboardingTasks: async () => {
    return apiRequest<OnboardingTasksResponse>('/employee/onboarding/tasks');
  },
  submitOnboardingTask: async (taskId: string, payload: Record<string, any> = {}) => {
    return apiRequest<any>(`/employee/onboarding/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getEmployeeCases: async () => {
    return apiRequest<HRCaseItem[]>('/employee/cases');
  },
  executeEmployeeAction: async (actionName: string, payload: Record<string, any> = {}) => {
    return apiRequest<any>('/employee/cases/execute-action', {
      method: 'POST',
      body: JSON.stringify({ action_name: actionName, payload }),
    });
  },
  chatWithHarper: async (message: string) => {
    return apiRequest<HarperChatResponse>('/employee/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // Research Evaluation & Fairness Lab (Phase 6)
  getFairnessPersonas: async () => {
    return apiRequest<FairnessPersona[]>('/research/fairness/personas');
  },
  runFairnessAudit: async () => {
    return apiRequest<FairnessAuditResult>('/research/fairness/run-audit', { method: 'POST' });
  },
  getResearchBenchmarksSummary: async () => {
    return apiRequest<ResearchBenchmarksSummary>('/research/benchmarks/summary');
  },
  runLiveLatencyAudit: async (iterations: number = 5) => {
    return apiRequest<LiveLatencyAudit>('/research/benchmarks/run-latency-audit', {
      method: 'POST',
      body: JSON.stringify({ iterations }),
    });
  },
};
