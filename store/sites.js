import { defineStore } from 'pinia'
import logger from '../utils/clientLogger'

export const useSitesStore = defineStore('sitesStore', {
  state: () => ({
    sites: [],
    selectedSite: null,
  }),
  actions: {
    async fetchSites() {
      try {
        const response = await fetch('/api/sites/sites');
        if (!response.ok) {
          throw new Error('Failed to fetch sites');
        }
        this.sites = await response.json();
      } catch (error) {
        logger.error('Error fetching sites', error);
      }
    },
    addSite(site) {
      if (!site?._id) return
      const exists = this.sites.some((existing) => existing._id === site._id);
      if (!exists) {
        this.sites = [...this.sites, site];
      }
    },
    applySiteUpdate(siteId, updatedFields) {
      logger.debug('Applying site update', siteId, updatedFields);
      const index = this.sites.findIndex((site) => site._id === siteId);
      if (index !== -1) {
        this.sites[index] = { ...this.sites[index], ...updatedFields };
        this.sites = [...this.sites];
      }
    },
    setSelectedSite(site) {
      this.selectedSite = site;
    }
  }
});
