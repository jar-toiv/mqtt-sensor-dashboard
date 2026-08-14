import { defineNuxtPlugin } from '#imports'
import { library, config } from '@fortawesome/fontawesome-svg-core'
import { faUser, faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faUser, faGear)

config.autoAddCss = false

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.component('FontAwesomeIcon', FontAwesomeIcon)
})
