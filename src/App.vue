<template>
  <main class="lego-stage" ref="stageRef">
    <div class="blocks-container">
      <ol 
        class="block-stack" 
        :class="stackClass"
      >
        <li v-for="block in visibleBlocks" :key="block.height" class="stack-row">
          <Block :block="block" @select="openModal" />
        </li>
        <li class="stack-row ing-block">
          <Block :block="{ height: tipHeight + 1, hash: null, time: null }" is-ing />
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

    <div v-if="selectedBlock" class="block-modal" @click.self="closeModal">
      <div class="modal-card">
        <button class="modal-close" @click="closeModal">&times;</button>
        <div class="modal-header">#{{ formatNumber(selectedBlock.height) }}</div>
        <div class="modal-body">
          <div class="modal-row">
            <span class="modal-label">해시</span>
            <span class="modal-value modal-hash">{{ selectedBlock.hash ?? '---' }}</span>
          </div>

          <div class="modal-row two-col">
            <div>
              <span class="modal-label">블록에 적힌 시간</span>
              <span class="modal-value">{{ formatBlockTime(selectedBlock.time, 0) }}</span>
            </div>
            <div>
              <span class="modal-label">한국 시간</span>
              <span class="modal-value">{{ formatBlockTime(selectedBlock.time, 9) }}</span>
            </div>
          </div>

          <div class="modal-row two-col">
            <div>
              <span class="modal-label">보상</span>
              <span class="modal-value">{{ formatBTC(selectedBlock.reward_satoshi) }} BTC</span>
            </div>
            <div>
              <span class="modal-label">거래 수</span>
              <span class="modal-value">{{ selectedBlock.tx_count?.toLocaleString('ko-KR') ?? '---' }} tx</span>
            </div>
          </div>

          <div class="modal-row two-col">
            <div>
              <span class="modal-label">난이도</span>
              <span class="modal-value">{{ selectedBlock.difficulty?.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) ?? '---' }}</span>
            </div>
            <div>
              <span class="modal-label">해시레이트</span>
              <span class="modal-value">{{ formatHashrate(selectedBlock.hashrate_estimate) }}</span>
            </div>
          </div>

          <div class="modal-row">
            <span class="modal-label">블록 크기</span>
            <span class="modal-value">{{ formatSize(selectedBlock.size) }}</span>
          </div>

          <div v-if="selectedBlock.coinbase_message" class="modal-row">
            <span class="modal-label">채굴자 메시지 (Coinbase)</span>
            <span class="modal-value modal-message">{{ selectedBlock.coinbase_message }}</span>
          </div>

          <div v-if="selectedBlock.merkle_root" class="modal-row">
            <span class="modal-label">머클 루트</span>
            <span class="modal-value modal-hash">{{ selectedBlock.merkle_root }}</span>
          </div>

          <div v-if="selectedBlock.nonce !== undefined" class="modal-row">
            <span class="modal-label">Nonce</span>
            <span class="modal-value">{{ selectedBlock.nonce.toLocaleString('ko-KR') }}</span>
          </div>

          <div v-if="selectedBlock.bits" class="modal-row">
            <span class="modal-label">Bits</span>
            <span class="modal-value">{{ selectedBlock.bits }}</span>
          </div>

          <div class="modal-badges">
            <div v-if="isDifficultyAdjustment(selectedBlock.height)" class="modal-badge difficulty">
              난이도 조정 블록
            </div>
            <div v-if="isHalving(selectedBlock.height)" class="modal-badge halving">
              반감기 블록
            </div>
          </div>
        </div>
      </div>
    </div>
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

const selectedBlock = ref<BlockData | null>(null)

function openModal(block: BlockData) {
  selectedBlock.value = block
}

function closeModal() {
  selectedBlock.value = null
}

function isDifficultyAdjustment(height: number): boolean {
  return height > 0 && height % 2016 === 0
}

function isHalving(height: number): boolean {
  return height > 0 && height % 210000 === 0
}

function formatBlockTime(timestamp: number | null, offsetHours: number): string {
  if (!timestamp) return '---'
  const date = new Date((timestamp + offsetHours * 3600) * 1000)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const h = String(date.getUTCHours()).padStart(2, '0')
  const min = String(date.getUTCMinutes()).padStart(2, '0')
  const s = String(date.getUTCSeconds()).padStart(2, '0')
  return `${y}.${m}.${d} ${h}:${min}:${s}`
}

function getBlockReward(height: number): number {
  const halvings = Math.floor(height / HALVING_INTERVAL)
  return 50 / Math.pow(2, halvings)
}

function formatBTC(satoshi: number | undefined): string {
  if (satoshi === undefined) {
    const reward = getBlockReward(selectedBlock.value?.height ?? 0)
    return reward.toLocaleString('ko-KR', { minimumFractionDigits: 8, maximumFractionDigits: 8 })
  }
  return (satoshi / 100000000).toLocaleString('ko-KR', { minimumFractionDigits: 8, maximumFractionDigits: 8 })
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return '---'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`
}

function formatHashrate(hashrate: number | undefined): string {
  if (!hashrate) return '---'
  const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s']
  let value = hashrate
  let unitIndex = 0
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000
    unitIndex++
  }
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} ${units[unitIndex]}`
}

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

const stackClass = computed(() => {
  const isTopEnd = visibleStartHeight.value >= maxStartHeight.value
  const isBottomEnd = visibleStartHeight.value <= 0

  return [
    isTopEnd 
      ? 'top-end' 
      : isBottomEnd
      ? 'bottom-end'
      : ''
  ]
})

function calculateVisibleCount() {
  if (containerHeight.value <= 132) {
    visibleCount.value = 9
  } else {
    visibleCount.value = Math.ceil((containerHeight.value - 132) / ROW_HEIGHT) + 2
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

let pollTimer: ReturnType<typeof setInterval> | null = null

async function pollStatus() {
  try {
    const status = await fetchStatus()
    const newTip = status.blockchain.blocks
    const oldTip = tipHeight.value

    if (newTip > oldTip) {
      tipHeight.value = newTip

      for (let h = oldTip + 1; h <= newTip; h++) {
        if (!blocks.value.has(h)) {
          blocks.value.set(h, { height: h, hash: null, time: null })
        }
      }

      const max = maxStartHeight.value
      if (visibleStartHeight.value >= max - (newTip - oldTip)) {
        visibleStartHeight.value = max
      }

      await fetchVisibleBlocks()
    }
  } catch {
    // silently fail on polling errors
  }
}

onMounted(() => {
  bootstrap().then(() => {
    pollTimer = setInterval(pollStatus, 10000)
  })

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
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.lego-stage {
  position: relative;
  z-index: 1;
  width: min(760px, 100%);
  height: 100vh;
  margin: 0 auto;
  padding: 18px 0 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.blocks-container {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  padding: 0 20px;
}

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
    padding-top: 84px;

    .ing-block {
      display: block;
    }
  }
  &.bottom-end {
    margin-top: -128px;
  }
}

.stack-row {
  position: relative;
  width: min(100%, 560px);
  height: 132px;
  margin-top: -56px;
}

.sentinel-row {
  width: 100%;
  height: 1px;
  margin-top: 0 !important;
  flex-shrink: 0;
}

.spacer-row {
  width: 100%;
  flex-shrink: 0;
  margin-top: 0 !important;
}

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
  background: rgba(0, 0, 0, 0.08);
  border-radius: 5px;
  cursor: pointer;
  flex-shrink: 0;
}

.scrollbar-thumb {
  position: absolute;
  left: 1px;
  width: 8px;
  background: rgba(0, 0, 0, 0.28);
  border-radius: 4px;
  cursor: grab;
  transition: background 0.2s;
  z-index: 2;

  &:hover {
    background: rgba(0, 0, 0, 0.45);
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
  color: rgba(33, 29, 23, 0.55);
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
  background: rgba(33, 29, 23, 0.3);
}

.mark-value {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(33, 29, 23, 0.45);
  line-height: 1;
}

.scale-tooltip {
  position: absolute;
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
  background: rgba(33, 29, 23, 0.92);
  color: #fff5d5;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.78rem;
  white-space: nowrap;
  z-index: 30;
  min-width: 240px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    border-width: 6px 0 6px 6px;
    border-style: solid;
    border-color: transparent transparent transparent rgba(33, 29, 23, 0.92);
  }
}

.tooltip-header {
  font-size: 0.85rem;
  font-weight: 900;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 245, 213, 0.2);
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.tooltip-label {
  color: rgba(255, 245, 213, 0.7);
  font-weight: 600;
}

.tooltip-value {
  font-weight: 800;
  color: #fff5d5;
}

.tooltip-desc {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 245, 213, 0.15);
  font-size: 0.72rem;
  color: rgba(255, 245, 213, 0.65);
  white-space: normal;
  line-height: 1.5;
}

.tooltip-loading {
  font-size: 0.75rem;
  color: rgba(255, 245, 213, 0.6);
  padding: 4px 0;
}

.load-state {
  position: fixed;
  left: 50%;
  bottom: 20px;
  max-width: min(420px, calc(100% - 28px));
  padding: 10px 14px;
  color: #8d291f;
  background: rgba(255, 235, 230, 0.96);
  border: 1px solid rgba(141, 41, 31, 0.18);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 800;
  transform: translateX(-50%);
}

@media (max-width: 520px) {
  .lego-stage {
    padding: 34px 12px 120px;
  }

  .stack-row {
    height: 114px;
    margin-top: -14px;
  }
}

.block-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 24px;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
}

.modal-card {
  position: relative;
  background: rgba(255, 253, 248, 0.98);
  border: 1px solid rgba(141, 41, 31, 0.12);
  border-radius: 14px;
  padding: 24px;
  width: min(380px, calc(100vw - 48px));
  box-shadow: 0 16px 48px rgba(35, 29, 20, 0.25);
  animation: modal-in 0.25s ease;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  background: none;
  border: none;
  font-size: 1.6rem;
  line-height: 1;
  color: rgba(33, 29, 23, 0.45);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(141, 41, 31, 0.08);
    color: #8d291f;
  }
}

.modal-header {
  font-size: 1.4rem;
  font-weight: 950;
  color: #211d17;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(141, 41, 31, 0.12);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-row {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }
}

.modal-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(33, 29, 23, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.modal-value {
  font-size: 0.88rem;
  font-weight: 800;
  color: #211d17;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.modal-hash {
  font-size: 0.78rem;
  color: rgba(33, 29, 23, 0.75);
}

.modal-message {
  font-size: 0.82rem;
  color: rgba(33, 29, 23, 0.85);
  white-space: pre-wrap;
  line-height: 1.4;
  background: rgba(141, 41, 31, 0.04);
  padding: 8px 10px;
  border-radius: 6px;
}

.modal-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.modal-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 900;

  &.difficulty {
    background: rgba(111, 139, 132, 0.14);
    color: #4f6862;
  }

  &.halving {
    background: rgba(138, 116, 142, 0.14);
    color: #65516a;
  }
}
</style>
