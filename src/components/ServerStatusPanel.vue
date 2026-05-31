<template>
  <div class="server-widget" :class="statusClass" aria-live="polite">
    <div class="dock-buttons">
      <button
        class="dock-trigger server-trigger"
        type="button"
        aria-label="서버 상태 보기"
        :aria-expanded="isOpen"
        @click="togglePanel"
      >
        <span class="server-icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span class="status-light"></span>
      </button>
      <button class="dock-trigger network-trigger" type="button" aria-label="비트코인 네트워크 보기" @click="openNetworkPanel">
        <span class="network-icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <button class="dock-trigger mempool-trigger" type="button" aria-label="Mempool 보기" @click="openMempoolPanel">
        <span class="mempool-icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <button class="dock-trigger settings-trigger" type="button" aria-label="표기 설정" @click="openSettingsPanel">
        <span class="settings-icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    </div>

    <Transition name="server-popover">
      <aside v-if="isOpen" class="server-panel">
        <div class="panel-header">
          <div>
            <div class="panel-eyebrow">MINI PC</div>
            <div class="panel-title">서버 상태</div>
          </div>
          <div class="panel-actions">
            <button class="status-pill" :disabled="loading" @click="loadStatus">
              <span class="status-light"></span>
              {{ statusLabel }}
            </button>
            <button class="panel-close" type="button" aria-label="서버 상태 닫기" @click="closePanel">&times;</button>
          </div>
        </div>

        <div class="server-clock">{{ serverTimeLabel }}</div>

        <div v-if="loading && !status" class="panel-muted">상태 확인 중...</div>
        <template v-else-if="status">
          <div class="metric-row">
            <div>
              <span class="metric-label">메모리</span>
              <strong>{{ formatUsage(status.memory) }}</strong>
            </div>
            <span>{{ formatPercent(status.memory?.used_percent) }}</span>
          </div>
          <div class="meter">
            <span :style="meterStyle(status.memory?.used_percent)"></span>
          </div>

          <div class="metric-row">
            <div>
              <span class="metric-label">디스크</span>
              <strong>{{ formatUsage(status.disk) }}</strong>
            </div>
            <span>{{ formatPercent(status.disk?.used_percent) }}</span>
          </div>
          <div class="meter disk-meter">
            <span :style="meterStyle(status.disk?.used_percent)"></span>
          </div>

          <div class="compact-grid">
            <div>
              <span class="metric-label">장부 용량</span>
              <strong>{{ formatBytes(status.bitcoin.ledger_size_bytes) }}</strong>
            </div>
            <div>
              <span class="metric-label">블록</span>
              <strong>{{ formatBlockHeight(status.bitcoin.blocks) }}</strong>
            </div>
          </div>

          <div class="compact-grid">
            <div>
              <span class="metric-label">네트워크</span>
              <strong>{{ networkLabel }}</strong>
            </div>
            <div>
              <span class="metric-label">Uptime</span>
              <strong>{{ formatDuration(status.uptime_seconds) }}</strong>
            </div>
          </div>

          <div class="panel-foot">
            <span>{{ syncLabel }}</span>
            <span>{{ updatedLabel }}</span>
          </div>
        </template>
        <div v-else class="panel-muted">상태 확인 실패</div>
      </aside>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchServerStatus } from '../api'
import type { DiskUsageData, MemoryUsageData, ServerStatusData } from '../api'

const POLL_INTERVAL_MS = 30000

const emit = defineEmits<{
  'open-network': []
  'open-mempool': []
  'open-settings': []
}>()

const status = ref<ServerStatusData | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const lastUpdated = ref<Date | null>(null)
const isOpen = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null

const statusClass = computed(() => {
  if (errorMessage.value) return 'is-error'
  if (!status.value) return 'is-checking'
  return status.value?.network.rpc_ok ? 'is-online' : 'is-error'
})

const statusLabel = computed(() => {
  if (!status.value) return '확인 중'
  if (errorMessage.value || !status.value?.network.rpc_ok) return '주의'
  return '정상'
})

const serverTimeLabel = computed(() => {
  if (!status.value) return '--:--:--'
  const date = new Date(status.value.server_time)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleString('ko-KR', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

const networkLabel = computed(() => {
  const network = status.value?.network
  if (!network) return '---'
  if (!network.rpc_ok) return 'RPC 실패'
  const active = network.bitcoin_network_active === false ? 'OFF' : 'ON'
  const connections = network.connections === null ? '?' : network.connections.toLocaleString('ko-KR')
  return `${active} / ${connections} peers`
})

const syncLabel = computed(() => {
  const progress = status.value?.bitcoin.verification_progress
  if (progress === null || progress === undefined) return '동기화 ---'
  return `동기화 ${(progress * 100).toFixed(2)}%`
})

const updatedLabel = computed(() => {
  if (errorMessage.value) return errorMessage.value
  if (!lastUpdated.value) return '업데이트 전'
  return `${lastUpdated.value.toLocaleTimeString('ko-KR', { hour12: false })} 갱신`
})

async function loadStatus() {
  loading.value = true
  try {
    status.value = await fetchServerStatus()
    errorMessage.value = ''
    lastUpdated.value = new Date()
  } catch {
    errorMessage.value = '상태 확인 실패'
  } finally {
    loading.value = false
  }
}

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value && !loading.value) {
    loadStatus()
  }
}

function closePanel() {
  isOpen.value = false
}

function openNetworkPanel() {
  isOpen.value = false
  emit('open-network')
}

function openMempoolPanel() {
  isOpen.value = false
  emit('open-mempool')
}

function openSettingsPanel() {
  isOpen.value = false
  emit('open-settings')
}

function formatUsage(value: MemoryUsageData | DiskUsageData | null): string {
  if (!value) return '---'
  return `${formatBytes(value.used_bytes)} / ${formatBytes(value.total_bytes)}`
}

function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return '---'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toLocaleString('ko-KR', { maximumFractionDigits: unitIndex === 0 ? 0 : 1 })} ${units[unitIndex]}`
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '---'
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`
}

function formatBlockHeight(value: number | null): string {
  if (value === null) return '---'
  return `#${value.toLocaleString('ko-KR')}`
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}일 ${hours}시간`
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}

function meterStyle(value: number | null | undefined): Record<string, string> {
  const width = Math.max(0, Math.min(100, value ?? 0))
  return { width: `${width}%` }
}

onMounted(() => {
  loadStatus()
  pollTimer = setInterval(loadStatus, POLL_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.server-widget {
  position: fixed;
  left: 18px;
  bottom: 18px;
  z-index: 25;
}

.dock-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dock-trigger {
  position: relative;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  color: #fff5d5;
  background:
    linear-gradient(180deg, rgba(255, 245, 213, 0.14), rgba(0, 0, 0, 0.16)),
    rgba(33, 29, 23, 0.9);
  border: 1px solid rgba(255, 245, 213, 0.24);
  border-radius: 15px;
  box-shadow:
    0 14px 32px rgba(35, 29, 20, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: transform 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 18px 38px rgba(35, 29, 20, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  .status-light {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 8px;
    height: 8px;
  }
}

.network-trigger {
  color: #f4fff8;
  background:
    linear-gradient(180deg, rgba(255, 245, 213, 0.12), rgba(0, 0, 0, 0.14)),
    rgba(79, 104, 98, 0.92);
}

.mempool-trigger {
  color: #fffdf8;
  background:
    linear-gradient(180deg, rgba(255, 245, 213, 0.12), rgba(0, 0, 0, 0.14)),
    rgba(112, 77, 64, 0.92);
}

.settings-trigger {
  color: #fff5d5;
  background:
    linear-gradient(180deg, rgba(255, 245, 213, 0.12), rgba(0, 0, 0, 0.14)),
    rgba(75, 68, 56, 0.92);
}

.server-icon {
  display: grid;
  gap: 3px;
  width: 23px;

  span {
    position: relative;
    display: block;
    height: 6px;
    background: currentColor;
    border-radius: 2px;
    box-shadow: inset -7px 0 0 rgba(111, 139, 132, 0.75);

    &::before {
      content: "";
      position: absolute;
      left: 4px;
      top: 50%;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(33, 29, 23, 0.8);
      transform: translateY(-50%);
    }
  }
}

.network-icon {
  position: relative;
  display: block;
  width: 25px;
  height: 25px;
  border: 2px solid currentColor;
  border-radius: 50%;

  span {
    position: absolute;
    left: 50%;
    top: 50%;
    display: block;
    background: currentColor;
    transform: translate(-50%, -50%);

    &:nth-child(1) {
      width: 2px;
      height: 21px;
      border-radius: 999px;
    }

    &:nth-child(2) {
      width: 21px;
      height: 2px;
      border-radius: 999px;
    }

    &:nth-child(3) {
      width: 13px;
      height: 21px;
      background: transparent;
      border: 2px solid currentColor;
      border-top: 0;
      border-bottom: 0;
      border-radius: 50%;
    }
  }
}

.mempool-icon {
  display: grid;
  grid-template-columns: repeat(2, 9px);
  gap: 4px;

  span {
    display: block;
    width: 9px;
    height: 9px;
    background: currentColor;
    border-radius: 3px;
    box-shadow: inset 0 -2px 0 rgba(33, 29, 23, 0.18);
  }
}

.settings-icon {
  display: grid;
  gap: 5px;
  width: 24px;

  span {
    position: relative;
    display: block;
    height: 3px;
    background: currentColor;
    border-radius: 999px;

    &::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 7px;
      height: 7px;
      background: currentColor;
      border-radius: 50%;
      transform: translateY(-50%);
    }

    &:nth-child(1)::after {
      left: 3px;
    }

    &:nth-child(2)::after {
      right: 3px;
    }

    &:nth-child(3)::after {
      left: 9px;
    }
  }
}

.server-panel {
  position: absolute;
  left: 0;
  bottom: 60px;
  width: min(286px, calc(100vw - 36px));
  padding: 14px;
  color: #211d17;
  background: rgba(255, 253, 248, 0.9);
  border: 1px solid rgba(141, 41, 31, 0.16);
  border-radius: 16px;
  box-shadow: 0 18px 42px rgba(35, 29, 20, 0.2);
  backdrop-filter: blur(10px);
}

.server-popover-enter-active,
.server-popover-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.server-popover-enter-from,
.server-popover-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.panel-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.panel-eyebrow,
.metric-label,
.panel-foot {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(33, 29, 23, 0.52);
}

.panel-title {
  margin-top: 2px;
  font-size: 0.98rem;
  font-weight: 950;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  color: #315b3d;
  background: rgba(73, 143, 90, 0.12);
  border: 1px solid rgba(73, 143, 90, 0.18);
  border-radius: 999px;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    cursor: wait;
  }
}

.panel-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: rgba(33, 29, 23, 0.52);
  background: rgba(33, 29, 23, 0.06);
  border: 0;
  border-radius: 9px;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    color: #8d291f;
    background: rgba(141, 41, 31, 0.1);
  }
}

.status-light {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4d9c61;
  box-shadow: 0 0 10px rgba(77, 156, 97, 0.72);
}

.is-error {
  .status-pill {
    color: #8d291f;
    background: rgba(141, 41, 31, 0.1);
    border-color: rgba(141, 41, 31, 0.18);
  }

  .status-light {
    background: #c44838;
    box-shadow: 0 0 10px rgba(196, 72, 56, 0.66);
  }
}

.is-checking {
  .status-light {
    background: #d4a64b;
    box-shadow: 0 0 10px rgba(212, 166, 75, 0.66);
  }
}

.server-clock {
  margin: 10px 0 12px;
  padding: 8px 10px;
  color: #fff5d5;
  background: rgba(33, 29, 23, 0.86);
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.82rem;
  font-weight: 900;
  text-align: center;
}

.metric-row,
.compact-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
  margin-top: 10px;

  strong,
  > span {
    display: block;
    font-size: 0.78rem;
    font-weight: 950;
  }
}

.compact-grid {
  grid-template-columns: 1fr 1fr;
  align-items: start;
}

.meter {
  height: 7px;
  margin-top: 6px;
  overflow: hidden;
  background: rgba(33, 29, 23, 0.1);
  border-radius: 999px;

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #6f8b84, #b6a15f);
    border-radius: inherit;
    transition: width 0.35s ease;
  }
}

.disk-meter span {
  background: linear-gradient(90deg, #8a748e, #9a7460);
}

.panel-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
}

.panel-muted {
  padding: 12px 0 2px;
  color: rgba(33, 29, 23, 0.58);
  font-size: 0.78rem;
  font-weight: 800;
}

@media (max-width: 520px) {
  .server-widget {
    left: 12px;
    bottom: 12px;
  }

  .dock-trigger {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }

  .server-panel {
    bottom: 56px;
    width: min(268px, calc(100vw - 24px));
    padding: 12px;
  }
}

@media (max-width: 520px) {
  .server-widget {
    left: 50%;
    bottom: max(12px, env(safe-area-inset-bottom));
    transform: translateX(-50%);
  }

  .dock-buttons {
    gap: 7px;
    padding: 6px;
    background: rgba(255, 253, 248, 0.58);
    border: 1px solid rgba(33, 29, 23, 0.08);
    border-radius: 16px;
    box-shadow: 0 12px 34px rgba(35, 29, 20, 0.18);
    backdrop-filter: blur(10px);
  }

  .dock-trigger {
    width: 42px;
    height: 42px;
    border-radius: 13px;
  }

  .server-panel {
    left: 50%;
    bottom: 62px;
    width: min(320px, calc(100vw - 24px));
    transform: translateX(-50%);
  }
}
</style>
