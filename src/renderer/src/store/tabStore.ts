import { create } from 'zustand'

export interface Tab {
  id: string
  url: string
  title: string
  isLoading: boolean
  favicon?: string
}

interface TabStore {
  tabs: Tab[]
  activeTabId: string
  addTab: (url?: string) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, updates: Partial<Tab>) => void
  reorderTabs: (newTabs: Tab[]) => void
  getActiveTab: () => Tab | undefined
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [
    {
      id: '1',
      url: 'https://ayen.in',
      title: 'Ayen',
      isLoading: false,
      favicon: undefined
    }
  ],
  activeTabId: '1',

  addTab: (url = 'https://ayen.in') => {
    const newTab: Tab = {
      id: Date.now().toString(),
      url,
      title: 'New Tab',
      isLoading: true
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))
  },

  removeTab: (id: string) => {
    set((state) => {
      const newTabs = state.tabs.filter((tab) => tab.id !== id)

      // If we're removing the active tab, switch to another tab
      let newActiveTabId = state.activeTabId
      if (state.activeTabId === id && newTabs.length > 0) {
        const removedIndex = state.tabs.findIndex((tab) => tab.id === id)
        const newIndex = Math.max(0, removedIndex - 1)
        newActiveTabId = newTabs[newIndex].id
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId
      }
    })
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id })
  },

  updateTab: (id: string, updates: Partial<Tab>) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab))
    }))
  },

  reorderTabs: (newTabs: Tab[]) => {
    set({ tabs: newTabs })
  },

  getActiveTab: () => {
    const state = get()
    return state.tabs.find((tab) => tab.id === state.activeTabId)
  }
}))
