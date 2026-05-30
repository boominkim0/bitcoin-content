<template>
  <main class="lego-stage" ref="stageRef">
    <div class="blocks-container">
      <TransitionGroup
        tag="ol"
        name="stack"
        class="block-stack"
        :class="stackClass"
      >
        <li
          v-for="block in visibleBlocks"
          :key="block.height"
          class="stack-row"
          :class="{ 'newly-mined-row': isNewlyMinedBlock(block.height) }"
          :style="newlyMinedBlockStyle(block.height)"
        >
          <Block
            :block="block"
            :is-new="isNewlyMinedBlock(block.height)"
            @select="openModal"
          />
        </li>
        <li :key="tipHeight + 1" class="stack-row ing-block">
          <Block :block="{ height: tipHeight + 1, hash: null, time: null }" is-ing />
        </li>
      </TransitionGroup>
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
    <ServerStatusPanel @open-network="openNetworkModal" @open-mempool="openMempoolModal" @open-settings="openSettingsModal" />

    <div v-if="networkModalVisible" class="block-modal" @click.self="closeNetworkModal" @wheel.stop>
      <div class="modal-card">
        <button class="modal-close" @click="closeNetworkModal">&times;</button>
        <div class="modal-header">비트코인 네트워크</div>
        <div class="modal-body">
          <div class="modal-section">
            <div class="modal-section-title">현재 체인</div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">최신 블록</span>
                <span class="modal-value">#{{ formatNumber(tipHeight) }}</span>
              </div>
              <div>
                <span class="modal-label">채굴 대기</span>
                <span class="modal-value">#{{ formatNumber(tipHeight + 1) }}</span>
              </div>
            </div>
          </div>

          <div class="modal-section">
            <div class="modal-section-title">반감기 (Halving)</div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">다음 반감기</span>
                <span class="modal-value">#{{ formatNumber(nextHalvingHeight) }}</span>
              </div>
              <div>
                <span class="modal-label">남은 블록</span>
                <span class="modal-value">{{ blocksToHalving.toLocaleString('ko-KR') }} 블록</span>
              </div>
            </div>
            <div class="modal-row">
              <span class="modal-label">예상 남은 시간</span>
              <span class="modal-value">{{ formatDuration(blocksToHalving * 10) }}</span>
            </div>
          </div>

          <div class="modal-section">
            <div class="modal-section-title">난이도 조정 (Difficulty Adjustment)</div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">다음 조정</span>
                <span class="modal-value">#{{ formatNumber(nextDifficultyHeight) }}</span>
              </div>
              <div>
                <span class="modal-label">남은 블록</span>
                <span class="modal-value">{{ blocksToDifficulty.toLocaleString('ko-KR') }} 블록</span>
              </div>
            </div>
            <div class="modal-row">
              <span class="modal-label">예상 남은 시간</span>
              <span class="modal-value">{{ formatDuration(blocksToDifficulty * 10) }}</span>
            </div>
          </div>

          <div class="modal-section">
            <div class="modal-section-title">현재 보상</div>
            <div class="modal-row">
              <span class="modal-label">블록 보상</span>
              <span class="modal-value">{{ formatBTCAmount(currentBlockReward) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mempoolModalVisible" class="block-modal" @click.self="closeMempoolModal" @wheel.stop>
      <div class="modal-card">
        <button class="modal-close" @click="closeMempoolModal">&times;</button>
        <div class="modal-header">네트워크 대기열 (Mempool)</div>
        <div class="modal-body">
          <div v-if="mempoolLoading" class="tooltip-loading">불러오는 중...</div>
          <template v-else-if="mempoolData">
            <div class="modal-section">
              <div class="modal-section-title">대기 중인 트랜잭션</div>
              <div class="modal-row two-col">
                <div>
                  <span class="modal-label">트랜잭션 수</span>
                  <span class="modal-value">{{ mempoolData.size.toLocaleString('ko-KR') }} tx</span>
                </div>
                <div>
                  <span class="modal-label">총 크기</span>
                  <span class="modal-value">{{ formatSize(mempoolData.bytes) }}</span>
                </div>
              </div>
              <div class="modal-row two-col">
                <div>
                  <span class="modal-label">총 수수료</span>
                  <span class="modal-value">{{ formatBTCAmount(mempoolData.total_fee) }}</span>
                </div>
                <div>
                  <span class="modal-label">평균 수수료</span>
                  <span class="modal-value">{{ averageMempoolFeeRate.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }} sat/vB</span>
                </div>
              </div>
            </div>

            <div class="modal-section">
              <div class="modal-section-title">수수료 기준</div>
              <div class="modal-row two-col">
                <div>
                  <span class="modal-label">Mempool 최저</span>
                  <span class="modal-value">{{ btcPerKvBToSatPerVByte(mempoolData.mempoolminfee).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }} sat/vB</span>
                </div>
                <div>
                  <span class="modal-label">Relay 최저</span>
                  <span class="modal-value">{{ btcPerKvBToSatPerVByte(mempoolData.minrelaytxfee).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }} sat/vB</span>
                </div>
              </div>
            </div>

            <div class="modal-section">
              <div class="modal-section-title">메모리풀 상태</div>
              <div class="modal-row two-col">
                <div>
                  <span class="modal-label">메모리 사용량</span>
                  <span class="modal-value">{{ formatSize(mempoolData.usage) }}</span>
                </div>
                <div>
                  <span class="modal-label">최대 용량</span>
                  <span class="modal-value">{{ formatSize(mempoolData.maxmempool) }}</span>
                </div>
              </div>
              <div class="modal-row two-col">
                <div>
                  <span class="modal-label">미전파 거래</span>
                  <span class="modal-value">{{ mempoolData.unbroadcastcount.toLocaleString('ko-KR') }} tx</span>
                </div>
                <div>
                  <span class="modal-label">증분 Relay</span>
                  <span class="modal-value">{{ btcPerKvBToSatPerVByte(mempoolData.incrementalrelayfee).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }} sat/vB</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="tooltip-loading">데이터를 불러올 수 없습니다</div>
        </div>
      </div>
    </div>

    <div v-if="settingsModalVisible" class="block-modal" @click.self="closeSettingsModal" @wheel.stop>
      <div class="modal-card settings-card">
        <button class="modal-close" @click="closeSettingsModal">&times;</button>
        <div class="modal-header">표기 설정</div>
        <div class="modal-body">
          <div class="modal-section">
            <div class="modal-section-title">금액 단위</div>
            <div class="unit-options">
              <button
                class="unit-option"
                :class="{ active: displayUnit === 'btc' }"
                type="button"
                @click="setDisplayUnit('btc')"
              >
                <strong>BTC</strong>
                <span>0.0000 0000 형식</span>
              </button>
              <button
                class="unit-option"
                :class="{ active: displayUnit === 'sats' }"
                type="button"
                @click="setDisplayUnit('sats')"
              >
                <strong>sats</strong>
                <span>정수 사토시 형식</span>
              </button>
            </div>
            <div class="modal-state">선택한 단위는 이 브라우저에 저장되어 다음 방문에도 유지됩니다.</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedBlock" class="block-modal" @click.self="closeModal" @wheel.stop>
      <div class="modal-card detail-card">
        <button class="modal-close" @click="closeModal">&times;</button>
        <div class="modal-header">#{{ formatNumber(selectedBlock.height) }}</div>
        <div class="modal-body">
          <div v-if="selectedBlockLoading" class="modal-state">상세 정보를 불러오는 중...</div>
          <div v-if="selectedBlockError" class="modal-state error">{{ selectedBlockError }}</div>

          <div class="modal-row">
            <span class="modal-label">해시 <InfoTip text="블록을 고유하게 식별하는 64자리 지문입니다. 블록 내용이 조금이라도 바뀌면 해시도 달라집니다." /></span>
            <span class="modal-value modal-hash">{{ selectedBlock.hash ?? '---' }}</span>
          </div>

          <div class="modal-row two-col">
            <div>
              <span class="modal-label">블록 시간 <InfoTip text="채굴자가 블록 헤더에 기록한 UTC 기준 시간입니다. 네트워크가 허용하는 범위 안에서 실제 발견 시각과 약간 다를 수 있습니다." /></span>
              <span class="modal-value">{{ formatBlockTime(selectedBlock.time, 0) }}</span>
            </div>
            <div>
              <span class="modal-label">한국 시간 <InfoTip text="블록 시간을 한국 표준시(UTC+9)로 바꿔 보여줍니다." /></span>
              <span class="modal-value">{{ formatBlockTime(selectedBlock.time, 9) }}</span>
            </div>
          </div>

          <div class="modal-section">
            <div class="modal-section-title">채굴 수익</div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">보조금 <InfoTip text="새 블록을 만든 채굴자에게 새로 발행되어 지급되는 BTC입니다. 반감기마다 줄어듭니다." /></span>
                <span class="modal-value">{{ formatBlockSubsidy(selectedBlock) }}</span>
              </div>
              <div>
                <span class="modal-label">수수료 <InfoTip text="이 블록에 포함된 거래들이 낸 수수료의 합계입니다. 채굴자는 보조금과 함께 이 수수료를 받습니다." /></span>
                <span class="modal-value">{{ formatSatoshiAmount(selectedBlock.total_fee_satoshi) }}</span>
              </div>
            </div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">총 보상 <InfoTip text="채굴자가 받은 총액입니다. 보조금과 거래 수수료를 더한 값입니다." /></span>
                <span class="modal-value">{{ formatBlockReward(selectedBlock) }}</span>
              </div>
              <div>
                <span class="modal-label">평균 수수료 <InfoTip text="블록 안의 일반 거래들이 평균적으로 낸 수수료입니다. Coinbase 거래는 제외됩니다." /></span>
                <span class="modal-value">{{ formatSatoshiAmount(selectedBlock.avg_fee_satoshi) }}</span>
              </div>
            </div>
          </div>

          <div class="modal-section">
            <div class="modal-section-title">거래내역 <InfoTip text="블록에 포함된 거래 요약입니다. 화면에는 처음 일부 거래만 표시하고, 전체 거래 수는 별도로 보여줍니다." /></div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">거래 수 <InfoTip text="이 블록 안에 들어 있는 전체 거래 개수입니다. 첫 거래는 항상 Coinbase 거래입니다." /></span>
                <span class="modal-value">{{ blockTxCount(selectedBlock).toLocaleString('ko-KR') }} tx</span>
              </div>
              <div>
                <span class="modal-label">평균 수수료율 <InfoTip text="거래 데이터 크기(vB)당 평균 수수료입니다. 수수료 시장이 얼마나 비싼지 보는 지표입니다." /></span>
                <span class="modal-value">{{ formatFeeRate(selectedBlock.avg_fee_rate) }}</span>
              </div>
            </div>

            <div v-if="selectedTransactions.length" class="tx-list">
              <div v-for="tx in selectedTransactions" :key="tx.txid || tx.hash" class="tx-item">
                <div class="tx-head">
                  <span class="tx-kind">{{ tx.is_coinbase ? 'Coinbase' : 'TX' }}</span>
                  <span>{{ tx.vin_count ?? 0 }} in / {{ tx.vout_count ?? 0 }} out</span>
                </div>
                <div class="txid">{{ shortHash(tx.txid || tx.hash) }}</div>
                <div class="tx-meta">
                  <span>출력 {{ formatSatoshiAmount(tx.output_satoshi) }}</span>
                  <span>{{ tx.is_coinbase ? '채굴 보상 거래' : `수수료 ${formatSatoshiAmount(tx.fee_satoshi)}` }}</span>
                  <span>{{ tx.vsize ?? tx.size ?? '---' }} vB</span>
                </div>
              </div>
              <div v-if="selectedBlock.tx_detail_truncated" class="tx-note">
                거래 상세는 처음 {{ selectedBlock.tx_detail_limit ?? selectedTransactions.length }}개만 API에서 제공합니다.
              </div>
            </div>
            <div v-else class="modal-state">거래 요약을 불러오지 못했습니다.</div>
          </div>

          <div v-if="selectedBlock.coinbase_message" class="modal-section">
            <div class="modal-section-title">채굴자 메시지 <InfoTip text="Coinbase 거래 안에 채굴자나 채굴 풀이 남긴 임의의 텍스트입니다. 모든 블록에 사람이 읽을 수 있는 메시지가 있는 것은 아닙니다." /></div>
            <div class="modal-row">
              <span class="modal-value modal-message">{{ selectedBlock.coinbase_message }}</span>
            </div>
          </div>

          <div class="modal-section">
            <div class="modal-section-title">블록 기술 정보</div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">난이도 <InfoTip text="이 블록을 찾기 위해 필요한 작업량입니다. 값이 클수록 올바른 해시를 찾기 어렵습니다." /></span>
                <span class="modal-value">{{ selectedBlock.difficulty?.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) ?? '---' }}</span>
              </div>
              <div>
                <span class="modal-label">해시레이트 <InfoTip text="최근 블록 간격과 난이도로 추정한 네트워크 전체 연산 속도입니다." /></span>
                <span class="modal-value">{{ formatHashrate(selectedBlock.hashrate_estimate) }}</span>
              </div>
            </div>
            <div class="modal-row two-col">
              <div>
                <span class="modal-label">블록 크기 <InfoTip text="블록 데이터의 실제 바이트 크기입니다." /></span>
                <span class="modal-value">{{ formatSize(selectedBlock.size) }}</span>
              </div>
              <div>
                <span class="modal-label">가중치 <InfoTip text="SegWit 이후 블록 한도를 계산하는 단위입니다. 최대 약 4,000,000 weight unit입니다." /></span>
                <span class="modal-value">{{ selectedBlock.weight?.toLocaleString('ko-KR') ?? '---' }} WU</span>
              </div>
            </div>

            <div v-if="selectedBlock.merkle_root" class="modal-row">
              <span class="modal-label">머클 루트 <InfoTip text="블록 안의 모든 거래를 하나의 해시로 요약한 값입니다. 거래 목록이 바뀌면 머클 루트도 바뀝니다." /></span>
              <span class="modal-value modal-hash">{{ selectedBlock.merkle_root }}</span>
            </div>

            <div v-if="selectedBlock.nonce !== undefined" class="modal-row two-col">
              <div>
                <span class="modal-label">Nonce <InfoTip text="채굴자가 목표 해시를 찾기 위해 바꿔가며 시도한 숫자입니다." /></span>
                <span class="modal-value">{{ selectedBlock.nonce.toLocaleString('ko-KR') }}</span>
              </div>
              <div v-if="selectedBlock.bits">
                <span class="modal-label">Bits <InfoTip text="현재 난이도 목표값을 압축해 표현한 블록 헤더 필드입니다." /></span>
                <span class="modal-value">{{ selectedBlock.bits }}</span>
              </div>
            </div>
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
import { fetchBlock, fetchBlocks, fetchStatus, fetchMempool } from './api'
import type { BlockData, MempoolData } from './api'
import Block from './components/Block.vue'
import InfoTip from './components/InfoTip.vue'
import ServerStatusPanel from './components/ServerStatusPanel.vue'

const ROW_HEIGHT = 76
const SCROLL_THROTTLE = 300
const HALVING_INTERVAL = 210000
const NEW_BLOCK_ANIMATION_MS = 1200
const NEW_BLOCK_STAGGER_MS = 160
const SATOSHI_PER_BTC = 100000000
const DISPLAY_UNIT_STORAGE_KEY = 'bitcoin-content-display-unit'

type DisplayUnit = 'btc' | 'sats'

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
const selectedBlockLoading = ref(false)
const selectedBlockError = ref('')
const networkModalVisible = ref(false)
const mempoolModalVisible = ref(false)
const settingsModalVisible = ref(false)
const mempoolData = ref<MempoolData | null>(null)
const mempoolLoading = ref(false)
const newlyMinedBlockDelays = ref<Map<number, number>>(new Map())
const displayUnit = ref<DisplayUnit>(readStoredDisplayUnit())

let newBlockAnimationTimer: ReturnType<typeof setTimeout> | null = null
let selectedBlockRequestId = 0

async function openModal(block: BlockData) {
  const requestId = ++selectedBlockRequestId
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
  selectedBlock.value = null
  selectedBlockLoading.value = false
  selectedBlockError.value = ''
}

function openNetworkModal() {
  networkModalVisible.value = true
}

function closeNetworkModal() {
  networkModalVisible.value = false
}

async function openMempoolModal() {
  mempoolModalVisible.value = true
  mempoolLoading.value = true
  try {
    mempoolData.value = await fetchMempool()
  } catch {
    mempoolData.value = null
  } finally {
    mempoolLoading.value = false
  }
}

function closeMempoolModal() {
  mempoolModalVisible.value = false
  mempoolData.value = null
}

function openSettingsModal() {
  settingsModalVisible.value = true
}

function closeSettingsModal() {
  settingsModalVisible.value = false
}

function setDisplayUnit(unit: DisplayUnit) {
  displayUnit.value = unit
  try {
    window.localStorage.setItem(DISPLAY_UNIT_STORAGE_KEY, unit)
  } catch {
    // Ignore storage failures; the in-memory setting still applies.
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

const nextHalvingHeight = computed(() => {
  return Math.ceil((tipHeight.value + 1) / HALVING_INTERVAL) * HALVING_INTERVAL
})

const blocksToHalving = computed(() => {
  return Math.max(0, nextHalvingHeight.value - tipHeight.value)
})

const nextDifficultyHeight = computed(() => {
  return Math.ceil((tipHeight.value + 1) / 2016) * 2016
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
  return (mempoolData.value.total_fee * 100000000) / mempoolData.value.bytes
})

const selectedTransactions = computed(() => {
  return selectedBlock.value?.tx_summary ?? []
})

function formatDuration(minutes: number): string {
  const MINUTES_PER_YEAR = 365 * 24 * 60
  const MINUTES_PER_MONTH = 30 * 24 * 60
  const MINUTES_PER_DAY = 24 * 60

  const years = Math.floor(minutes / MINUTES_PER_YEAR)
  minutes %= MINUTES_PER_YEAR
  const months = Math.floor(minutes / MINUTES_PER_MONTH)
  minutes %= MINUTES_PER_MONTH
  const days = Math.floor(minutes / MINUTES_PER_DAY)

  const parts: string[] = []
  if (years > 0) parts.push(`${years}년`)
  if (months > 0) parts.push(`${months}개월`)
  if (days > 0 || parts.length === 0) parts.push(`${days}일`)

  return parts.join(' ')
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

function formatSatoshiAmount(satoshi: number | null | undefined): string {
  if (satoshi === null || satoshi === undefined) return '---'
  if (displayUnit.value === 'sats') {
    return `${Math.round(satoshi).toLocaleString('ko-KR')} sats`
  }
  return `${formatBTCFromSatoshi(satoshi)} BTC`
}

function formatBTCAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '---'
  return formatSatoshiAmount(Math.round(value * SATOSHI_PER_BTC))
}

function formatBTCFromSatoshi(satoshi: number): string {
  const sign = satoshi < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(satoshi))
  const whole = Math.floor(absolute / SATOSHI_PER_BTC).toLocaleString('ko-KR')
  const fraction = String(absolute % SATOSHI_PER_BTC).padStart(8, '0').replace(/0+$/, '')
  if (!fraction) return `${sign}${whole}`
  const groupedFraction = fraction.match(/.{1,4}/g)?.join(' ') ?? fraction
  return `${sign}${whole}.${groupedFraction}`
}

function formatBlockSubsidy(block: BlockData): string {
  if (block.subsidy_satoshi !== undefined) return formatSatoshiAmount(block.subsidy_satoshi)
  return formatBTCAmount(getBlockReward(block.height))
}

function formatBlockReward(block: BlockData): string {
  if (block.reward_satoshi !== undefined) return formatSatoshiAmount(block.reward_satoshi)
  return formatBlockSubsidy(block)
}

function blockTxCount(block: BlockData): number {
  return block.tx_count ?? block.nTx ?? block.tx_summary?.length ?? 0
}

function formatFeeRate(value: number | undefined): string {
  if (value === undefined) return '---'
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} sat/vB`
}

function shortHash(value: string | undefined): string {
  if (!value) return '---'
  if (value.length <= 24) return value
  return `${value.slice(0, 10)}...${value.slice(-10)}`
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

function btcPerKvBToSatPerVByte(value: number): number {
  return value * 100000
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
      : '',
    isTopEnd && newlyMinedBlockDelays.value.size > 0 ? 'mining-update' : ''
  ]
})

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
  if (containerHeight.value <= 132) {
    visibleCount.value = 9
  } else {
    visibleCount.value = Math.ceil((containerHeight.value - 132) / ROW_HEIGHT) + 2
  }
}

function handleWheel(e: WheelEvent) {
  if (shouldIgnoreStageWheel(e.target)) return

  e.preventDefault()
  const max = maxStartHeight.value
  const delta = Math.round(e.deltaY / 50)
  visibleStartHeight.value = Math.max(0, Math.min(max, visibleStartHeight.value - delta))

  if (throttleTimer) clearTimeout(throttleTimer)
  throttleTimer = setTimeout(() => {
    fetchVisibleBlocks()
  }, SCROLL_THROTTLE)
}

function shouldIgnoreStageWheel(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('.block-modal, .server-widget'))
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
      markNewlyMinedBlocks(oldTip + 1, newTip)
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
  if (newBlockAnimationTimer) clearTimeout(newBlockAnimationTimer)
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
}

.newly-mined-row {
  z-index: 2;
}

.ing-block {
  z-index: 3;
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
  display: flex;
  flex-direction: column;
  background: rgba(255, 253, 248, 0.98);
  border: 1px solid rgba(141, 41, 31, 0.12);
  border-radius: 14px;
  padding: 24px;
  width: min(480px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(35, 29, 20, 0.25);
  animation: modal-in 0.25s ease;
}

.detail-card {
  height: calc(100vh - 48px);
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
  flex-shrink: 0;
  font-size: 1.4rem;
  font-weight: 950;
  color: #211d17;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(141, 41, 31, 0.12);
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
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
  display: inline-flex;
  align-items: center;
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

.modal-section {
  padding: 12px 0;
  border-bottom: 1px solid rgba(141, 41, 31, 0.08);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

.modal-section-title {
  font-size: 0.8rem;
  font-weight: 900;
  color: rgba(33, 29, 23, 0.7);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.modal-state {
  padding: 8px 10px;
  color: rgba(33, 29, 23, 0.62);
  background: rgba(33, 29, 23, 0.05);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 800;

  &.error {
    color: #8d291f;
    background: rgba(141, 41, 31, 0.08);
  }
}

.settings-card {
  width: min(360px, calc(100vw - 48px));
}

.unit-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.unit-option {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  color: rgba(33, 29, 23, 0.72);
  background: rgba(33, 29, 23, 0.04);
  border: 1px solid rgba(33, 29, 23, 0.08);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, color 0.15s;

  strong {
    font-size: 0.9rem;
    font-weight: 950;
  }

  span {
    font-size: 0.7rem;
    font-weight: 800;
  }

  &:hover,
  &.active {
    color: #8d291f;
    background: rgba(141, 41, 31, 0.08);
    border-color: rgba(141, 41, 31, 0.18);
  }
}

.tx-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  max-height: 310px;
  overflow-y: auto;
  padding-right: 4px;
}

.tx-item {
  padding: 10px;
  background: rgba(33, 29, 23, 0.04);
  border: 1px solid rgba(33, 29, 23, 0.06);
  border-radius: 9px;
}

.tx-head,
.tx-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: rgba(33, 29, 23, 0.56);
  font-size: 0.68rem;
  font-weight: 850;
}

.tx-kind {
  color: #8d291f;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.txid {
  margin: 6px 0;
  color: #211d17;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.8rem;
  font-weight: 900;
  word-break: break-all;
}

.tx-meta {
  flex-wrap: wrap;
}

.tx-note {
  color: rgba(33, 29, 23, 0.54);
  font-size: 0.72rem;
  font-weight: 750;
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
