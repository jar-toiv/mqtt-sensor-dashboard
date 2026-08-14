import { defineStore } from 'pinia'
import logger from '../utils/clientLogger'

export const useLocationsStore = defineStore('locationsStore', {
  state: () => ({
    locations:[],
    selectedLocation: null,
    selectedSiteId: null,
    filteredLocations: [],
  }),
  actions: {
        async fetchLocations() {
          try {
            const response = await fetch('api/locations/locations');
            if (!response.ok)throw new Error('Failed to fetch locations');
            this.locations = await response.json();
          } catch (error) {
            logger.error('Error fetching locations', error);
          }
        },

        async fetchLocationsBySiteId(siteId) {

        const response = await fetch(`api/locations/${siteId}`)
        if(!response.ok) {
          throw new Error('Failed to fetch locations for site')
        }
       
        this.filteredLocations = await response.json()
        },
        applyLocationUpdate(locationId, updatedFields) {
          logger.debug('Applying location update', locationId, updatedFields);


          const index = this.locations.findIndex((location) => location._id === locationId);
          if (index !== -1) {
            Object.keys(updatedFields).forEach((key) => {
              this.locations[index][key] = updatedFields[key];
            });
            this.locations = [...this.locations];
          }
        
          const filteredIndex = this.filteredLocations.findIndex((location) => location._id === locationId);
          if (filteredIndex !== -1) {
            Object.keys(updatedFields).forEach((key) => {
              this.filteredLocations[filteredIndex][key] = updatedFields[key];
            });
            this.filteredLocations = [...this.filteredLocations];
          }
        },

        setSelectedSiteId(siteId) {
          this.selectedSiteId = siteId;
          this.filterLocationsBySite();
        },

        filterLocationsBySite() {
          if(this.selectedSiteId) {
            this.filteredLocations = this.locations.filter(location => location.siteId === this.selectedSiteId)

          } else {
            this.filteredLocations
          }
    },
    setSelectedLocation(location) {
      this.selectedLocation = location;
    }
      },
})
