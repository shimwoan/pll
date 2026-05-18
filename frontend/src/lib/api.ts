import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

export interface Email {
  id: string
  messageId: string
  subject: string
  bodyPreview: string
  body: string | null
  fromAddress: string
  fromName: string
  toAddress: string
  receivedAt: string
  aiCategory: string | null
  aiConfidence: number | null
  aiReason: string | null
  actionCategory: string | null
  aiSummary: string | null
  finalCategory: string | null
  workTypeTitle: string | null
  matchedCaseId: string | null
  matchMethod: string | null
  status: 'PENDING_REVIEW' | 'CONFIRMED' | 'EDITED' | 'UNCLASSIFIED'
  webLink: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  case?: { caseNumber: string; clientName: string } | null
}

export const emailApi = {
  list: (params?: { status?: string; category?: string; search?: string }, signal?: AbortSignal) =>
    api.get<Email[]>('/emails', { params, signal }).then((r) => r.data),

  get: (id: string) =>
    api.get<Email>(`/emails/${id}`).then((r) => r.data),

  unclassified: () =>
    api.get<Email[]>('/emails/unclassified').then((r) => r.data),

  sync: () =>
    api.post<{ synced: number }>('/emails/sync').then((r) => r.data),

  backfillBodies: () =>
    api.post<{ updated: number; error?: string }>('/emails/backfill-bodies').then((r) => r.data),

  confirm: (id: string) =>
    api.patch<Email>(`/emails/${id}/confirm`).then((r) => r.data),

  edit: (id: string, data: { finalCategory?: string; workTypeTitle?: string; matchedCaseId?: string }) =>
    api.patch<Email>(`/emails/${id}/edit`, data).then((r) => r.data),

  unclassify: (id: string) =>
    api.patch<Email>(`/emails/${id}/unclassify`).then((r) => r.data),
}

export interface ToastItem {
  id: string
  actionCategory: string
  aiSummary: string
  subject: string
  fromName: string
  receivedAt: string
}

export const authApi = {
  me: () => api.get<{ authenticated: boolean; email?: string; name?: string }>('/auth/me').then((r) => r.data),
  login: () => { window.location.href = `${import.meta.env.VITE_API_URL}/auth/login` },
  logout: () => { window.location.href = `${import.meta.env.VITE_API_URL}/auth/logout` },
}
