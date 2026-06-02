<template>
  <div
    v-if="tipHeight > 0"
    class="custom-scrollbar"
    :class="`custom-scrollbar-${variant}`"
  >
    <div
      class="scrollbar-track"
      :ref="setTrackElement"
      @mousedown="handleTrackClick"
      @touchstart.prevent.stop="handleTrackTouch"
    >
      <div
        class="scrollbar-thumb"
        :style="thumbStyle"
        @mousedown.stop="handleThumbDrag"
        @touchstart.prevent.stop="handleThumbTouchDrag"
      ></div>
    </div>
    <div
      v-if="variant === 'mobile' && scrollbarDragActive"
      class="scrollbar-bubble"
      :style="scrollbarBubbleStyle"
      aria-live="polite"
    >
      #{{ formatNumber(scrollbarFocusHeight) }}
    </div>
    <div v-if="variant === 'desktop'" class="scrollbar-scale">
      <div class="scale-label top-label">#{{ formatNumber(tipHeight) }}</div>
      <div class="scale-marks">
        <div
          v-for="mark in scaleMarks"
          :key="mark.value"
          class="scale-mark"
          :style="{ top: mark.top + '%' }"
        >
          <span class="mark-line"></span>
          <span class="mark-value">#{{ formatNumber(mark.value) }}</span>
        </div>
      </div>
      <div class="scale-label bottom-label">#0</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeviceKind } from '@/composables/useDeviceKind'
import type { BitcoinExplorerController } from '@/composables/useBitcoinExplorer'

const props = defineProps<{
  explorer: BitcoinExplorerController
  variant: DeviceKind
}>()

const {
  tipHeight,
  thumbStyle,
  scrollbarDragActive,
  scrollbarBubbleStyle,
  scrollbarFocusHeight,
  scaleMarks,
  setTrackElement,
  handleTrackClick,
  handleTrackTouch,
  handleThumbDrag,
  handleThumbTouchDrag,
  formatNumber
} = props.explorer
</script>

<style scoped lang="scss">
.custom-scrollbar {
  position: absolute;
  right: 6px;
  top: 48px;
  bottom: 140px;
  width: 80px;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  user-select: none;
}

.scrollbar-track {
  position: relative;
  width: 10px;
  height: 100%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.14)),
    rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 5px;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: var(--glass-highlight), 0 10px 24px rgba(20, 31, 28, 0.12);
  backdrop-filter: blur(14px) saturate(1.35);
  -webkit-backdrop-filter: blur(14px) saturate(1.35);
}

.scrollbar-thumb {
  position: absolute;
  left: 1px;
  width: 8px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(142, 185, 177, 0.68)),
    rgba(49, 93, 80, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 4px;
  cursor: grab;
  transition: background 0.2s, box-shadow 0.2s;
  z-index: 2;
  box-shadow: 0 8px 18px rgba(20, 31, 28, 0.18), var(--glass-highlight);

  &:hover {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(142, 185, 177, 0.8)),
      rgba(49, 93, 80, 0.5);
  }

  &:active {
    cursor: grabbing;
  }
}

.scrollbar-scale {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  margin-left: 6px;
  height: 100%;
}

.scale-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: rgba(23, 35, 31, 0.64);
  line-height: 1;
  text-align: right;
  flex-shrink: 0;
}

.scale-marks {
  flex: 1;
  position: relative;
  width: 100%;
}

.scale-mark {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  transform: translateY(-50%);
  pointer-events: none;
}

.mark-line {
  display: block;
  width: 8px;
  height: 1px;
  background: rgba(23, 35, 31, 0.28);
}

.mark-value {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(23, 35, 31, 0.52);
  line-height: 1;
}

.custom-scrollbar-mobile {
  right: 0;
  top: 62px;
  bottom: calc(112px + env(safe-area-inset-bottom));
  width: 58px;
  justify-content: center;

  .scrollbar-track {
    width: 58px;
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    touch-action: none;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 12px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.08)),
        rgba(31, 68, 58, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.34);
      border-radius: 999px;
      transform: translateX(-50%);
      box-shadow: var(--glass-highlight), 0 12px 28px rgba(20, 31, 28, 0.12);
      backdrop-filter: blur(16px) saturate(1.35);
      -webkit-backdrop-filter: blur(16px) saturate(1.35);
    }
  }

  .scrollbar-thumb {
    left: calc(50% - 24px);
    width: 48px;
    background:
      radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.82), transparent 34%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(142, 185, 177, 0.3)),
      rgba(49, 93, 80, 0.52);
    border: 2px solid rgba(255, 255, 255, 0.72);
    border-radius: 50%;
    box-shadow:
      0 14px 30px rgba(20, 31, 28, 0.2),
      var(--glass-highlight);
    backdrop-filter: blur(12px) saturate(1.3);
    -webkit-backdrop-filter: blur(12px) saturate(1.3);
  }

  .scrollbar-bubble {
    position: absolute;
    right: 54px;
    top: 0;
    min-width: 112px;
    padding: 8px 10px;
    color: rgba(255, 253, 246, 0.96);
    background:
      linear-gradient(145deg, rgba(45, 73, 64, 0.58), rgba(20, 35, 31, 0.34)),
      rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.42);
    border-radius: 999px;
    box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
    backdrop-filter: blur(18px) saturate(1.35);
    -webkit-backdrop-filter: blur(18px) saturate(1.35);
    font-size: 0.86rem;
    font-weight: 950;
    letter-spacing: 0;
    line-height: 1;
    text-align: center;
    pointer-events: none;
    white-space: nowrap;

    &::after {
      content: "";
      position: absolute;
      top: 50%;
      right: -6px;
      width: 11px;
      height: 11px;
      background: rgba(36, 61, 54, 0.46);
      border-top: 1px solid rgba(255, 255, 255, 0.36);
      border-right: 1px solid rgba(255, 255, 255, 0.36);
      transform: translateY(-50%) rotate(45deg);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

  }
}
</style>
