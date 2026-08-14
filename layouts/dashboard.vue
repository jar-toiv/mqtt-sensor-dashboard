<template>
  <div>
    <Header />
    <div class="dashboard-layout">
      <div class="main-content">
        <main>
          <Nuxt />
        </main>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup>
  import Header from '~/components/common/Header.vue'
  import Footer from '~/components/common/Footer.vue'
</script>

<style>
  .dashboard-layout {
    display: flex;
    /* Other styles to align side panels and main content */
  }

  .main-content {
    flex-grow: 1;
    padding: 10px;
    /* Additional styling if needed for the main content area */
  }
</style>
