<template>
  <div class="dashboard">
    <main class="main-content">
      <div v-if="authStore.user">
        <div class="top-bar">
          <span class="welcome">{{ authStore.user.email }}</span>
          <span
            class="connection"
            :class="connectionError ? 'is-down' : 'is-up'"
          >
            <span class="dot" />
            {{ connectionError ? 'Reconnecting…' : 'Live' }}
          </span>
        </div>

        <Breadcrumb :crumbs="crumbs" />

        <div class="step-content">
          <div
            v-if="step === 'sites'"
            class="card-grid"
          >
            <SiteCard
              v-for="site in sitesStore.sites"
              :key="site._id"
              :site="site"
              @select="selectSite"
            />
          </div>

          <div
            v-else-if="step === 'locations'"
            class="card-grid"
          >
            <LocationCard
              v-for="location in locationsStore.filteredLocations"
              :key="location._id"
              :location="location"
              @select="selectLocation"
            />
          </div>

          <div
            v-else-if="step === 'instruments'"
            class="card-grid"
          >
            <MeterCard
              v-for="meter in metersStore.filteredMeters"
              :key="meter._id"
              :meter="meter"
              @select="selectMeter"
            />
            <p
              v-if="gatewaysStore.loadingInstruments"
              class="empty-hint"
            >
              Loading instruments…
            </p>
            <p
              v-else-if="!metersStore.filteredMeters.length"
              class="empty-hint"
            >
              No instruments found for this location.
            </p>
          </div>

          <MeterDetail
            v-else-if="step === 'detail' && metersStore.selectedMeter"
            :meter="metersStore.selectedMeter"
          />
        </div>

        <ActivityChatBox v-if="authStore.userRole === 'admin'" />
      </div>
    </main>
  </div>
</template>

<script setup>

  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { io } from 'socket.io-client';
  import { useRuntimeConfig } from '#imports'
  import { useAuthStore } from '../store/auth';
  import { useSitesStore } from '../store/sites';
  import { useLocationsStore } from '../store/locations';
  import { useGatewaysStore } from '../store/gateways'
  import { useMetersStore } from '../store/meters'
  import { useActivityStore } from '../store/activity'
  import SiteCard from '../components/common/SiteCard'
  import LocationCard from '../components/common/LocationCard'
  import MeterCard from '../components/common/MeterCard'
  import MeterDetail from '../components/common/MeterDetail'
  import Breadcrumb from '../components/common/Breadcrumb'
  import ActivityChatBox from '../components/admin/ActivityChatBox'
  import logger from '../utils/clientLogger'

  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const sitesStore = useSitesStore()
  const locationsStore = useLocationsStore()
  const gatewaysStore = useGatewaysStore()
  const metersStore = useMetersStore();
  const activityStore = useActivityStore();

  const step = ref('sites')
  const selectedSite = ref(null)
  const selectedLocation = ref(null)
  const connectionError = ref(false)

  let socket

  onMounted(() => {
    if (!authStore.user) return

    const websocketUri = config.public.websocketUri || 'http://127.0.0.1:3020'

    socket = io(websocketUri, {
      autoConnect: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      logger.info('Connected to WebSocket server');
      socket.emit('register', { userId: authStore.user._id, role: authStore.user.role });
    });

    socket.on('force-logout', ({ reason }) => {
      logger.warn(`Session terminated by server: ${reason}`)
      authStore.logout()
    })

    socket.on('site-change', (change) => {
      logger.debug('Site change received', change);
      if (change.operationType === 'insert') {
        sitesStore.addSite(change.fullDocument);
      } else {
        sitesStore.applySiteUpdate(change.documentKey._id, change.updateDescription.updatedFields);
      }
    });

    socket.on('location-change', (change) => {
      logger.debug('Location change received', change);
      locationsStore.applyLocationUpdate(change.documentKey._id, change.updateDescription.updatedFields)
    })

    socket.on('gateway-change', (change) => {
      logger.debug('Gateway change received', change);
      gatewaysStore.applyGatewayUpdate(change.documentKey._id, change.updateDescription.updatedFields)
    })

    socket.on('meter-change', (change) => {
      logger.debug('Meter change received', change);
      metersStore.applyMeterUpdate(change.documentKey._id, change.updateDescription.updatedFields)
    })

    socket.on('data-activity', (entry) => {
      logger.debug('Data activity received', entry);
      activityStore.addEntry(entry)
    })

    socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error', error);
      connectionError.value = true;
    });

    sitesStore.fetchSites();
  })

  watch(
    () => locationsStore.locations,
    () => {
      locationsStore.filterLocationsBySite()
    },
    { deep: true }
  )

  onUnmounted(() => {
    if (!socket) return
    socket.disconnect();
    logger.info('WebSocket connection closed');
  })

  const selectSite = (site) => {
    selectedSite.value = site
    selectedLocation.value = null
    metersStore.clearSelectedMeter()
    locationsStore.setSelectedSiteId(site._id)
    locationsStore.fetchLocationsBySiteId(site._id)
    step.value = 'locations'
  }

  const selectLocation = (location) => {
    selectedLocation.value = location
    metersStore.clearSelectedMeter()
    gatewaysStore.setSelectedLocationId(location._id)
    gatewaysStore.fetchGatewaysByLocationId(location._id)
    step.value = 'instruments'
  }

  const selectMeter = (meter) => {
    metersStore.setSelectedMeter(meter)
    step.value = 'detail'
  }

  const goToSites = () => {
    step.value = 'sites'
  }

  const goToLocations = () => {
    step.value = 'locations'
  }

  const goToInstruments = () => {
    step.value = 'instruments'
  }

  const crumbs = computed(() => {
    const trail = [
      { label: 'Sites', onClick: goToSites, active: step.value === 'sites' }
    ]

    if (selectedSite.value && step.value !== 'sites') {
      trail.push({
        label: selectedSite.value.siteName,
        onClick: goToLocations,
        active: step.value === 'locations'
      })
    }

    if (selectedLocation.value && (step.value === 'instruments' || step.value === 'detail')) {
      trail.push({
        label: selectedLocation.value.locationName,
        onClick: goToInstruments,
        active: step.value === 'instruments'
      })
    }

    if (step.value === 'detail' && metersStore.selectedMeter) {
      trail.push({
        label: `Meter #${metersStore.selectedMeter.meterId}`,
        active: true
      })
    }

    return trail
  })
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
}

.main-content {
  padding: 10px 20px 40px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0 0;
}

.welcome {
  color: var(--ink-secondary);
  font-size: 0.9em;
}

.connection {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
  color: var(--ink-secondary);
}

.connection .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.connection.is-up .dot {
  background-color: var(--status-good);
  box-shadow: 0 0 6px var(--status-good);
}

.connection.is-down .dot {
  background-color: var(--status-critical);
}

.card-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 6px 0;
}

.empty-hint {
  color: var(--ink-muted);
  padding: 12px 6px;
}

.step-content {
  padding-top: 4px;
}
</style>
