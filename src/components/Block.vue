<template>
  <article class="cube" :class="blockClass" @click.stop="handleClick">
    <div class="cube-front">
      <span v-if="props.isSkeleton" class="block-skeleton skeleton-height"></span>
      <span v-else-if="props.isIng" class="ing-skeleton" aria-label="새 블록 채굴 대기 중">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <strong v-else>#{{ formatNumber(props.block.height) }}</strong>
      <span
        v-if="showHalvingEra"
        class="halving-era"
        :class="{ 'halving-era-visible': isHalvingTooltipVisible }"
        :aria-label="halvingEraLabel"
        :data-tooltip="halvingEraTooltip"
        tabindex="0"
        @pointerenter="showHalvingTooltip"
        @pointerleave="hideHalvingTooltipFromPointer"
        @pointerdown.stop="showHalvingTooltip"
        @touchstart.stop="showHalvingTooltip"
        @focus="showHalvingTooltip"
        @blur="hideHalvingTooltip"
        @keydown.enter.prevent.stop="showHalvingTooltip"
        @keydown.space.prevent.stop="showHalvingTooltip"
        @click.stop="showHalvingTooltip"
      >
        {{ halvingEpoch }}차
      </span>
    </div>
    <div class="cube-side">
      <time v-if="props.isSkeleton" class="skeleton-time">
        <span class="block-skeleton"></span>
        <span class="block-skeleton"></span>
      </time>
      <time v-else-if="props.block.time && !props.isIng">
        <span>{{ cubeDate(props.block.time).date }}</span>
        <span>{{ cubeDate(props.block.time).time }}</span>
      </time>
      <time v-else-if="props.isIng" class="ing-dot"></time>
      <time v-else></time>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BlockData } from '../api'
import { formatBlockTimeParts, formatNumber, getHalvingEpoch, isDifficultyAdjustment, isHalving } from '../domain/bitcoin'
import type { TimeDisplayMode } from '../domain/bitcoin'

interface Props {
  block: BlockData
  isIng?: boolean
  isNew?: boolean
  isSkeleton?: boolean
  timeDisplayMode?: TimeDisplayMode
  variant?: 'desktop' | 'mobile'
}

const props = withDefaults(defineProps<Props>(), {
  timeDisplayMode: 'local',
  variant: 'desktop'
})
const emit = defineEmits<{
  select: [block: BlockData]
}>()
const isHalvingTooltipVisible = ref(false)

function handleClick() {
  if (props.isIng || props.isSkeleton) {
    return
  }
  emit('select', props.block)
}

function showHalvingTooltip() {
  isHalvingTooltipVisible.value = true
}

function hideHalvingTooltip() {
  isHalvingTooltipVisible.value = false
}

function hideHalvingTooltipFromPointer(event: PointerEvent) {
  if (event.pointerType === 'touch') {
    return
  }
  hideHalvingTooltip()
}

const blockClass = computed(() => {
  const variantClass = `cube-${props.variant}`
  if (props.isSkeleton) return ['cube-skeleton', variantClass]
  if (props.isIng) return ['cube-ing', variantClass]
  return [
    variantClass,
    props.isNew ? 'cube-new' : '',
    props.block.time
      ? {
          'cube-difficulty': isDifficultyAdjustment(props.block.height),
          'cube-halving': isHalving(props.block.height)
        }
      : ''
  ]
})

const halvingEpoch = computed(() => getHalvingEpoch(props.block.height))
const showHalvingEra = computed(() => !props.isSkeleton && !props.isIng && halvingEpoch.value > 0)
const halvingEraLabel = computed(() => `${halvingEpoch.value}번째 반감기 이후 블록`)
const halvingEraTooltip = computed(() => {
  return `${halvingEpoch.value}차 반감기 이후 구간입니다. 반감기가 지날 때마다 새로 발행되는 보조금이 절반으로 줄어듭니다.`
})

function cubeDate(value: number): { date: string; time: string } {
  return formatBlockTimeParts(value, props.timeDisplayMode) ?? { date: '---', time: '---' }
}
</script>

<style scoped lang="scss">
.cube {
  --front: rgba(127, 152, 143, 0.76);
  --side: rgba(64, 91, 82, 0.82);
  --top: rgba(208, 218, 201, 0.78);
  --line: rgba(33, 54, 48, 0.32);
  --ink: #fffdf4;
  position: absolute;
  left: 50%;
  top: 0;
  width: 430px;
  height: 104px;
  transform: translateX(-50%);
  filter:
    drop-shadow(0 24px 24px rgba(20, 31, 28, 0.24))
    drop-shadow(0 2px 0 rgba(255, 255, 255, 0.26));
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: translateX(-50%) scale(1.03);
  }

  &:active {
    transform: translateX(-50%) scale(0.98);
  }

  &::before,
  &::after {
    content: "";
    position: absolute;
    left: -26px;
    z-index: 4;
    width: 500px;
    height: 14px;
    border: 2px solid rgba(24, 42, 37, 0.36);
    border-radius: 2px;
    background:
      linear-gradient(90deg, transparent 0 12%, var(--line) 12% 12.8%, transparent 12.8% 30%, var(--line) 30% 30.8%, transparent 30.8% 48%, var(--line) 48% 48.8%, transparent 48.8% 66%, var(--line) 66% 66.8%, transparent 66.8% 84%, var(--line) 84% 84.8%, transparent 84.8%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(0, 0, 0, 0.1)),
      var(--top);
    box-shadow:
      0 4px 0 rgba(24, 42, 37, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(10px) saturate(1.2);
    -webkit-backdrop-filter: blur(10px) saturate(1.2);
  }

  &::before {
    top: 32px;
    display: none;
  }

  &::after {
    top: 108px;
  }

  &-front,
  &-side,
  &-top {
    position: absolute;
    border: 2px solid rgba(24, 42, 37, 0.38);
    backdrop-filter: blur(12px) saturate(1.25);
    -webkit-backdrop-filter: blur(12px) saturate(1.25);
  }

  &-front {
    left: 16px;
    top: 40px;
    display: grid;
    place-items: center;
    width: 268px;
    height: 74px;
    color: var(--ink);
    background:
      linear-gradient(90deg, transparent 0 24%, var(--line) 24% 24.8%, transparent 24.8% 49%, var(--line) 49% 49.8%, transparent 49.8% 74%, var(--line) 74% 74.8%, transparent 74.8%),
      linear-gradient(180deg, transparent 0 48%, var(--line) 48% 50%, transparent 50%),
      radial-gradient(circle at 18% 32%, rgba(255, 255, 255, 0.18), transparent 20%),
      radial-gradient(circle at 76% 70%, rgba(33, 54, 48, 0.18), transparent 18%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0.08)),
      var(--front);
    border-radius: 3px 0 0 3px;
    z-index: 2;

    strong {
      display: block;
      max-width: 238px;
      overflow-wrap: anywhere;
      color: var(--ink);
      font-size: 2rem;
      font-weight: 950;
      letter-spacing: 0;
      line-height: 1;
      text-shadow:
        0 2px 2px rgba(0, 0, 0, 0.45),
        0 0 14px rgba(255, 255, 255, 0.36);
    }
  }

  &-side {
    right: 0;
    top: 40px;
    display: grid;
    place-items: center;
    width: 146px;
    height: 74px;
    color: rgba(255, 255, 255, 0.94);
    background:
      linear-gradient(180deg, transparent 0 48%, rgba(38, 31, 23, 0.42) 48% 50%, transparent 50%),
      linear-gradient(90deg, rgba(0, 0, 0, 0.22), transparent),
      var(--side);
    border-left: 0;
    border-radius: 0 3px 3px 0;
    z-index: 1;

    time {
      display: grid;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 900;
      text-align: center;
      white-space: nowrap;

      span {
        display: block;
        line-height: 1;
      }
    }
  }
}

.cube-difficulty {
  --line: rgba(255, 255, 255, 0.26);
}

.cube-halving {
  --line: rgba(255, 236, 174, 0.4);

  .cube-front,
  .cube-side {
    border-color: rgba(255, 236, 174, 0.52);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      inset 0 -7px 0 rgba(23, 35, 31, 0.08),
      0 0 22px rgba(213, 171, 85, 0.24);
  }
}

.halving-era {
  position: absolute;
  left: 10px;
  top: 8px;
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 18px;
  padding: 0 6px;
  overflow: visible;
  color: rgba(255, 252, 238, 0.94);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.24), rgba(213, 171, 85, 0.16)),
    rgba(40, 53, 46, 0.3);
  border: 1px solid rgba(255, 236, 174, 0.34);
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.46),
    0 7px 14px rgba(20, 31, 28, 0.12);
  font-size: 0.58rem;
  font-weight: 950;
  line-height: 1;
  letter-spacing: 0;
  text-shadow: 0 1px 2px rgba(20, 31, 28, 0.36);
  pointer-events: auto;
  cursor: help;
  outline: none;
  z-index: 6;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 0;
    top: calc(100% + 8px);
    z-index: 10;
    width: max-content;
    max-width: min(230px, calc(100vw - 116px));
    padding: 9px 10px;
    color: rgba(255, 253, 246, 0.94);
    background:
      linear-gradient(145deg, rgba(37, 62, 55, 0.66), rgba(20, 35, 31, 0.42)),
      rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.38);
    border-radius: 10px;
    box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
    backdrop-filter: blur(18px) saturate(1.35);
    -webkit-backdrop-filter: blur(18px) saturate(1.35);
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 1.35;
    text-align: left;
    white-space: normal;
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
    transform-origin: top left;
    transition: opacity 0.16s ease, transform 0.16s ease;
    pointer-events: none;
  }

  &:hover,
  &:focus,
  &:focus-visible,
  &.halving-era-visible {
    border-color: rgba(255, 236, 174, 0.58);
  }

  &:hover::after,
  &:focus::after,
  &:focus-visible::after,
  &.halving-era-visible::after {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.cube-ing {
  --front: rgba(190, 204, 199, 0.56);
  --side: rgba(129, 148, 141, 0.64);
  --top: rgba(224, 233, 228, 0.58);
  --ink: rgba(255, 255, 255, 0.72);
  cursor: default;
  animation: ing-pulse 2.2s ease-in-out infinite;

  &:hover,
  &:active {
    transform: translateX(-50%);
  }

  &:before {
    display: block;
  }

  .cube-front .ing-skeleton span {
    animation: ing-glow 1.35s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.18s;
    }

    &:nth-child(3) {
      animation-delay: 0.36s;
    }
  }

  .ing-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ffcc66;
    animation: ing-dot-blink 1.2s ease-in-out infinite;
    box-shadow: 0 0 8px rgba(255, 204, 102, 0.6);
  }
}

.cube-skeleton {
  cursor: default;

  &:hover,
  &:active {
    transform: translateX(-50%);
  }
}

.block-skeleton {
  display: block;
  width: 100%;
  height: 12px;
  overflow: hidden;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.36), transparent),
    rgba(255, 245, 213, 0.22);
  background-size: 220% 100%, 100% 100%;
  border-radius: 999px;
  animation: skeleton-sweep 1.35s ease-in-out infinite;
}

.skeleton-height {
  width: 150px;
  height: 24px;
}

.skeleton-time {
  width: 86px;

  .block-skeleton {
    height: 9px;
  }
}

.ing-skeleton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;

  span {
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.1) 42%),
      rgba(255, 251, 234, 0.62);
    box-shadow:
      0 0 18px rgba(255, 241, 194, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
  }
}

.cube-new {
  animation: block-settle 1.2s cubic-bezier(0.18, 0.89, 0.24, 1.08) both;
  animation-delay: var(--settle-delay, 0ms);

  &::before {
    display: block;
    animation: mined-cap-out 1.2s ease both;
    animation-delay: var(--settle-delay, 0ms);
  }

  .cube-front,
  .cube-side {
    animation: mined-face-in 1.2s ease both;
    animation-delay: var(--settle-delay, 0ms);
  }

  .cube-front strong {
    animation: mined-number-in 1.2s ease both;
    animation-delay: var(--settle-delay, 0ms);
  }
}

@keyframes block-settle {
  0% {
    opacity: 0.72;
    transform: translateX(-50%) translateY(-54px) scale(1.04);
  }
  62% {
    opacity: 1;
    transform: translateX(-50%) translateY(6px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes mined-cap-out {
  0%, 42% {
    opacity: 1;
    transform: translateY(0) scaleX(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-18px) scaleX(0.9);
  }
}

@keyframes mined-face-in {
  0% {
    filter: grayscale(1) brightness(0.88);
  }
  45% {
    filter: grayscale(0.55) brightness(1.16);
  }
  100% {
    filter: grayscale(0) brightness(1);
  }
}

@keyframes mined-number-in {
  0%, 30% {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
    text-shadow: 0 0 18px rgba(255, 211, 122, 0.75);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes ing-pulse {
  0%, 100% { opacity: 0.55; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.18); }
}

@keyframes ing-glow {
  0%, 100% {
    opacity: 0.34;
    transform: translateY(0) scale(0.78);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px) scale(1.08);
  }
}

@keyframes ing-dot-blink {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes skeleton-sweep {
  0% { background-position: 220% 0, 0 0; }
  100% { background-position: -220% 0, 0 0; }
}

.cube-mobile {
  --front: rgba(118, 153, 143, 0.72);
  --side: rgba(69, 103, 92, 0.8);
  --ink: #fffdf2;
  width: min(360px, calc(100vw - 64px));
  height: 112px;
  filter:
    drop-shadow(0 18px 24px rgba(20, 31, 28, 0.2))
    drop-shadow(0 2px 0 rgba(255, 255, 255, 0.28));

  &::before,
  &::after {
    display: none;
  }

  .cube-front {
    left: 0;
    top: 12px;
    width: calc(100% - 104px);
    height: 88px;
    padding: 0 18px;
    background:
      radial-gradient(circle at 26% 20%, rgba(255, 255, 255, 0.34), transparent 34%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0.05)),
      var(--front);
    border-radius: 16px 0 0 16px;
    border-color: rgba(255, 255, 255, 0.34);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.42),
      inset 0 -7px 0 rgba(23, 35, 31, 0.08);

    strong {
      max-width: 100%;
      font-size: 1.86rem;
    }
  }

  .halving-era {
    left: 12px;
    top: 9px;
    min-width: 28px;
    height: 18px;
  }

  .cube-side {
    top: 12px;
    right: 0;
    width: 104px;
    height: 88px;
    padding: 0 10px;
    background:
      radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.24), transparent 32%),
      linear-gradient(135deg, rgba(0, 0, 0, 0.16), transparent),
      var(--side);
    border-color: rgba(255, 255, 255, 0.24);
    border-radius: 0 16px 16px 0;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      inset 0 -7px 0 rgba(23, 35, 31, 0.08);

    time {
      gap: 7px;
      font-size: 0.66rem;
      align-content: center;
    }
  }

  &.cube-ing {
    --front: rgba(196, 211, 206, 0.58);
    --side: rgba(133, 151, 145, 0.66);
  }

  &.cube-skeleton {
    --front: rgba(177, 195, 188, 0.5);
    --side: rgba(124, 145, 138, 0.58);
  }
}

@media (max-width: 380px) {
  .cube-mobile {
    width: min(340px, calc(100vw - 64px));
    height: 106px;

    .cube-front {
      top: 10px;
      width: calc(100% - 96px);
      height: 84px;
      padding: 0 14px;

      strong {
        font-size: 1.62rem;
      }
    }

    .cube-side {
      top: 10px;
      width: 96px;
      height: 84px;

      time {
        gap: 6px;
        font-size: 0.6rem;
      }
    }

    .skeleton-height {
      width: 126px;
    }
  }
}
</style>
