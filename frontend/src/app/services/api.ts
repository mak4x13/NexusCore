/**
 * NexusCore API Service
 * Connects to the FastAPI backend at http://localhost:8000
 */

const API_BASE =
  typeof window !== 'undefined' && window.location.port === '8000'
    ? '' // same origin when served by uvicorn
    : 'http://localhost:8000';

export const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('nexuscore_demo_token');
  if (token) headers['X-Demo-Token'] = token;
  return headers;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    const token = prompt('Demo token required:');
    if (token) {
      localStorage.setItem('nexuscore_demo_token', token.trim());
      res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
    }
  }
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

// ─── Features ────────────────────────────────────────────────────────────────
export interface ApiFeature {
  id: string;
  text: string;
  created_at: string;
}

export const createFeature = (text: string) =>
  post<ApiFeature>('/api/features', { text });

export const listFeatures = () => get<ApiFeature[]>('/api/features');

// ─── Messages ────────────────────────────────────────────────────────────────
export interface ApiMessage {
  id: string;
  feature_id?: string;
  author: string;
  role: string;
  content: string;
  created_at: string;
}

export const listMessages = () => get<ApiMessage[]>('/api/messages');

// ─── Actions ─────────────────────────────────────────────────────────────────
export type ActionStatus = 'HELD' | 'ALLOWED' | 'BLOCKED';

export interface ApiAction {
  id: string;
  feature_id?: string;
  agent: string;
  action: string;
  risk: string;
  status: ActionStatus;
  decided_by?: string;
  reason?: string;
  created_at: string;
  decided_at?: string;
}

export const proposeAction = (payload: {
  feature_id?: string;
  agent: string;
  action: string;
  risk: string;
}) => post<ApiAction>('/api/actions/propose', payload);

export const decideAction = (
  actionId: string,
  allow: boolean,
  decidedBy = 'User Dashboard',
  reason = ''
) =>
  post<ApiAction>(`/api/actions/${actionId}/decide`, {
    allow,
    decided_by: decidedBy,
    reason: reason || (allow ? 'Approved by user.' : 'Rejected by user.'),
  });

export const listActions = () => get<ApiAction[]>('/api/actions');

// ─── Band ─────────────────────────────────────────────────────────────────────
export interface BandStatus {
  configured: boolean;
  room: string;
  agents: string[];
  missing: string[];
}

export interface BandRoom {
  room: string;
  link: string;
}

export const triggerBand = (text: string) =>
  post<{ sent: boolean; mentioned: string[] }>('/api/band/trigger', {
    text,
    mention: ['proposer', 'risk', 'compliance'],
  });

export const getBandStatus = () => get<BandStatus>('/api/band/status');
export const getBandRoom = () => get<BandRoom>('/api/band/room');
export const getBandMessages = () => get<ApiMessage[]>('/api/band/messages');

// ─── Health ──────────────────────────────────────────────────────────────────
export const getHealth = () => get<{ ok: boolean }>('/api/health');
