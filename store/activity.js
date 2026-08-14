import { defineStore } from 'pinia'

export const useActivityStore = defineStore('activityStore', {
  state: () => ({
    entries: []
  }),

  actions: {
    addEntry(entry) {
      this.entries = [entry, ...this.entries]
    },

    clear() {
      this.entries = []
    }
  }
})
