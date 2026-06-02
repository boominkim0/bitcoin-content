<template>
  <main
    class="lego-stage mobile-stage"
  >
    <div class="blocks-container">
      <BlockStack :explorer="explorer" variant="mobile" />
    </div>

    <ChainScrollbar :explorer="explorer" variant="mobile" />

    <Transition name="era-toast">
      <div v-if="halvingEraToastVisible" class="halving-era-toast" role="status" aria-live="polite">
        <strong>{{ halvingEraToastTitle }}</strong>
        <span>{{ halvingEraToastDescription }}</span>
      </div>
    </Transition>

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
  halvingEraToastVisible,
  halvingEraToastTitle,
  halvingEraToastDescription,
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

.halving-era-toast {
  position: fixed;
  top: max(14px, env(safe-area-inset-top));
  left: 12px;
  z-index: 16;
  display: grid;
  gap: 4px;
  width: min(270px, calc(100vw - 96px));
  padding: 11px 13px;
  color: rgba(255, 253, 246, 0.96);
  background:
    linear-gradient(145deg, rgba(37, 62, 55, 0.62), rgba(20, 35, 31, 0.34)),
    rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 14px;
  box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
  backdrop-filter: blur(22px) saturate(1.35);
  -webkit-backdrop-filter: blur(22px) saturate(1.35);
  pointer-events: none;

  strong {
    font-size: 0.82rem;
    font-weight: 950;
    line-height: 1.2;
  }

  span {
    color: rgba(255, 253, 246, 0.74);
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1.25;
  }
}

.era-toast-enter-active,
.era-toast-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.34s cubic-bezier(0.18, 0.89, 0.24, 1.08);
}

.era-toast-enter-from,
.era-toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}
</style>
