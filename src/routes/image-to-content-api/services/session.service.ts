import { v4 as uuidv4 } from 'uuid';

interface DocumentSession {
  session_id: string;
  created_at: string;
  updated_at: string;
  document_type: string | null;
  pages: number;
  extractions: { trace_id: string; modules: string[]; created_at: string; summary: string }[];
  lineage: { step: number; action: string; timestamp: string }[];
}

const sessions = new Map<string, DocumentSession>();

export function createDocumentSession(document_type?: string): DocumentSession {
  const session_id = `docsess_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const session: DocumentSession = {
    session_id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    document_type: document_type || null, pages: 0, extractions: [], lineage: [],
  };
  sessions.set(session_id, session);
  return session;
}

export function getDocumentSession(session_id: string): DocumentSession | null {
  return sessions.get(session_id) || null;
}

export function updateDocumentSession(session_id: string, extraction: { trace_id: string; modules: string[]; summary: string }): void {
  const session = sessions.get(session_id);
  if (!session) return;
  session.extractions.push({ ...extraction, created_at: new Date().toISOString() });
  session.lineage.push({ step: session.extractions.length, action: 'extraction', timestamp: new Date().toISOString() });
  session.pages = session.extractions.length;
  session.updated_at = new Date().toISOString();
  sessions.set(session_id, session);
}

export function listDocumentSessions(): DocumentSession[] {
  return Array.from(sessions.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}
