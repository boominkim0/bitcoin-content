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
