import { create } from 'zustand'
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
  addToast: (item: ToastItem) => void
}

// Cancels any in-flight fetchEmails call when a newer one starts
let fetchController: AbortController | null = null

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: [],
  allEmails: [],
  selectedEmail: null,
  filters: { status: '', category: '', search: '' },
  isLoading: false,
  isSyncing: false,
  toasts: [],

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
    await get().fetchEmails(true)
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  editEmail: async (id, data) => {
    await emailApi.edit(id, data)
    await get().fetchEmails(true)
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  unclassifyEmail: async (id) => {
    await emailApi.unclassify(id)
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
      if (state.toasts.some((t) => t.id === item.id)) return state
      return { toasts: [item, ...state.toasts] }
    })
  },
}))
