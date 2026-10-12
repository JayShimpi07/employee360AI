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
};
