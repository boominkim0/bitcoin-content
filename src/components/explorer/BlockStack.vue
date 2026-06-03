<template>
  <TransitionGroup
    tag="ol"
    name="stack"
    class="block-stack"
    :class="[stackClass, `block-stack-${variant}`]"
  >
    <li
      v-for="block in visibleBlocks"
      :key="block.height"
      class="stack-row"
      :class="{ 'newly-mined-row': isNewlyMinedBlock(block.height) }"
      :style="newlyMinedBlockStyle(block.height)"
      @click="selectBlock(block)"
    >
      <Block
        :block="block"
        :is-new="isNewlyMinedBlock(block.height)"
        :is-skeleton="initialLoading"
        :time-display-mode="timeDisplayMode"
        :variant="variant"
        @select="openModal"
      />
    </li>
    <li v-if="!initialLoading && isTipBlockReady" :key="tipHeight + 1" class="stack-row ing-block">
      <Block
        :block="{ height: tipHeight + 1, hash: null, time: null }"
        :time-display-mode="timeDisplayMode"
        :variant="variant"
        is-ing
      />
    </li>
  </TransitionGroup>
</template>

<script setup lang="ts">
import Block from '@/components/Block.vue'
import type { DeviceKind } from '@/composables/useDeviceKind'
import type { BitcoinExplorerController } from '@/composables/useBitcoinExplorer'

const props = defineProps<{
  explorer: BitcoinExplorerController
  variant: DeviceKind
}>()

const {
  tipHeight,
  visibleBlocks,
  isTipBlockReady,
  initialLoading,
  timeDisplayMode,
  stackClass,
  openModal,
  isNewlyMinedBlock,
  newlyMinedBlockStyle
} = props.explorer

function selectBlock(block: Parameters<typeof openModal>[0]) {
  if (initialLoading.value) return
  openModal(block)
}
</script>

<style scoped lang="scss">
.block-stack {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 0;
  margin-top: -10px;
  padding: 0;
  list-style: none;
  width: 100%;
  transition: padding 0.3s ease, margin 0.3s ease;

  .ing-block {
    display: none;
  }

  &.top-end {
    padding-top: 118px;

    .ing-block {
      display: block;
    }
  }

  &.bottom-end {
    margin-top: -96px;
    padding-bottom: 72px;
  }

  &.mining-update {
    .stack-move,
    .stack-enter-active,
    .stack-leave-active {
      transition:
        transform 0.74s cubic-bezier(0.18, 0.89, 0.24, 1.08),
        opacity 0.42s ease;
    }

    .stack-enter-from,
    .stack-leave-to {
      opacity: 0;
      transform: translateY(-42px) scale(0.96);
    }
  }
}

.stack-row {
  position: relative;
  width: min(100%, 560px);
  height: 132px;
  margin-top: -56px;
  pointer-events: none;

  :deep(.cube) {
    pointer-events: auto;
  }
}

.newly-mined-row {
  z-index: 2;
}

.ing-block {
  z-index: 3;
}

.block-stack-mobile {
  &.top-end {
    padding-top: 94px;
  }

  &.bottom-end {
    margin-top: -156px;
    padding-bottom: 96px;
  }

  .stack-row {
    height: 132px;
    margin-top: -44px;
  }
}
</style>
