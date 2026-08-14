// https://nuxt.com/docs/api/configuration/nuxt-config
// import dns from 'dns';
// dns.setServers([])


import { defineNuxtConfig } from "nuxt/config"


export default defineNuxtConfig({
  compatibilityDate: '2026-08-12',
  devtools: { enabled: true },
  css: ['~/assets/styles/main.css'],
  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpires: process.env.JWT_EXPIRES,
    public: {
      websocketUri: process.env.WS_URI,
    }
  },
  modules: ['@nuxtjs/eslint-module','@pinia/nuxt', 'nuxt-mongoose'],
  plugins: ['~/plugins/websocket.client.js'],
  mongoose: {
    uri: process.env.MONGODB_URI,
    options: {}
  },
})

// modules: ['@pinia/nuxt', 'nuxt-mongoose'],
