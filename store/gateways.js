import { defineStore } from 'pinia'
import { useMetersStore } from './meters';
import logger from '../utils/clientLogger'

export const useGatewaysStore = defineStore('gatewaysStore', {
    state: () => ({
      gateways: [],
      selectedLocationId: null,
      filteredGateways: [],
      loadingInstruments: false,
    }),
    actions: {
    async fetchGateways() {
      try {
        const response = await fetch('api/gateways/gateways');
        if (!response.ok) {
          throw new Error('Failed to fetch gateways');
        }
        this.gateways = await response.json();
        logger.debug(`Fetched ${this.gateways.length} gateways`);
      } catch (error) {
        logger.error('Error fetching gateways', error);
      }
    },

    async fetchGatewaysByLocationId(locationId) {
      this.loadingInstruments = true
      try {
        const response = await fetch(`/api/gateways/${locationId}`);
        if (!response.ok) throw new Error('Failed to fetch gateways');

        const gateways = await response.json()
        this.gateways = gateways

        logger.debug(`Fetched ${gateways.length} gateways for location ${locationId}`);

        const metersStore = useMetersStore()
        await Promise.all(gateways.map(gateway => metersStore.fetchMetersByGatewayId(gateway._id)))

        this.filteredGateways = gateways
      } catch (error) {
        logger.error('Error fetching gateways by location', error);
      } finally {
        this.loadingInstruments = false
      }
    },

      applyGatewayUpdate(gatewayId, updatedFields) {
        logger.debug('Applying gateway update', gatewayId, updatedFields);
        const index = this.gateways.findIndex((gateway) => gateway._id === gatewayId);
        if (index !== -1) {
          Object.assign(this.gateways[index], updatedFields);
          this.gateways = [...this.gateways];
        }
      },

      setSelectedLocationId(locationId) {
        this.selectedLocationId = locationId
        const metersStore = useMetersStore()
        metersStore.clearFilteredMeters()
        this.filteredGatewaysByLocation(locationId)
      },

      filteredGatewaysByLocation() {
        if(this.selectedLocationId) {
            this.filteredGateways = this.gateways.filter(gateway => gateway.locationId === this.selectedLocationId )
        }
      },

      setMetersStoreGatewayId(gatewayId) {
        const metersStore = useMetersStore()
        metersStore.fetchMetersByGatewayId(gatewayId)
      }
    }
  });
