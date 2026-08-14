import { defineStore } from 'pinia'
import logger from '../utils/clientLogger'

export const useMetersStore = defineStore('metersStore', {
  state: () => ({
    meters: [],
    selectedGateway: null,
    selectedMeter: null,
    filteredMeters:[]
  }),

  actions: {
    async fetchMetersByGatewayId(gatewayId) {
      try {
        const response = await fetch(`/api/meters/${gatewayId}`);
        if (!response.ok) throw new Error('Failed to fetch meters');
         const metersForGateway  = await response.json();

         this.filteredMeters.push(...metersForGateway)
         logger.debug(`Fetched ${metersForGateway.length} meters for gateway ${gatewayId}`);
    } catch (error) {
        logger.error('Error fetching meters by gateway', error);
      }
    },

    clearFilteredMeters() {
        this.filteredMeters = []
    },

    async fetchMeters() {
      try {
        const response = await fetch('api/meters/meters');
        if (!response.ok) {
          throw new Error('Failed to fetch meters');
        }
        this.meters = await response.json();
        logger.debug(`Fetched ${this.meters.length} meters`);
      } catch (error) {
        logger.error('Error fetching meters', error);
      }
    },

    applyMeterUpdate(meterId, updatedFields) {
        logger.debug('Applying meter update', meterId, updatedFields);

        const index = this.meters.findIndex(meter => meter._id === meterId);
        if (index !== -1) {
          Object.keys(updatedFields).forEach(key => {
            this.meters[index][key] = updatedFields[key];
          });
          this.meters = [...this.meters];
        }

        const filteredIndex = this.filteredMeters.findIndex(meter => meter._id === meterId);
        if (filteredIndex !== -1) {
          Object.keys(updatedFields).forEach(key => {
            this.filteredMeters[filteredIndex][key] = updatedFields[key];
          });
          this.filteredMeters = [...this.filteredMeters];
        }

        if (this.selectedMeter?._id === meterId) {
          this.selectedMeter = { ...this.selectedMeter, ...updatedFields };
        }
      },
      setSelectedGateway(gatewayId) {
        this.selectedGateway = gatewayId
        this.filterMetersByGateway()
      },

    filterMetersByGateway() {
      if(this.selectedGateway) {
        this.filteredMeters = this.meters.filter(meter => meter.gatewayId === this.selectedGateway)
      } else {
        this.filteredMeters
      }
    },

    setSelectedMeter(meter) {
      this.selectedMeter = meter
    },

    clearSelectedMeter() {
      this.selectedMeter = null
    },
  },
})
