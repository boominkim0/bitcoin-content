<template>
  <article class="cube" :class="blockClass">
    <div class="cube-front">
      <strong>#{{ formatNumber(props.block.height) }}</strong>
    </div>
    <div class="cube-side">
      <time v-if="props.block.time">
        <span>{{ cubeDate(props.block.time).date }}</span>
        <span>{{ cubeDate(props.block.time).time }}</span>
      </time>
      <template v-else>
        <span class="skeleton-text" style="width: 80px; height: 14px; margin-bottom: 5px;"></span>
        <span class="skeleton-text" style="width: 60px; height: 14px;"></span>
      </template>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BlockData } from '../api'

interface Props {
  block: BlockData
}

const props = defineProps<Props>()

const DIFFICULTY_INTERVAL = 2016
const HALVING_INTERVAL = 210000

const blockClass = computed(() => {
  if (!props.block.time) return 'skeleton'
  return {
    'cube-difficulty': isDifficultyAdjustment(props.block.height),
    'cube-halving': isHalving(props.block.height)
  }
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

.cube.skeleton {
  --front: #a0a0a0;
  --side: #808080;
  --top: #b8b8b8;
  --ink: #d0d0d0;
}

.skeleton-text {
  display: block;
  border-radius: 4px;
  background: linear-gradient(90deg, #c0c0c0 25%, #e0e0e0 50%, #c0c0c0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 520px) {
  .cube {
    width: 350px;
    height: 90px;

    &::before,
    &::after {
      left: -16px;
      width: 340px;
      height: 12px;
    }

    &::before {
      top: 30px;
    }

    &::after {
      top: 94px;
    }

    &-front {
      left: 12px;
      width: 210px;
      height: 64px;
      top: 36px;

      strong {
        max-width: 188px;
        font-size: 1.5rem;
      }
    }

    &-side {
      width: 128px;
      height: 64px;
      top: 36px;

      time {
        font-size: 0.62rem;
      }
    }
  }
}
</style>
