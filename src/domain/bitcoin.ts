import type { BlockData } from '@/api'

export const DIFFICULTY_INTERVAL = 2016
export const HALVING_INTERVAL = 210000
export const SATOSHI_PER_BTC = 100000000

export type DisplayUnit = 'btc' | 'sats'
export type TimeDisplayMode = 'local' | 'utc'

export function isDifficultyAdjustment(height: number): boolean {
  return height > 0 && height % DIFFICULTY_INTERVAL === 0
}

export function isHalving(height: number): boolean {
  return height > 0 && height % HALVING_INTERVAL === 0
}

export function getBlockReward(height: number): number {
  const halvings = Math.floor(height / HALVING_INTERVAL)
  return 50 / Math.pow(2, halvings)
}

export function blockTxCount(block: BlockData): number {
  return block.tx_count ?? block.nTx ?? block.tx_summary?.length ?? 0
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export function formatDuration(minutes: number): string {
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

export function formatBlockTime(timestamp: number | null, mode: TimeDisplayMode = 'local'): string {
  const parts = formatBlockTimeParts(timestamp, mode)
  if (!parts) return '---'
  return `${parts.date} ${parts.time}`
}

export function formatBlockTimeParts(
  timestamp: number | null,
  mode: TimeDisplayMode = 'local'
): { date: string; time: string } | null {
  if (!timestamp) return null
  const date = new Date(timestamp * 1000)
  const get = mode === 'utc'
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds()
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds()
      }

  return {
    date: [
      get.year,
      String(get.month).padStart(2, '0'),
      String(get.day).padStart(2, '0')
    ].join('.'),
    time: [
      String(get.hour).padStart(2, '0'),
      String(get.minute).padStart(2, '0'),
      String(get.second).padStart(2, '0')
    ].join(':')
  }
}

export function formatTimeDisplayModeLabel(mode: TimeDisplayMode): string {
  if (mode === 'utc') return 'UTC 기준'

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return timezone ? `${timezone} 기준` : '브라우저 시간 기준'
  } catch {
    return '브라우저 시간 기준'
  }
}

export function formatSatoshiAmount(
  satoshi: number | null | undefined,
  displayUnit: DisplayUnit
): string {
  if (satoshi === null || satoshi === undefined) return '---'
  if (displayUnit === 'sats') {
    return `${Math.round(satoshi).toLocaleString('ko-KR')} sats`
  }
  return `${formatBTCFromSatoshi(satoshi)} BTC`
}

export function formatBTCAmount(
  value: number | null | undefined,
  displayUnit: DisplayUnit
): string {
  if (value === null || value === undefined) return '---'
  return formatSatoshiAmount(Math.round(value * SATOSHI_PER_BTC), displayUnit)
}

export function formatBTCFromSatoshi(satoshi: number): string {
  const sign = satoshi < 0 ? '-' : ''
  const absolute = Math.abs(Math.round(satoshi))
  const whole = Math.floor(absolute / SATOSHI_PER_BTC).toLocaleString('ko-KR')
  const fraction = String(absolute % SATOSHI_PER_BTC).padStart(8, '0').replace(/0+$/, '')
  if (!fraction) return `${sign}${whole}`
  const groupedFraction = fraction.match(/.{1,4}/g)?.join(' ') ?? fraction
  return `${sign}${whole}.${groupedFraction}`
}

export function formatBlockSubsidy(block: BlockData, displayUnit: DisplayUnit): string {
  if (block.subsidy_satoshi !== undefined) return formatSatoshiAmount(block.subsidy_satoshi, displayUnit)
  return formatBTCAmount(getBlockReward(block.height), displayUnit)
}

export function formatBlockReward(block: BlockData, displayUnit: DisplayUnit): string {
  if (block.reward_satoshi !== undefined) return formatSatoshiAmount(block.reward_satoshi, displayUnit)
  return formatBlockSubsidy(block, displayUnit)
}

export function formatFeeRate(value: number | undefined): string {
  if (value === undefined) return '---'
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })} sat/vB`
}

export function shortHash(value: string | undefined): string {
  if (!value) return '---'
  if (value.length <= 24) return value
  return `${value.slice(0, 10)}...${value.slice(-10)}`
}

export function formatSize(bytes: number | undefined): string {
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

export function btcPerKvBToSatPerVByte(value: number): number {
  return value * 100000
}

export function formatHashrate(hashrate: number | undefined): string {
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
