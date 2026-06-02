import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { fetchBlock, fetchBlockTransactions, fetchBlocks, fetchMempool, fetchStatus } from '@/api'
import type { BlockData, MempoolData, TransactionSummaryData } from '@/api'
import type { DeviceKind } from '@/composables/useDeviceKind'
import {
  DIFFICULTY_INTERVAL,
  HALVING_INTERVAL,
  SATOSHI_PER_BTC,
  blockTxCount,
  btcPerKvBToSatPerVByte,
  formatBTCAmount as formatBTCAmountWithUnit,
  formatBlockReward as formatBlockRewardWithUnit,
  formatBlockSubsidy as formatBlockSubsidyWithUnit,
  formatBlockTime as formatBlockTimeWithMode,
  formatBlockTimeParts as formatBlockTimePartsWithMode,
  formatDuration,
  formatFeeRate,
  formatHashrate,
  formatNumber,
  formatSatoshiAmount as formatSatoshiAmountWithUnit,
  formatSize,
  formatTimeDisplayModeLabel,
  isDifficultyAdjustment,
  isHalving,
  shortHash
} from '@/domain/bitcoin'
import type { DisplayUnit, TimeDisplayMode } from '@/domain/bitcoin'

const DESKTOP_ROW_HEIGHT = 76
const MOBILE_ROW_HEIGHT = 88
const DEFAULT_TIP_HEIGHT = 900000
const DEFAULT_VISIBLE_COUNT = 20
const SCROLL_THROTTLE = 300
const NEW_BLOCK_ANIMATION_MS = 1200
const NEW_BLOCK_STAGGER_MS = 160
const NEW_BLOCK_SOUND_MIN_INTERVAL_MS = 1400
const DISPLAY_UNIT_STORAGE_KEY = 'bitcoin-content-display-unit'
const TIME_DISPLAY_MODE_STORAGE_KEY = 'bitcoin-content-time-display-mode'
const TRANSACTION_HISTORY_PAGE_SIZE = 25

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

export function useBitcoinExplorer(deviceKind: Readonly<Ref<DeviceKind>>) {
  const tipHeight = ref<number>(DEFAULT_TIP_HEIGHT)
  const blocks = ref<Map<number, BlockData>>(new Map())
  const visibleStartHeight = ref<number>(DEFAULT_TIP_HEIGHT - DEFAULT_VISIBLE_COUNT + 1)
  const visibleCount = ref<number>(DEFAULT_VISIBLE_COUNT)
  const containerHeight = ref<number>(0)
  const errorMessage = ref<string>('')
  const trackRef = ref<HTMLElement | null>(null)
  const initialLoading = ref(true)

  const selectedBlock = ref<BlockData | null>(null)
  const selectedBlockLoading = ref(false)
  const selectedBlockError = ref('')
  const transactionHistoryVisible = ref(false)
  const transactionHistory = ref<TransactionSummaryData[]>([])
  const transactionHistoryLoading = ref(false)
  const transactionHistoryLoadingMore = ref(false)
  const transactionHistoryError = ref('')
  const transactionHistoryHasMore = ref(false)
  const transactionHistoryTotal = ref<number | null>(null)
  const transactionHistoryNextOffset = ref(0)
  const transactionHistoryBlockHeight = ref<number | null>(null)
  const networkModalVisible = ref(false)
  const mempoolModalVisible = ref(false)
  const settingsModalVisible = ref(false)
  const mempoolData = ref<MempoolData | null>(null)
  const mempoolLoading = ref(false)
  const newlyMinedBlockDelays = ref<Map<number, number>>(new Map())
  const displayUnit = ref<DisplayUnit>(readStoredDisplayUnit())
  const timeDisplayMode = ref<TimeDisplayMode>(readStoredTimeDisplayMode())

  let throttleTimer: ReturnType<typeof setTimeout> | null = null
  let isDragging = false
  let dragStartY = 0
  let dragStartHeight = 0
  let touchStartY = 0
  let touchStartHeight = 0
  let touchMoved = false
  let dragFrame: number | null = null
  let pendingDragClientY = 0
  let newBlockAnimationTimer: ReturnType<typeof setTimeout> | null = null
  let selectedBlockRequestId = 0
  let transactionHistoryRequestId = 0
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let audioContext: AudioContext | null = null
  let blockSoundElement: HTMLAudioElement | null = null
  let audioUnlocked = false
  let lastNewBlockSoundAt = 0

  const nextHalvingHeight = computed(() => {
    return Math.ceil((tipHeight.value + 1) / HALVING_INTERVAL) * HALVING_INTERVAL
  })

  const blocksToHalving = computed(() => {
    return Math.max(0, nextHalvingHeight.value - tipHeight.value)
  })

  const nextDifficultyHeight = computed(() => {
    return Math.ceil((tipHeight.value + 1) / DIFFICULTY_INTERVAL) * DIFFICULTY_INTERVAL
  })

  const blocksToDifficulty = computed(() => {
    return Math.max(0, nextDifficultyHeight.value - tipHeight.value)
  })

  const currentBlockReward = computed(() => {
    const halvings = Math.floor(tipHeight.value / HALVING_INTERVAL)
    return 50 / Math.pow(2, halvings)
  })

  const averageMempoolFeeRate = computed(() => {
    if (!mempoolData.value || mempoolData.value.bytes <= 0) return 0
    return (mempoolData.value.total_fee * SATOSHI_PER_BTC) / mempoolData.value.bytes
  })

  const selectedTransactions = computed(() => {
    return selectedBlock.value?.tx_summary ?? []
  })

  const blockTimeModeLabel = computed(() => {
    return formatTimeDisplayModeLabel(timeDisplayMode.value)
  })

  const transactionHistoryDisplayTotal = computed(() => {
    if (transactionHistoryTotal.value !== null) return transactionHistoryTotal.value
    if (selectedBlock.value) return blockTxCount(selectedBlock.value)
    return transactionHistory.value.length
  })

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
    return Math.max(deviceKind.value === 'mobile' ? 48 : 40, ratio * trackHeight.value)
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

  const stackClass = computed(() => {
    const isTopEnd = visibleStartHeight.value >= maxStartHeight.value
    const isBottomEnd = visibleStartHeight.value <= 0

    return [
      isTopEnd
        ? 'top-end'
        : isBottomEnd
          ? 'bottom-end'
          : '',
      isTopEnd && newlyMinedBlockDelays.value.size > 0 ? 'mining-update' : ''
    ]
  })

  async function openModal(block: BlockData) {
    const requestId = ++selectedBlockRequestId
    resetTransactionHistory()
    selectedBlock.value = block
    selectedBlockLoading.value = true
    selectedBlockError.value = ''

    try {
      const detail = await fetchBlock(block.height)
      if (selectedBlock.value?.height === block.height && requestId === selectedBlockRequestId) {
        selectedBlock.value = { ...block, ...detail }
      }
    } catch {
      if (selectedBlock.value?.height === block.height && requestId === selectedBlockRequestId) {
        selectedBlockError.value = '상세 정보를 불러오지 못했습니다.'
      }
    } finally {
      if (selectedBlock.value?.height === block.height && requestId === selectedBlockRequestId) {
        selectedBlockLoading.value = false
      }
    }
  }

  function closeModal() {
    selectedBlockRequestId++
    resetTransactionHistory()
    selectedBlock.value = null
    selectedBlockLoading.value = false
    selectedBlockError.value = ''
  }

  function openTransactionHistory() {
    if (!selectedBlock.value) return

    transactionHistoryVisible.value = true
    if (
      transactionHistoryBlockHeight.value !== selectedBlock.value.height ||
      transactionHistory.value.length === 0
    ) {
      loadBlockTransactions(true)
    }
  }

  function closeTransactionHistory() {
    transactionHistoryVisible.value = false
  }

  function loadMoreBlockTransactions() {
    if (!transactionHistoryVisible.value) return
    if (!transactionHistoryHasMore.value) return
    if (transactionHistoryLoading.value || transactionHistoryLoadingMore.value) return

    loadBlockTransactions(false)
  }

  async function loadBlockTransactions(reset: boolean) {
    const block = selectedBlock.value
    if (!block) return
    if (transactionHistoryLoading.value || transactionHistoryLoadingMore.value) return

    const requestId = ++transactionHistoryRequestId
    const offset = reset ? 0 : transactionHistoryNextOffset.value
    const loadingRef = reset ? transactionHistoryLoading : transactionHistoryLoadingMore

    loadingRef.value = true
    transactionHistoryError.value = ''

    try {
      const page = await fetchBlockTransactions(block.height, offset, TRANSACTION_HISTORY_PAGE_SIZE)
      if (selectedBlock.value?.height !== block.height || requestId !== transactionHistoryRequestId) return

      const nextTransactions = Array.isArray(page.transactions) ? page.transactions : []
      transactionHistoryBlockHeight.value = block.height
      transactionHistory.value = reset
        ? nextTransactions
        : appendUniqueTransactions(transactionHistory.value, nextTransactions)
      transactionHistoryTotal.value = typeof page.total === 'number' ? page.total : null

      const nextOffset = typeof page.next_offset === 'number'
        ? page.next_offset
        : offset + nextTransactions.length
      transactionHistoryNextOffset.value = nextOffset
      transactionHistoryHasMore.value = page.has_more ?? (
        nextTransactions.length >= TRANSACTION_HISTORY_PAGE_SIZE &&
        (transactionHistoryTotal.value === null || nextOffset < transactionHistoryTotal.value)
      )
    } catch {
      if (selectedBlock.value?.height !== block.height || requestId !== transactionHistoryRequestId) return

      if (reset && selectedTransactions.value.length) {
        transactionHistoryBlockHeight.value = block.height
        transactionHistory.value = selectedTransactions.value
        transactionHistoryTotal.value = blockTxCount(block) || selectedTransactions.value.length
        transactionHistoryNextOffset.value = selectedTransactions.value.length
        transactionHistoryHasMore.value = false
        transactionHistoryError.value = '거래 페이지 API를 사용할 수 없어 블록 상세에 포함된 거래만 표시합니다.'
      } else {
        transactionHistoryError.value = '추가 거래내역을 불러오지 못했습니다.'
      }
    } finally {
      if (requestId === transactionHistoryRequestId) {
        loadingRef.value = false
      }
    }
  }

  function resetTransactionHistory() {
    transactionHistoryRequestId++
    transactionHistoryVisible.value = false
    transactionHistory.value = []
    transactionHistoryLoading.value = false
    transactionHistoryLoadingMore.value = false
    transactionHistoryError.value = ''
    transactionHistoryHasMore.value = false
    transactionHistoryTotal.value = null
    transactionHistoryNextOffset.value = 0
    transactionHistoryBlockHeight.value = null
  }

  function appendUniqueTransactions(
    existing: TransactionSummaryData[],
    incoming: TransactionSummaryData[]
  ): TransactionSummaryData[] {
    const seen = new Set(existing.map(tx => tx.txid || tx.hash).filter(Boolean))
    const next = [...existing]

    incoming.forEach(tx => {
      const key = tx.txid || tx.hash
      if (key && seen.has(key)) return
      if (key) seen.add(key)
      next.push(tx)
    })

    return next
  }

  function openNetworkModal() {
    closeModal()
    closeDockModals()
    networkModalVisible.value = true
    loadMempoolData()
  }

  function closeNetworkModal() {
    networkModalVisible.value = false
    mempoolData.value = null
    mempoolLoading.value = false
  }

  async function loadMempoolData() {
    mempoolLoading.value = true
    mempoolData.value = null
    try {
      mempoolData.value = await fetchMempool()
    } catch {
      mempoolData.value = null
    } finally {
      mempoolLoading.value = false
    }
  }

  function closeMempoolModal() {
    closeNetworkModal()
  }

  function openSettingsModal() {
    closeModal()
    closeDockModals()
    settingsModalVisible.value = true
  }

  function closeSettingsModal() {
    settingsModalVisible.value = false
  }

  function closeDockModals() {
    networkModalVisible.value = false
    mempoolModalVisible.value = false
    settingsModalVisible.value = false
    mempoolData.value = null
  }

  function setDisplayUnit(unit: DisplayUnit) {
    displayUnit.value = unit
    try {
      window.localStorage.setItem(DISPLAY_UNIT_STORAGE_KEY, unit)
    } catch {
      // Ignore storage failures; the in-memory setting still applies.
    }
  }

  function setTimeDisplayMode(mode: TimeDisplayMode) {
    timeDisplayMode.value = mode
    try {
      window.localStorage.setItem(TIME_DISPLAY_MODE_STORAGE_KEY, mode)
    } catch {
      // Ignore storage failures; the in-memory setting still applies.
    }
  }

  function setTrackElement(element: unknown) {
    trackRef.value = element instanceof HTMLElement ? element : null
  }

  function formatBlockTime(timestamp: number | null): string {
    return formatBlockTimeWithMode(timestamp, timeDisplayMode.value)
  }

  function formatBlockTimeParts(timestamp: number | null) {
    return formatBlockTimePartsWithMode(timestamp, timeDisplayMode.value)
  }

  function formatSatoshiAmount(satoshi: number | null | undefined): string {
    return formatSatoshiAmountWithUnit(satoshi, displayUnit.value)
  }

  function formatBTCAmount(value: number | null | undefined): string {
    return formatBTCAmountWithUnit(value, displayUnit.value)
  }

  function formatBlockSubsidy(block: BlockData): string {
    return formatBlockSubsidyWithUnit(block, displayUnit.value)
  }

  function formatBlockReward(block: BlockData): string {
    return formatBlockRewardWithUnit(block, displayUnit.value)
  }

  function isNewlyMinedBlock(height: number): boolean {
    return newlyMinedBlockDelays.value.has(height)
  }

  function newlyMinedBlockStyle(height: number): Record<string, string> | undefined {
    const delay = newlyMinedBlockDelays.value.get(height)
    if (delay === undefined) return undefined
    return { '--settle-delay': `${delay}ms` }
  }

  function markNewlyMinedBlocks(from: number, to: number) {
    const animatedFrom = Math.max(from, to - visibleCount.value + 1)
    const next = new Map(newlyMinedBlockDelays.value)
    for (let height = animatedFrom; height <= to; height++) {
      next.set(height, (height - animatedFrom) * NEW_BLOCK_STAGGER_MS)
    }

    newlyMinedBlockDelays.value = next

    if (newBlockAnimationTimer) clearTimeout(newBlockAnimationTimer)
    newBlockAnimationTimer = setTimeout(() => {
      newlyMinedBlockDelays.value = new Map()
      newBlockAnimationTimer = null
    }, NEW_BLOCK_ANIMATION_MS + Math.max(0, to - animatedFrom) * NEW_BLOCK_STAGGER_MS)
  }

  function calculateVisibleCount() {
    const rowStep = getRowStep()
    if (containerHeight.value <= 132) {
      visibleCount.value = deviceKind.value === 'mobile' ? 7 : 9
    } else {
      visibleCount.value = Math.ceil((containerHeight.value - 132) / rowStep) + 2
    }
  }

  function handleWheel(e: WheelEvent) {
    if (shouldIgnoreStageWheel(e.target)) return

    e.preventDefault()
    const max = maxStartHeight.value
    const delta = Math.round(e.deltaY / 50)
    visibleStartHeight.value = Math.max(0, Math.min(max, visibleStartHeight.value - delta))

    scheduleFetchVisibleBlocks()
  }

  function handleTouchStart(e: TouchEvent) {
    if (shouldIgnoreStageWheel(e.target) || e.touches.length !== 1) return
    touchMoved = false
    touchStartY = e.touches[0].clientY
    touchStartHeight = visibleStartHeight.value
  }

  function handleTouchMove(e: TouchEvent) {
    if (shouldIgnoreStageWheel(e.target) || e.touches.length !== 1) return

    const deltaY = touchStartY - e.touches[0].clientY
    if (Math.abs(deltaY) < 4) return

    e.preventDefault()
    touchMoved = true
    const max = maxStartHeight.value
    visibleStartHeight.value = Math.max(
      0,
      Math.min(max, touchStartHeight - Math.round(deltaY / getRowStep()))
    )

    scheduleFetchVisibleBlocks()
  }

  function handleTouchEnd() {
    if (!touchMoved) return
    touchMoved = false
    fetchVisibleBlocks()
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

      containerHeight.value = getViewportHeight()
      calculateVisibleCount()

      visibleStartHeight.value = maxStartHeight.value

      await fetchVisibleBlocks()
    } catch (error: unknown) {
      if (error instanceof Error) {
        errorMessage.value = error.message
      }
    } finally {
      initialLoading.value = false
    }
  }

  function handleThumbDrag(e: MouseEvent) {
    e.preventDefault()
    isDragging = true
    dragStartY = e.clientY
    dragStartHeight = visibleStartHeight.value

    const handleMouseMove = (e: MouseEvent) => updateThumbDrag(e.clientY)

    const handleMouseUp = () => {
      isDragging = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      fetchVisibleBlocks()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleThumbTouchDrag(e: TouchEvent) {
    if (e.touches.length !== 1) return
    isDragging = true
    dragStartY = e.touches[0].clientY
    dragStartHeight = visibleStartHeight.value

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      e.preventDefault()
      updateThumbDrag(e.touches[0].clientY)
    }

    const handleTouchEnd = () => {
      isDragging = false
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      fetchVisibleBlocks()
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)
  }

  function handleTrackClick(e: MouseEvent) {
    if (e.target !== trackRef.value) return
    updateTrackPosition(e.clientY)
  }

  function handleTrackTouch(e: TouchEvent) {
    if (e.touches.length !== 1) return
    updateTrackPosition(e.touches[0].clientY)
  }

  function handleResize() {
    containerHeight.value = getViewportHeight()
    calculateVisibleCount()

    const max = maxStartHeight.value
    if (initialLoading.value || visibleStartHeight.value > max) {
      visibleStartHeight.value = max
    }
  }

  async function pollStatus() {
    try {
      const status = await fetchStatus()
      const newTip = status.blockchain.blocks
      const oldTip = tipHeight.value

      if (newTip > oldTip) {
        const addedBlockCount = newTip - oldTip
        markNewlyMinedBlocks(oldTip + 1, newTip)
        playNewBlockSound(addedBlockCount)
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

  function updateThumbDrag(clientY: number) {
    if (!isDragging || !trackRef.value) return
    pendingDragClientY = clientY
    if (dragFrame !== null) return

    dragFrame = window.requestAnimationFrame(() => {
      dragFrame = null
      applyThumbDrag(pendingDragClientY)
    })
  }

  function applyThumbDrag(clientY: number) {
    if (!isDragging || !trackRef.value) return
    const deltaY = dragStartY - clientY
    const trackH = trackRef.value.clientHeight
    const thumbH = thumbHeight.value
    const maxDragDistance = Math.max(1, trackH - thumbH)
    const ratio = deltaY / maxDragDistance
    const max = maxStartHeight.value
    const nextHeight = Math.max(0, Math.min(max, Math.round(dragStartHeight + ratio * max)))
    if (nextHeight !== visibleStartHeight.value) {
      visibleStartHeight.value = nextHeight
    }
  }

  function updateTrackPosition(clientY: number) {
    if (!trackRef.value) return
    const rect = trackRef.value.getBoundingClientRect()
    const clickY = clientY - rect.top
    const trackH = rect.height
    const ratio = 1 - (clickY / trackH)
    const max = maxStartHeight.value
    visibleStartHeight.value = Math.max(0, Math.min(max, Math.round(ratio * max)))

    scheduleFetchVisibleBlocks()
  }

  function scheduleFetchVisibleBlocks() {
    if (throttleTimer) clearTimeout(throttleTimer)
    throttleTimer = setTimeout(() => {
      fetchVisibleBlocks()
    }, SCROLL_THROTTLE)
  }

  function shouldIgnoreStageWheel(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    return Boolean(target.closest('.block-modal, .server-widget, .custom-scrollbar'))
  }

  function getRowStep() {
    return deviceKind.value === 'mobile' ? MOBILE_ROW_HEIGHT : DESKTOP_ROW_HEIGHT
  }

  function getViewportHeight() {
    return typeof window === 'undefined' ? 0 : window.innerHeight
  }

  function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (audioContext) return audioContext

    const AudioContextConstructor = window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext
    if (!AudioContextConstructor) return null

    audioContext = new AudioContextConstructor()
    return audioContext
  }

  function getBlockSoundElement(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null
    if (blockSoundElement) return blockSoundElement

    blockSoundElement = new Audio(`${import.meta.env.BASE_URL}new-block-chime.wav`)
    blockSoundElement.preload = 'auto'
    blockSoundElement.volume = 0.42
    return blockSoundElement
  }

  function unlockBlockSound() {
    const context = getAudioContext()
    const sound = getBlockSoundElement()
    if ((!context && !sound) || audioUnlocked) return

    const finishUnlock = () => {
      unlockBlockSoundFile(sound)
      if (!context) {
        audioUnlocked = true
        return
      }

      const gain = context.createGain()
      const oscillator = context.createOscillator()
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.01)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
      audioUnlocked = true
    }

    if (!context) {
      finishUnlock()
      return
    }

    if (context.state === 'suspended') {
      context.resume().then(finishUnlock).catch(() => {
        // The next user gesture can try again.
      })
      return
    }

    finishUnlock()
  }

  function unlockBlockSoundFile(sound: HTMLAudioElement | null) {
    if (!sound) return
    const previousVolume = sound.volume
    sound.volume = 0
    sound.currentTime = 0
    sound.play()
      .then(() => {
        sound.pause()
        sound.currentTime = 0
        sound.volume = previousVolume
      })
      .catch(() => {
        sound.volume = previousVolume
      })
  }

  function playNewBlockSound(blockCount: number) {
    const context = getAudioContext()
    const sound = getBlockSoundElement()
    if (!context && !sound) return

    const now = Date.now()
    if (now - lastNewBlockSoundAt < NEW_BLOCK_SOUND_MIN_INTERVAL_MS) return
    lastNewBlockSoundAt = now

    if (!context) {
      playBlockSoundFile(blockCount)
      return
    }

    const play = () => {
      const start = context.currentTime + 0.02
      const gain = Math.min(0.13, 0.075 + blockCount * 0.012)

      playGlassTone(context, start, 523.25, 0.14, gain * 0.55)
      playGlassTone(context, start + 0.055, 783.99, 0.17, gain)
      playGlassTone(context, start + 0.13, 1174.66, 0.24, gain * 0.5)
    }

    if (context.state === 'suspended') {
      context.resume().then(play).catch(() => {
        playBlockSoundFile(blockCount)
      })
      return
    }

    play()
  }

  function playBlockSoundFile(blockCount: number) {
    const sound = getBlockSoundElement()
    if (!sound) return

    sound.pause()
    sound.currentTime = 0
    sound.volume = Math.min(0.58, 0.36 + blockCount * 0.035)
    sound.play().catch(() => {
      // Browsers may require a prior user gesture before allowing audio.
    })
  }

  function playGlassTone(
    context: AudioContext,
    start: number,
    frequency: number,
    duration: number,
    peakGain: number
  ) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const filter = context.createBiquadFilter()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.015, start + duration)

    filter.type = 'highpass'
    filter.frequency.setValueAtTime(180, start)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), start + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
    oscillator.onended = () => {
      oscillator.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
  }

  function readStoredDisplayUnit(): DisplayUnit {
    try {
      const stored = window.localStorage.getItem(DISPLAY_UNIT_STORAGE_KEY)
      return stored === 'sats' ? 'sats' : 'btc'
    } catch {
      return 'btc'
    }
  }

  function readStoredTimeDisplayMode(): TimeDisplayMode {
    try {
      const stored = window.localStorage.getItem(TIME_DISPLAY_MODE_STORAGE_KEY)
      return stored === 'utc' ? 'utc' : 'local'
    } catch {
      return 'local'
    }
  }

  onMounted(() => {
    bootstrap().then(() => {
      pollTimer = setInterval(pollStatus, 10000)
    })

    window.addEventListener('pointerdown', unlockBlockSound, { once: true, passive: true })
    window.addEventListener('keydown', unlockBlockSound, { once: true })
    window.addEventListener('touchstart', unlockBlockSound, { once: true, passive: true })
    window.addEventListener('resize', handleResize)
  })

  watch(deviceKind, () => {
    handleResize()
    fetchVisibleBlocks()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('pointerdown', unlockBlockSound)
    window.removeEventListener('keydown', unlockBlockSound)
    window.removeEventListener('touchstart', unlockBlockSound)
    if (throttleTimer) clearTimeout(throttleTimer)
    if (pollTimer) clearInterval(pollTimer)
    if (newBlockAnimationTimer) clearTimeout(newBlockAnimationTimer)
    if (dragFrame !== null) window.cancelAnimationFrame(dragFrame)
    if (audioContext) {
      audioContext.close().catch(() => {
        // Ignore close failures during teardown.
      })
    }
  })

  return {
    tipHeight,
    visibleStartHeight,
    visibleCount,
    initialLoading,
    errorMessage,
    selectedBlock,
    selectedBlockLoading,
    selectedBlockError,
    transactionHistoryVisible,
    transactionHistory,
    transactionHistoryLoading,
    transactionHistoryLoadingMore,
    transactionHistoryError,
    transactionHistoryHasMore,
    transactionHistoryTotal,
    transactionHistoryDisplayTotal,
    networkModalVisible,
    mempoolModalVisible,
    settingsModalVisible,
    mempoolData,
    mempoolLoading,
    displayUnit,
    timeDisplayMode,
    blockTimeModeLabel,
    nextHalvingHeight,
    blocksToHalving,
    nextDifficultyHeight,
    blocksToDifficulty,
    currentBlockReward,
    averageMempoolFeeRate,
    selectedTransactions,
    maxStartHeight,
    visibleBlocks,
    thumbStyle,
    scaleMarks,
    stackClass,
    openModal,
    closeModal,
    openTransactionHistory,
    closeTransactionHistory,
    loadMoreBlockTransactions,
    openNetworkModal,
    closeNetworkModal,
    closeMempoolModal,
    openSettingsModal,
    closeSettingsModal,
    closeDockModals,
    setDisplayUnit,
    setTimeDisplayMode,
    setTrackElement,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleThumbDrag,
    handleThumbTouchDrag,
    handleTrackClick,
    handleTrackTouch,
    formatDuration,
    formatNumber,
    isDifficultyAdjustment,
    isHalving,
    formatBlockTime,
    formatBlockTimeParts,
    formatSatoshiAmount,
    formatBTCAmount,
    formatBlockSubsidy,
    formatBlockReward,
    blockTxCount,
    formatFeeRate,
    shortHash,
    formatSize,
    btcPerKvBToSatPerVByte,
    formatHashrate,
    isNewlyMinedBlock,
    newlyMinedBlockStyle
  }
}

export type BitcoinExplorerController = ReturnType<typeof useBitcoinExplorer>
