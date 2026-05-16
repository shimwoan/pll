import { create } from 'zustand'
import { emailApi } from '@/lib/api'
import type { Email } from '@/lib/api'

interface EmailFilters {
  status: string
  category: string
  search: string
}

interface EmailStore {
  emails: Email[]
  selectedEmail: Email | null
  filters: EmailFilters
  isLoading: boolean
  isSyncing: boolean

  fetchEmails: () => Promise<void>
  fetchEmail: (id: string) => Promise<void>
  syncEmails: () => Promise<{ synced: number }>
  confirmEmail: (id: string) => Promise<void>
  editEmail: (id: string, data: { finalCategory?: string; workTypeTitle?: string; matchedCaseId?: string }) => Promise<void>
  setFilter: (key: keyof EmailFilters, value: string) => void
  clearFilters: () => void
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: [],
  selectedEmail: null,
  filters: { status: '', category: '', search: '' },
  isLoading: false,
  isSyncing: false,

  fetchEmails: async () => {
    set({ isLoading: true })
    try {
      const { filters } = get()
      const emails = await emailApi.list({
        status: filters.status || undefined,
        category: filters.category || undefined,
        search: filters.search || undefined,
      })
      set({ emails })
    } finally {
      set({ isLoading: false })
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
    await get().fetchEmails()
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  editEmail: async (id, data) => {
    await emailApi.edit(id, data)
    await get().fetchEmails()
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }))
  },

  clearFilters: () => {
    set({ filters: { status: '', category: '', search: '' } })
  },
}))
