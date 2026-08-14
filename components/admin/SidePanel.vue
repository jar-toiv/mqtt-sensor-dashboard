<template>
  <div
    v-if="authStore.isLoggedIn"
    class="side-panel"
  >
    <div class="search-container">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search for site"
      >
      <span
        v-if="searchTerm"
        class="clear-icon"
        @click="searchTerm = ''"
      >✖</span>
    </div>

    <ul v-if="filteredSites.length">
      <li
        v-for="site in filteredSites"
        :key="site.id"
      >
        <!-- Site as a button, showing address -->
        <button @click="selectSite(site)">
          {{ site.address }}
        </button>

        <!-- Display sensors if this site is selected -->
        <div v-if="selectedSite && selectedSite.id === site.id">
          <ul>
            <li
              v-for="sensorType in uniqueSensorTypes(site)"
              :key="sensorType"
            >
              <button
                id="sensor-button"
                @click="selectSensorType(sensorType)"
              >
                {{ sensorType }}
              </button>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { useAuthStore } from '../../store/auth'

  const searchTerm = ref('')
  const authStore = useAuthStore()
  const selectedSite = computed(() => dataStore.selectedSite)

  const filteredSites = computed(() => {
    const sortedSites = [...dataStore.sites].sort((a, b) => a.address.localeCompare(b.address))

    return searchTerm.value
      ? sortedSites.filter(site => site.address.toLowerCase().includes(searchTerm.value.toLowerCase()))
      : sortedSites.slice(0, 3)
  })

  const selectSite = site => {
    // selectedSite.value = site;
    dataStore.setSelectedSite(site)
  }

  const uniqueSensorTypes = site => {
    const sensorIds = site.sensors
    const sensorTypes = sensorIds.map(id => {
      const sensor = dataStore.sensors.find(s => s.id === id)
      return sensor ? sensor.type : 'Unknown'
    })
    return [...new Set(sensorTypes)]
  }

  const selectSensorType = sensorType => {
    dataStore.setSelectedSensorType(sensorType)
  }
</script>

<style>
  .side-panel {
    /* flex: 0 0 250px; Fixed width, no grow, no shrink */
    height: 100%; /* Full height of the parent container */
    width: 250px;
    min-height: 500px;
    box-shadow: 4px 0px 6px rgba(5, 46, 85, 0.455);
    background-color: rgb(5, 46, 85);
    z-index: 1000;
  }
  .search-container {
    position: relative;
    margin-top: 20px;
    margin-left: 15px;
    padding-bottom: 10px;
    display: flex;
    align-items: center;
  }
  .search-container .clear-icon {
    position: absolute;
    right: 25px;
    top: 34%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #18181880;
  }

  .search-container input {
    width: calc(100% - 20px);
    padding: 5px 10px 5px 30px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  ul {
    list-style-type: none;
    padding-left: 15px;
    margin-top: 3px;
  }

  li {
    margin-bottom: 3px;
  }

  .side-panel button {
    width: 150px;
    background-color: #1e81b0;
    color: white;
    border: none;
    padding: 5px 20px;
    margin: 2px 0;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background-color 0.3s,
      box-shadow 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    font-size: 0.7em;
  }

  .side-panel button:hover {
    background-color: #76b5c5;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  #sensor-button {
    background-color: #76b5c5;
  }

  #sensor-button:hover {
    background-color: #abdbe3;
  }
</style>
