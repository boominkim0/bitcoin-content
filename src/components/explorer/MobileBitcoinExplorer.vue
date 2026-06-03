<template>
  <main
    class="lego-stage mobile-stage"
  >
    <form
      class="home-search"
      :class="{ 'home-search-open': isSearchOpen }"
      role="search"
      @submit.prevent="handleSearchSubmit"
    >
      <button
        v-if="!isSearchOpen"
        class="search-fab"
        type="button"
        aria-label="검색 열기"
        @click="openSearchField"
      >
        <span aria-hidden="true"></span>
      </button>
      <template v-else>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          :disabled="searchLoading"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          inputmode="search"
          placeholder="height, TXID, 지갑주소"
          @keydown.escape.prevent="closeSearchField"
        >
        <button class="search-submit" type="submit" :disabled="searchLoading || !searchQuery.trim()">
          {{ searchLoading ? '...' : '검색' }}
        </button>
        <button class="search-close" type="button" aria-label="검색 닫기" @click="closeSearchField">
          &times;
        </button>
      </template>
    </form>
    <Transition name="search-error">
      <div v-if="searchError" class="search-error" role="status">{{ searchError }}</div>
    </Transition>

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
    <Transition name="dock-hide">
      <ServerStatusPanel
        v-if="!isSearchOpen"
        variant="mobile"
        @open-server="closeDockModals"
        @open-network="openNetworkModal"
        @open-settings="openSettingsModal"
      />
    </Transition>
    <ExplorerModals :explorer="explorer" variant="mobile" />
  </main>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
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
  searchQuery,
  searchLoading,
  searchError,
  submitSearch,
  closeDockModals,
  openNetworkModal,
  openSettingsModal
} = props.explorer

const isSearchOpen = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

async function openSearchField() {
  isSearchOpen.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

function closeSearchField() {
  isSearchOpen.value = false
}

async function handleSearchSubmit() {
  if (!isSearchOpen.value) {
    await openSearchField()
    return
  }
  await submitSearch()
}
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

.home-search {
  position: fixed;
  right: 12px;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 27;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 32% 22%, rgba(255, 255, 255, 0.64), transparent 36%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.32), rgba(142, 185, 177, 0.18)),
    rgba(35, 58, 52, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 50%;
  box-shadow:
    0 16px 34px rgba(20, 31, 28, 0.22),
    var(--glass-highlight);
  backdrop-filter: blur(22px) saturate(1.35);
  -webkit-backdrop-filter: blur(22px) saturate(1.35);
  transition:
    width 0.34s cubic-bezier(0.18, 0.89, 0.24, 1.08),
    height 0.28s ease,
    bottom 0.34s cubic-bezier(0.18, 0.89, 0.24, 1.08),
    border-radius 0.34s ease,
    background 0.24s ease,
    box-shadow 0.24s ease;

  &::before {
    content: "";
    position: absolute;
    inset: -45% -20%;
    z-index: 0;
    background:
      linear-gradient(110deg, transparent 16%, rgba(255, 255, 255, 0.34) 38%, transparent 62%);
    opacity: 0;
    transform: translateX(-42%) rotate(8deg);
    pointer-events: none;
  }

  &.home-search-open {
    bottom: calc(76px + env(safe-area-inset-bottom));
    grid-template-columns: minmax(0, 1fr) 54px 38px;
    place-items: stretch;
    gap: 7px;
    width: min(330px, calc(100vw - 24px));
    height: 56px;
    padding: 7px;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.58), rgba(234, 247, 242, 0.28)),
      rgba(255, 253, 246, 0.3);
    border-radius: 18px;
    box-shadow:
      0 20px 46px rgba(20, 31, 28, 0.24),
      var(--glass-highlight);
    animation: search-liquid-open 0.48s cubic-bezier(0.18, 0.89, 0.24, 1.08) both;

    &::before {
      opacity: 1;
      animation: search-liquid-shine 0.9s ease both;
    }
  }

  input,
  button {
    position: relative;
    z-index: 1;
    min-width: 0;
    height: 42px;
    border: 0;
    border-radius: 12px;
    font: inherit;
  }

  input {
    padding: 0 12px;
    color: var(--ink);
    background: rgba(255, 255, 255, 0.46);
    font-size: 0.78rem;
    font-weight: 850;
    outline: none;
    animation: search-field-in 0.22s ease both;

    &::placeholder {
      color: rgba(23, 35, 31, 0.46);
    }

    &:focus {
      box-shadow: inset 0 0 0 2px rgba(49, 93, 80, 0.28);
    }
  }

  .search-submit {
    color: rgba(255, 253, 246, 0.96);
    background: rgba(49, 93, 80, 0.78);
    font-size: 0.74rem;
    font-weight: 950;
    cursor: pointer;

    &:disabled {
      cursor: default;
      opacity: 0.58;
    }
  }

  .search-close {
    color: rgba(23, 35, 31, 0.62);
    background: rgba(255, 255, 255, 0.34);
    border: 1px solid rgba(255, 255, 255, 0.38);
    font-size: 1.25rem;
    font-weight: 750;
    line-height: 1;
    cursor: pointer;
    transition:
      color 0.16s ease,
      background 0.16s ease,
      transform 0.16s ease;

    &:hover,
    &:focus-visible {
      color: #8d291f;
      background: rgba(255, 245, 240, 0.56);
      outline: none;
    }

    &:active {
      transform: scale(0.94);
    }
  }
}

.home-search .search-fab {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  padding: 0;
  color: rgba(255, 253, 246, 0.96);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;

  span {
    position: relative;
    width: 19px;
    height: 19px;
    border: 3px solid currentColor;
    border-radius: 50%;
    filter: drop-shadow(0 2px 4px rgba(20, 31, 28, 0.28));

    &::after {
      content: "";
      position: absolute;
      right: -8px;
      bottom: -6px;
      width: 10px;
      height: 3px;
      background: currentColor;
      border-radius: 999px;
      transform: rotate(45deg);
      transform-origin: center;
    }
  }

  &:active {
    transform: scale(0.96);
  }
}

.search-error {
  position: fixed;
  right: 12px;
  bottom: calc(138px + env(safe-area-inset-bottom));
  z-index: 27;
  width: min(330px, calc(100vw - 24px));
  padding: 9px 11px;
  color: #8d291f;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(255, 229, 220, 0.34)),
    rgba(255, 255, 255, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 12px;
  box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  font-size: 0.72rem;
  font-weight: 900;
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

.search-error-enter-active,
.search-error-leave-active {
  transition: opacity 0.18s ease, transform 0.22s ease;
}

.search-error-enter-from,
.search-error-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.dock-hide-enter-active,
.dock-hide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.28s cubic-bezier(0.18, 0.89, 0.24, 1.08);
}

.dock-hide-enter-from,
.dock-hide-leave-to {
  opacity: 0;
  transform: translateX(-18px) translateY(8px) scale(0.94);
}

@keyframes search-liquid-open {
  0% {
    border-radius: 50%;
    transform: translateY(0) scale(0.88);
  }
  48% {
    border-radius: 24px 18px 22px 16px;
    transform: translateY(-3px) scale(1.02);
  }
  100% {
    border-radius: 18px;
    transform: translateY(0) scale(1);
  }
}

@keyframes search-liquid-shine {
  0% {
    transform: translateX(-58%) rotate(8deg);
  }
  100% {
    transform: translateX(56%) rotate(8deg);
  }
}

@keyframes search-field-in {
  from {
    opacity: 0;
    transform: translateX(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}
</style>
