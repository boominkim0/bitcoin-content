<template>
  <main class="lego-stage" ref="stageRef">
    <div class="blocks-container">
      <ol class="block-stack" :style="stackStyle">
        <li v-for="block in visibleBlocks" :key="block.height" class="stack-row">
          <Block :block="block" />
        </li>
      </ol>
    </div>

    <div class="custom-scrollbar" v-if="tipHeight > 0">
      <div class="scrollbar-track" ref="trackRef" @mousedown="handleTrackClick">
        <div
          class="scrollbar-thumb"
          :style="thumbStyle"
          @mousedown="handleThumbDrag"
        ></div>
      </div>
      <div class="scrollbar-scale">
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

    <div v-if="errorMessage" class="load-state">{{ errorMessage }}</div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { fetchBlocks, fetchStatus } from './api'
import type { BlockData } from './api'
import Block from './components/Block.vue'

const ROW_HEIGHT = 76
const SCROLL_THROTTLE = 300
const HALVING_INTERVAL = 210000

const tipHeight = ref<number>(0)
const blocks = ref<Map<number, BlockData>>(new Map())
const visibleStartHeight = ref<number>(0)
const visibleCount = ref<number>(20)
const containerHeight = ref<number>(0)
const errorMessage = ref<string>('')

const stageRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)

let throttleTimer: ReturnType<typeof setTimeout> | null = null
let isDragging = false
let dragStartY = 0
let dragStartHeight = 0

const maxStartHeight = computed(() => {
  return Math.max(0, tipHeight.value - visibleCount.value + 1)
})

const visibleBlocks = computed(() => {
  const result: BlockData[] = []
  const start = visibleStartHeight.value
  const count = visibleCount.value
  for (let i = 0; i < count; i++) {
    const height = start + i
    if (height > tipHeight.value) continue
    if (height < 0) continue
    const existing = blocks.value.get(height)
    result.push(existing || { height, hash: null, time: null })
  }
  return result
})

const trackHeight = computed(() => {
  return Math.max(0, containerHeight.value - 48 - 140)
})

const thumbHeight = computed(() => {
  const total = tipHeight.value + 1
  if (total === 0 || trackHeight.value === 0) return 0
  const ratio = visibleCount.value / total
  return Math.max(40, ratio * trackHeight.value)
})

const thumbStyle = computed(() => {
  const max = maxStartHeight.value
  if (max === 0 || trackHeight.value === 0) return { display: 'none' }
  const ratio = 1 - (visibleStartHeight.value / max)
  const top = ratio * (trackHeight.value - thumbHeight.value)
  return {
    height: `${thumbHeight.value}px`,
    transform: `translateY(${top}px)`
  }
})

const scaleMarks = computed(() => {
  const total = tipHeight.value
  if (total <= 0) return []

  const marks: { value: number; top: number }[] = []

  const halvingCount = Math.floor(total / HALVING_INTERVAL)
  for (let i = 1; i <= halvingCount; i++) {
    const h = i * HALVING_INTERVAL
    const ratio = 1 - (h / total)
    marks.push({
      value: h,
      top: ratio * 100
    })
  }

  return marks.sort((a, b) => a.top - b.top)
})

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

const stackStyle = computed(() => {
  const isTopEnd = visibleStartHeight.value >= maxStartHeight.value
  const isBottomEnd = visibleStartHeight.value <= 0
  const gap = Math.max(80, Math.round(containerHeight.value * 0.12))

  const paddingTop = isTopEnd ? `${gap}px` : '0px'
  const paddingBottom = isBottomEnd ? `${gap}px` : '0px'

  return {
    paddingTop,
    paddingBottom
  }
})

function calculateVisibleCount() {
  if (containerHeight.value <= 132) {
    visibleCount.value = 9
  } else {
    visibleCount.value = Math.ceil((containerHeight.value - 132) / ROW_HEIGHT) + 1
  }
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const max = maxStartHeight.value
  const delta = Math.round(e.deltaY / 50)
  visibleStartHeight.value = Math.max(0, Math.min(max, visibleStartHeight.value - delta))

  if (throttleTimer) clearTimeout(throttleTimer)
  throttleTimer = setTimeout(() => {
    fetchVisibleBlocks()
  }, SCROLL_THROTTLE)
}

async function fetchVisibleBlocks() {
  if (tipHeight.value === 0) return

  const start = visibleStartHeight.value
  const end = Math.min(tipHeight.value, start + visibleCount.value - 1)

  const neededHeights: number[] = []
  for (let h = start; h <= end; h++) {
    const existing = blocks.value.get(h)
    if (!existing || existing.time === null) {
      neededHeights.push(h)
    }
  }

  if (neededHeights.length === 0) return

  const from = Math.min(...neededHeights)
  const to = Math.max(...neededHeights)

  try {
    const fetched = await fetchBlocks(from, to)
    fetched.forEach(block => {
      blocks.value.set(block.height, block)
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    }
  }
}

async function bootstrap() {
  try {
    const status = await fetchStatus()
    tipHeight.value = status.blockchain.blocks

    containerHeight.value = window.innerHeight
    calculateVisibleCount()

    visibleStartHeight.value = maxStartHeight.value

    await fetchVisibleBlocks()
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    }
  }
}

function handleThumbDrag(e: MouseEvent) {
  e.preventDefault()
  isDragging = true
  dragStartY = e.clientY
  dragStartHeight = visibleStartHeight.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !trackRef.value) return
    const deltaY = dragStartY - e.clientY
    const trackH = trackRef.value.clientHeight
    const thumbH = thumbHeight.value
    const ratio = deltaY / (trackH - thumbH)
    const max = maxStartHeight.value
    visibleStartHeight.value = Math.max(0, Math.min(max, Math.round(dragStartHeight + ratio * max)))
  }

  const handleMouseUp = () => {
    isDragging = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    fetchVisibleBlocks()
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

function handleTrackClick(e: MouseEvent) {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const clickY = e.clientY - rect.top
  const trackH = rect.height
  const thumbH = thumbHeight.value
  const ratio = 1 - (clickY / trackH)
  const max = maxStartHeight.value
  visibleStartHeight.value = Math.max(0, Math.min(max, Math.round(ratio * max)))

  if (throttleTimer) clearTimeout(throttleTimer)
  throttleTimer = setTimeout(() => {
    fetchVisibleBlocks()
  }, SCROLL_THROTTLE)
}

function handleResize() {
  containerHeight.value = window.innerHeight
  calculateVisibleCount()

  const max = maxStartHeight.value
  if (visibleStartHeight.value > max) {
    visibleStartHeight.value = max
  }
}

onMounted(() => {
  bootstrap()
  if (stageRef.value) {
    stageRef.value.addEventListener('wheel', handleWheel, { passive: false })
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (stageRef.value) {
    stageRef.value.removeEventListener('wheel', handleWheel)
  }
  window.removeEventListener('resize', handleResize)
  if (throttleTimer) clearTimeout(throttleTimer)
})
</script>
