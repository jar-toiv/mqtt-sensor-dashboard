<template>
  <div class="layout-container">
    <Header />
    <main class="content-area">
      <NuxtPage />
    </main>
    <Footer />
  </div>
</template>

<script setup>
  import Header from '~/components/common/Header.vue'
  import Footer from '~/components/common/Footer.vue'
</script>
