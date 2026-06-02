import { onBeforeUnmount, onMounted, ref } from 'vue'

export type DeviceKind = 'mobile' | 'desktop'

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    mobile?: boolean
    platform?: string
  }
}

export function useDeviceKind() {
  const deviceKind = ref<DeviceKind>(detectDeviceKind())

  function refreshDeviceKind() {
    deviceKind.value = detectDeviceKind()
  }

  onMounted(() => {
    refreshDeviceKind()
    window.addEventListener('popstate', refreshDeviceKind)
    window.addEventListener('orientationchange', refreshDeviceKind)
    window.screen.orientation?.addEventListener('change', refreshDeviceKind)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('popstate', refreshDeviceKind)
    window.removeEventListener('orientationchange', refreshDeviceKind)
    window.screen.orientation?.removeEventListener('change', refreshDeviceKind)
  })

  return {
    deviceKind
  }
}

function detectDeviceKind(): DeviceKind {
  const queryOverride = readDeviceQueryOverride()
  if (queryOverride) return queryOverride

  if (typeof navigator === 'undefined') return 'desktop'

  const nav = navigator as NavigatorWithUAData
  if (typeof nav.userAgentData?.mobile === 'boolean') {
    return nav.userAgentData.mobile ? 'mobile' : 'desktop'
  }

  const ua = nav.userAgent || ''
  const platform = nav.platform || ''
  const maxTouchPoints = nav.maxTouchPoints || 0

  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return 'mobile'
  }

  if (platform === 'MacIntel' && maxTouchPoints > 1) {
    return 'mobile'
  }

  const hasCoarsePointer = typeof window !== 'undefined'
    && window.matchMedia?.('(any-pointer: coarse)').matches
  const hasSmallDeviceScreen = typeof window !== 'undefined'
    && Math.min(window.screen.width, window.screen.height) <= 820

  return maxTouchPoints > 1 && hasCoarsePointer && hasSmallDeviceScreen ? 'mobile' : 'desktop'
}

function readDeviceQueryOverride(): DeviceKind | null {
  if (typeof window === 'undefined') return null

  const value = new URLSearchParams(window.location.search).get('device')?.toLowerCase()
  if (value === 'mobile' || value === 'desktop') return value

  return null
}
