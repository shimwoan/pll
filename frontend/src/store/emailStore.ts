import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { emailApi } from '@/lib/api'
import type { Email, ToastItem } from '@/lib/api'

interface EmailFilters {
  status: string
  category: string
  search: string
}

interface EmailStore {
  emails: Email[]
  allEmails: Email[]
  selectedEmail: Email | null
  filters: EmailFilters
  isLoading: boolean
  isSyncing: boolean

  fetchEmails: (silent?: boolean) => Promise<void>
  fetchEmail: (id: string) => Promise<void>
  syncEmails: () => Promise<{ synced: number; error?: string }>
  confirmEmail: (id: string) => Promise<void>
  editEmail: (id: string, data: { finalCategory?: string; workTypeTitle?: string; matchedCaseId?: string }) => Promise<void>
  unclassifyEmail: (id: string) => Promise<void>
  setFilter: (key: keyof EmailFilters, value: string) => void
  clearFilters: () => void
  toasts: ToastItem[]
  freshToastId: string | null
  addToast: (item: ToastItem) => void
  removeToast: (id: string) => void
  clearFreshToast: () => void
  restoreToasts: () => Promise<void>
}

// Cancels any in-flight fetchEmails call when a newer one starts
let fetchController: AbortController | null = null

export const useEmailStore = create<EmailStore>()(persist((set, get) => ({
  emails: [],
  allEmails: [],
  selectedEmail: null,
  filters: { status: '', category: '', search: '' },
  isLoading: false,
  isSyncing: false,
  toasts: [],
  freshToastId: null,

  fetchEmails: async (silent = false) => {
    fetchController?.abort()
    const controller = new AbortController()
    fetchController = controller

    if (!silent) set({ isLoading: true })
    try {
      const { filters } = get()
      const hasFilter = filters.status || filters.category || filters.search
      const signal = controller.signal
      const [emails, allEmails] = await Promise.all([
        emailApi.list({
          status: filters.status || undefined,
          category: filters.category || undefined,
          search: filters.search || undefined,
        }, signal),
        hasFilter ? emailApi.list({}, signal) : Promise.resolve(null),
      ])
      if (!signal.aborted) {
        set({ emails, ...(allEmails !== null ? { allEmails } : { allEmails: emails }) })
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
      throw err
    } finally {
      if (!controller.signal.aborted && !silent) set({ isLoading: false })
    }
  },

  fetchEmail: async (id) => {
    const email = await emailApi.get(id)
    set({ selectedEmail: email })
  },

  syncEmails: async () => {
    set({ isSyncing: true })
    try {
      const result = await emailApi.sync()
      await get().fetchEmails()
      return result
    } finally {
      set({ isSyncing: false })
    }
  },

  confirmEmail: async (id) => {
    await emailApi.confirm(id)
    get().removeToast(id)
    await get().fetchEmails(true)
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  editEmail: async (id, data) => {
    await emailApi.edit(id, data)
    get().removeToast(id)
    await get().fetchEmails(true)
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  unclassifyEmail: async (id) => {
    await emailApi.unclassify(id)
    get().removeToast(id)
    await get().fetchEmails(true)
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }))
  },

  clearFilters: () => {
    set({ filters: { status: '', category: '', search: '' } })
  },

  addToast: (item) => {
    set((state) => {
      const exists = state.toasts.some((t) => t.id === item.id)
      if (exists) {
        // 재분류된 요약으로 업데이트, 새 toast 애니메이션 없이
        return { toasts: state.toasts.map((t) => t.id === item.id ? { ...t, ...item } : t) }
      }
      return { toasts: [item, ...state.toasts], freshToastId: item.id }
    })
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  clearFreshToast: () => set({ freshToastId: null }),

  restoreToasts: async () => {
    const [pending, unclassified] = await Promise.all([
      emailApi.list({ status: 'PENDING_REVIEW' }),
      emailApi.list({ status: 'UNCLASSIFIED' }),
    ])
    const all = [...pending, ...unclassified]
    const pendingIds = new Set(all.map((e) => e.id))
    const items: ToastItem[] = all
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 20)
      .map((e) => ({
        id: e.id,
        actionCategory: e.actionCategory ?? 'Unclassified',

        aiSummary: e.aiSummary ?? '',
        subject: e.subject,
        fromName: e.fromName,
        receivedAt: e.receivedAt,
        matchedCaseId: e.matchedCaseId,
      }))
    // Replace toasts: remove confirmed ones, merge with fresh DB data
    set((state) => {
      const itemMap = new Map(items.map((i) => [i.id, i]))
      const kept = state.toasts
        .filter((t) => pendingIds.has(t.id))
        .map((t) => itemMap.has(t.id) ? { ...t, ...itemMap.get(t.id) } : t)
      const keptIds = new Set(kept.map((t) => t.id))
      const added = items.filter((i) => !keptIds.has(i.id))
      const merged = [...kept, ...added].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )
      return { toasts: merged }
    })
  },
}), {
  name: 'pll-toasts',
  partialize: (state) => ({ toasts: state.toasts, freshToastId: null }),
}))
