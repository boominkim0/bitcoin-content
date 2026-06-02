<template>
  <MobileBitcoinExplorer
    v-if="deviceKind === 'mobile'"
    :explorer="explorer"
  />
  <DesktopBitcoinExplorer
    v-else
    :explorer="explorer"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, watchEffect } from 'vue'
import DesktopBitcoinExplorer from '@/components/explorer/DesktopBitcoinExplorer.vue'
import MobileBitcoinExplorer from '@/components/explorer/MobileBitcoinExplorer.vue'
import { useBitcoinExplorer } from '@/composables/useBitcoinExplorer'
import { useDeviceKind } from '@/composables/useDeviceKind'

const { deviceKind } = useDeviceKind()
const explorer = useBitcoinExplorer(deviceKind)

watchEffect(() => {
  document.body.classList.toggle('device-mobile', deviceKind.value === 'mobile')
  document.body.classList.toggle('device-desktop', deviceKind.value === 'desktop')
})

onBeforeUnmount(() => {
  document.body.classList.remove('device-mobile', 'device-desktop')
})
</script>
