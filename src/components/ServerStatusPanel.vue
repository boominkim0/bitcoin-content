<template>
  <div class="server-widget" :class="[statusClass, `server-widget-${variant}`]" aria-live="polite">
    <div v-if="isOpen" class="widget-shield" @click="closePanel"></div>
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

        <div v-if="loading && !status" class="server-skeleton-panel" aria-label="서버 상태 확인 중">
          <span class="server-skeleton-line wide"></span>
          <span class="server-skeleton-meter"></span>
          <span class="server-skeleton-line"></span>
          <span class="server-skeleton-meter"></span>
          <div class="server-skeleton-grid">
            <span></span>
            <span></span>
          </div>
        </div>
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

const { variant = 'desktop' } = defineProps<{
  variant?: 'desktop' | 'mobile'
}>()

const emit = defineEmits<{
  'open-server': []
  'open-network': []
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
    emit('open-server')
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

.widget-shield {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: transparent;
}

.dock-buttons {
  position: relative;
  z-index: 2;
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
  color: rgba(255, 253, 246, 0.94);
  background:
    radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.46), transparent 35%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(21, 38, 34, 0.18)),
    rgba(35, 58, 52, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 15px;
  box-shadow:
    var(--glass-shadow-soft),
    var(--glass-highlight);
  cursor: pointer;
  backdrop-filter: blur(18px) saturate(1.35);
  -webkit-backdrop-filter: blur(18px) saturate(1.35);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.56);
    box-shadow:
      0 18px 42px rgba(20, 31, 28, 0.22),
      var(--glass-highlight);
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
    radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.42), transparent 35%),
    linear-gradient(180deg, rgba(142, 185, 177, 0.24), rgba(25, 70, 58, 0.2)),
    rgba(49, 93, 80, 0.5);
}

.settings-trigger {
  color: #fff9e8;
  background:
    radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.42), transparent 35%),
    linear-gradient(180deg, rgba(213, 171, 85, 0.24), rgba(72, 62, 44, 0.2)),
    rgba(83, 72, 53, 0.5);
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
  z-index: 2;
  width: min(286px, calc(100vw - 36px));
  padding: 14px;
  color: var(--ink);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.6), rgba(236, 246, 241, 0.36)),
    rgba(255, 253, 246, 0.42);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
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
  color: var(--ink-muted);
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
  color: #214f3e;
  background: rgba(120, 183, 145, 0.18);
  border: 1px solid rgba(120, 183, 145, 0.26);
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
  color: rgba(23, 35, 31, 0.56);
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 9px;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    color: var(--danger);
    background: rgba(255, 255, 255, 0.46);
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
  color: #f9fff8;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.04)),
    rgba(25, 50, 43, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.16);
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
  background: rgba(23, 35, 31, 0.1);
  border-radius: 999px;

  span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--celadon), var(--amber));
    border-radius: inherit;
    transition: width 0.35s ease;
  }
}

.disk-meter span {
  background: linear-gradient(90deg, #8f9fbd, var(--stone-warm));
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

.server-skeleton-panel {
  display: grid;
  gap: 9px;
  padding: 10px 0 2px;
}

.server-skeleton-line,
.server-skeleton-meter,
.server-skeleton-grid span {
  display: block;
  overflow: hidden;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.44), transparent),
    rgba(33, 29, 23, 0.08);
  background-size: 220% 100%, 100% 100%;
  border-radius: 999px;
  animation: server-skeleton-sweep 1.35s ease-in-out infinite;
}

.server-skeleton-line {
  width: 56%;
  height: 12px;

  &.wide {
    width: 78%;
  }
}

.server-skeleton-meter {
  height: 7px;
}

.server-skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  span {
    height: 44px;
    border-radius: 10px;
  }
}

@keyframes server-skeleton-sweep {
  0% { background-position: 220% 0, 0 0; }
  100% { background-position: -220% 0, 0 0; }
}

.server-widget-mobile {
  left: 0;
  right: 0;
  bottom: max(12px, env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  pointer-events: none;

  .widget-shield {
    z-index: 1;
    pointer-events: auto;
  }

  .dock-buttons {
    pointer-events: auto;
    gap: 8px;
    padding: 7px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.48), rgba(236, 248, 243, 0.24)),
      rgba(255, 255, 255, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.42);
    border-radius: 999px;
    box-shadow: var(--glass-shadow-soft), var(--glass-highlight);
    backdrop-filter: blur(22px) saturate(1.35);
    -webkit-backdrop-filter: blur(22px) saturate(1.35);
  }

  .dock-trigger {
    width: 46px;
    height: 46px;
    color: #fffdf2;
    background:
      radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.48), transparent 34%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(18, 40, 35, 0.12)),
      rgba(41, 69, 60, 0.58);
    border-color: rgba(255, 255, 255, 0.38);
    border-radius: 50%;
    box-shadow:
      0 8px 18px rgba(20, 31, 28, 0.16),
      var(--glass-highlight);

    &:hover {
      transform: none;
    }

    &:active {
      transform: scale(0.96);
    }

    .status-light {
      right: 7px;
      bottom: 7px;
      width: 8px;
      height: 8px;
      border: 1px solid rgba(255, 253, 248, 0.8);
    }
  }

  .server-icon,
  .network-icon,
  .settings-icon {
    width: 24px;
    height: 24px;
  }

  .server-icon {
    align-content: center;
    gap: 4px;

    span {
      height: 5px;
      border-radius: 999px;
      box-shadow: inset -6px 0 0 rgba(255, 253, 248, 0.34);
    }
  }

  .network-icon {
    width: 24px;
    height: 24px;
  }

  .settings-icon {
    align-content: center;
    gap: 6px;

    span {
      height: 3px;
      border-radius: 999px;
    }
  }

  .server-panel {
    left: 50%;
    bottom: 62px;
    z-index: 3;
    width: min(320px, calc(100vw - 24px));
    pointer-events: auto;
    transform: translateX(-50%);
  }
}
</style>
