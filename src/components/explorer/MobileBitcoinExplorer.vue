<template>
  <main
    class="lego-stage mobile-stage"
  >
    <div class="blocks-container">
      <BlockStack :explorer="explorer" variant="mobile" />
    </div>

    <ChainScrollbar :explorer="explorer" variant="mobile" />

    <div v-if="errorMessage" class="load-state">{{ errorMessage }}</div>
    <ServerStatusPanel
      variant="mobile"
      @open-server="closeDockModals"
      @open-network="openNetworkModal"
      @open-settings="openSettingsModal"
    />
    <ExplorerModals :explorer="explorer" variant="mobile" />
  </main>
</template>

<script setup lang="ts">
import ServerStatusPanel from '@/components/ServerStatusPanel.vue'
import type { BitcoinExplorerController } from '@/composables/useBitcoinExplorer'
import BlockStack from './BlockStack.vue'
import ChainScrollbar from './ChainScrollbar.vue'
import ExplorerModals from './ExplorerModals.vue'

const props = defineProps<{
  explorer: BitcoinExplorerController
}>()

const {
  errorMessage,
  closeDockModals,
  openNetworkModal,
  openSettingsModal
} = props.explorer
</script>

<style scoped lang="scss">
.lego-stage {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  margin: 0 auto;
  padding: max(18px, env(safe-area-inset-top)) 8px calc(106px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
}

.blocks-container {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  padding: 0 56px 0 8px;
}

.load-state {
  position: fixed;
  left: 50%;
  bottom: calc(86px + env(safe-area-inset-bottom));
  max-width: min(420px, calc(100% - 28px));
  padding: 10px 14px;
  color: var(--danger);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.58), rgba(255, 234, 225, 0.32)),
    rgba(255, 255, 255, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 800;
  transform: translateX(-50%);
  box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
}
</style>
