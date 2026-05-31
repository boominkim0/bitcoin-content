<template>
  <article class="cube" :class="blockClass" @click="handleClick">
    <div class="cube-front">
      <strong v-if="props.isIng">ING</strong>
      <strong v-else>#{{ formatNumber(props.block.height) }}</strong>
    </div>
    <div class="cube-side">
      <time v-if="props.block.time && !props.isIng">
        <span>{{ cubeDate(props.block.time).date }}</span>
        <span>{{ cubeDate(props.block.time).time }}</span>
      </time>
      <time v-else-if="props.isIng" class="ing-dot"></time>
      <time v-else></time>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BlockData } from '../api'

interface Props {
  block: BlockData
  isIng?: boolean
  isNew?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [block: BlockData]
}>()

function handleClick() {
  if (props.isIng) {
    return
  }
  emit('select', props.block)
}

const DIFFICULTY_INTERVAL = 2016
const HALVING_INTERVAL = 210000

const blockClass = computed(() => {
  if (props.isIng) return 'cube-ing'
  return [
    props.isNew ? 'cube-new' : '',
    props.block.time
      ? {
          'cube-difficulty': isDifficultyAdjustment(props.block.height),
          'cube-halving': isHalving(props.block.height)
        }
      : ''
  ]
})

function isDifficultyAdjustment(height: number): boolean {
  return height > 0 && height % DIFFICULTY_INTERVAL === 0
}

function isHalving(height: number): boolean {
  return height > 0 && height % HALVING_INTERVAL === 0
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function cubeDate(value: number): { date: string; time: string } {
  const date = new Date(value * 1000)
  return {
    date: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('.'),
    time: [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0')
    ].join(':')
  }
}
</script>

<style scoped lang="scss">
.cube {
  --front: #8f866f;
  --side: #655c4c;
  --top: #b8ad91;
  --line: rgba(51, 43, 31, 0.34);
  --ink: #fff5d5;
  position: absolute;
  left: 50%;
  top: 0;
  width: 430px;
  height: 104px;
  transform: translateX(-50%);
  filter:
    drop-shadow(0 22px 22px rgba(35, 29, 20, 0.28))
    drop-shadow(0 2px 0 rgba(255, 245, 210, 0.34));
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
    border: 2px solid rgba(39, 33, 25, 0.48);
    border-radius: 2px;
    background:
      linear-gradient(90deg, transparent 0 12%, var(--line) 12% 12.8%, transparent 12.8% 30%, var(--line) 30% 30.8%, transparent 30.8% 48%, var(--line) 48% 48.8%, transparent 48.8% 66%, var(--line) 66% 66.8%, transparent 66.8% 84%, var(--line) 84% 84.8%, transparent 84.8%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(0, 0, 0, 0.15)),
      var(--top);
    box-shadow: 0 4px 0 rgba(39, 33, 25, 0.16);
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
    border: 2px solid rgba(39, 33, 25, 0.5);
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
      radial-gradient(circle at 76% 70%, rgba(40, 34, 26, 0.22), transparent 18%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.12)),
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
        0 0 10px rgba(255, 211, 122, 0.5);
    }
  }

  &-side {
    right: 0;
    top: 40px;
    display: grid;
    place-items: center;
    width: 146px;
    height: 74px;
    color: rgba(255, 255, 255, 0.92);
    background:
      linear-gradient(180deg, transparent 0 48%, rgba(38, 31, 23, 0.42) 48% 50%, transparent 50%),
      linear-gradient(90deg, rgba(0, 0, 0, 0.28), transparent),
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
  --front: #6f8b84;
  --side: #4f6862;
  --top: #9eb7ae;
  --ink: #f4fff8;
}

.cube-halving {
  --front: #8a748e;
  --side: #65516a;
  --top: #b4a0b8;
  --ink: #fffdf8;
}

.cube-difficulty.cube-halving {
  --front: #9a7460;
  --side: #704d40;
  --top: #bd9d88;
}

.cube-ing {
  --front: #a0a0a0;
  --side: #808080;
  --top: #b8b8b8;
  --ink: #d0d0d0;
  cursor: default;
  animation: ing-pulse 2.2s ease-in-out infinite;

  &:hover,
  &:active {
    transform: translateX(-50%);
  }

  &:before {
    display: block;
  }

  .cube-front strong {
    animation: ing-glow 2.2s ease-in-out infinite;
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
  0%, 100% { text-shadow: 0 0 5px rgba(255, 211, 122, 0.2); }
  50% { text-shadow: 0 0 18px rgba(255, 211, 122, 0.9), 0 0 35px rgba(255, 211, 122, 0.5); }
}

@keyframes ing-dot-blink {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

@media (max-width: 520px) {
  .cube {
    width: 318px;
    height: 90px;

    &::before,
    &::after {
      left: -12px;
      width: 342px;
      height: 12px;
    }

    &::before {
      top: 30px;
    }

    &::after {
      top: 94px;
    }

    &-front {
      left: 10px;
      width: 190px;
      height: 64px;
      top: 36px;
      padding-top: 3px;

      strong {
        max-width: 168px;
        font-size: 1.5rem;
      }
    }

    &-side {
      width: 118px;
      height: 64px;
      top: 36px;
      padding-top: 3px;

      time {
        font-size: 0.62rem;
        align-content: center;
      }
    }
  }
}

@media (max-width: 380px) {
  .cube {
    width: 286px;
    height: 86px;

    &::before,
    &::after {
      left: -10px;
      width: 306px;
      height: 11px;
    }

    &::before {
      top: 28px;
    }

    &::after {
      top: 90px;
    }

    &-front {
      left: 10px;
      top: 34px;
      width: 172px;
      height: 60px;

      strong {
        max-width: 150px;
        font-size: 1.32rem;
      }
    }

    &-side {
      top: 34px;
      width: 104px;
      height: 60px;

      time {
        gap: 4px;
        font-size: 0.56rem;
      }
    }
  }
}
</style>
