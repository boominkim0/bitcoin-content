import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false
  let hadController = Boolean(navigator.serviceWorker.controller)

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true
      return
    }
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL
    })
      .then((registration) => {
        const activateWaitingWorker = (worker: ServiceWorker | null) => {
          worker?.postMessage({ type: 'SKIP_WAITING' })
        }

        activateWaitingWorker(registration.waiting)

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          if (!worker) return

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaitingWorker(worker)
            }
          })
        })

        registration.update().catch(() => {
          // The current app shell can keep running until the next update check.
        })

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {
              // Ignore transient offline/update failures.
            })
          }
        })
      })
      .catch(() => {
        // The page remains fully usable without offline caching.
      })
  })
}
