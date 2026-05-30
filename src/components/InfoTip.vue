<template>
  <button
    ref="triggerRef"
    class="info-tip"
    type="button"
    :aria-label="text"
    :aria-expanded="visible"
    @click.stop="toggle"
    @mouseenter="show"
    @mouseleave="hideSoon"
    @focus="show"
    @blur="hideSoon"
    @keydown.esc="hide"
  >
    ?
  </button>

  <Teleport to="body">
    <Transition name="info-bubble-fade">
      <div
        v-if="visible"
        ref="bubbleRef"
        class="info-bubble"
        :data-placement="placement"
        :style="bubbleStyle"
        @mouseenter="cancelHide"
        @mouseleave="hideSoon"
      >
        <span class="info-bubble-text">{{ text }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'

defineProps<{
  text: string
}>()

const triggerRef = ref<HTMLElement | null>(null)
const bubbleRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const bubbleStyle = ref<Record<string, string>>({})
const placement = ref<'top' | 'bottom'>('top')

const VIEWPORT_PADDING = 14
const BUBBLE_GAP = 10
const MAX_BUBBLE_WIDTH = 280
const MIN_ARROW_OFFSET = 14

let hideTimer: ReturnType<typeof setTimeout> | null = null
let eventsBound = false

function cancelHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = null
}

async function show() {
  cancelHide()
  bubbleStyle.value = { visibility: 'hidden' }
  visible.value = true
  await nextTick()
  updatePosition()
  bindFloatingEvents()
}

function hideSoon() {
  cancelHide()
  hideTimer = setTimeout(hide, 120)
}

function hide() {
  cancelHide()
  visible.value = false
  unbindFloatingEvents()
}

function toggle() {
  if (visible.value) {
    hide()
    return
  }
  show()
}

function updatePosition() {
  const trigger = triggerRef.value
  const bubble = bubbleRef.value
  if (!trigger || !bubble) return

  const viewport = getViewport()
  const viewportRight = viewport.left + viewport.width
  const viewportBottom = viewport.top + viewport.height
  const availableWidth = Math.max(0, viewport.width - VIEWPORT_PADDING * 2)
  const availableHeight = Math.max(0, viewport.height - VIEWPORT_PADDING * 2)
  const maxWidth = Math.max(1, Math.min(MAX_BUBBLE_WIDTH, availableWidth))
  const maxHeight = Math.max(1, availableHeight)

  bubble.style.maxWidth = `${maxWidth}px`
  bubble.style.setProperty('--bubble-max-height', `${maxHeight}px`)

  const triggerRect = trigger.getBoundingClientRect()
  const bubbleRect = bubble.getBoundingClientRect()
  const width = Math.min(bubbleRect.width, maxWidth)
  const height = Math.min(bubbleRect.height, maxHeight)
  const center = triggerRect.left + triggerRect.width / 2
  const left = clamp(
    center - width / 2,
    viewport.left + VIEWPORT_PADDING,
    viewportRight - width - VIEWPORT_PADDING
  )
  const aboveTop = triggerRect.top - height - BUBBLE_GAP
  const belowTop = triggerRect.bottom + BUBBLE_GAP
  const canFitAbove = aboveTop >= viewport.top + VIEWPORT_PADDING
  const canFitBelow = belowTop + height <= viewportBottom - VIEWPORT_PADDING
  const spaceAbove = triggerRect.top - viewport.top
  const spaceBelow = viewportBottom - triggerRect.bottom
  const nextPlacement = canFitAbove || (!canFitBelow && spaceAbove > spaceBelow) ? 'top' : 'bottom'
  const preferredTop = nextPlacement === 'top' ? aboveTop : belowTop
  const top = clamp(
    preferredTop,
    viewport.top + VIEWPORT_PADDING,
    viewportBottom - height - VIEWPORT_PADDING
  )
  const arrowInset = Math.min(MIN_ARROW_OFFSET, width / 2)
  const arrowLeft = clamp(center - left, arrowInset, width - arrowInset)

  placement.value = nextPlacement

  bubbleStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    maxWidth: `${maxWidth}px`,
    '--arrow-left': `${arrowLeft}px`,
    '--bubble-max-height': `${maxHeight}px`,
    visibility: 'visible'
  }
}

function getViewport() {
  const visualViewport = window.visualViewport
  return {
    left: visualViewport?.offsetLeft ?? 0,
    top: visualViewport?.offsetTop ?? 0,
    width: visualViewport?.width ?? window.innerWidth,
    height: visualViewport?.height ?? window.innerHeight
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.max(min, Math.min(value, max))
}

function handleOutsidePointer(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (triggerRef.value?.contains(target) || bubbleRef.value?.contains(target)) return
  hide()
}

function bindFloatingEvents() {
  if (eventsBound) return
  eventsBound = true
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
  window.visualViewport?.addEventListener('resize', updatePosition)
  window.visualViewport?.addEventListener('scroll', updatePosition)
  document.addEventListener('pointerdown', handleOutsidePointer, true)
}

function unbindFloatingEvents() {
  if (!eventsBound) return
  eventsBound = false
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  window.visualViewport?.removeEventListener('resize', updatePosition)
  window.visualViewport?.removeEventListener('scroll', updatePosition)
  document.removeEventListener('pointerdown', handleOutsidePointer, true)
}

onBeforeUnmount(() => {
  hide()
})
</script>

<style scoped lang="scss">
.info-tip {
  display: inline-grid;
  place-items: center;
  width: 15px;
  height: 15px;
  margin-left: 5px;
  padding: 0;
  color: #fff5d5;
  background: rgba(33, 29, 23, 0.62);
  border: 0;
  border-radius: 50%;
  font-size: 0.62rem;
  font-weight: 950;
  line-height: 1;
  text-transform: none;
  cursor: help;
  outline: none;

  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    background: #8d291f;
  }
}

.info-bubble {
  position: fixed;
  z-index: 1000;
  width: max-content;
  max-width: min(280px, calc(100vw - 28px));
  color: #fff7df;
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0;
  line-height: 1.45;
  text-align: left;
  text-transform: none;
  white-space: normal;
  pointer-events: auto;

  &::after {
    content: "";
    position: absolute;
    left: var(--arrow-left, 50%);
    width: 10px;
    height: 10px;
    background: rgba(33, 29, 23, 0.97);
    border: 1px solid rgba(255, 245, 213, 0.12);
    pointer-events: none;
    transform: translateX(-50%) rotate(45deg);
  }

  &[data-placement="top"]::after {
    bottom: -5px;
    border-left: 0;
    border-top: 0;
  }

  &[data-placement="bottom"]::after {
    top: -5px;
    border-right: 0;
    border-bottom: 0;
  }
}

.info-bubble-text {
  display: block;
  max-height: var(--bubble-max-height, calc(100vh - 28px));
  overflow-y: auto;
  padding: 9px 11px;
  background:
    linear-gradient(180deg, rgba(255, 245, 213, 0.06), rgba(0, 0, 0, 0.08)),
    rgba(33, 29, 23, 0.97);
  border: 1px solid rgba(255, 245, 213, 0.12);
  border-radius: 10px;
  box-shadow: 0 14px 30px rgba(35, 29, 20, 0.3);
  overflow-wrap: break-word;
}

.info-bubble-fade-enter-active,
.info-bubble-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.info-bubble-fade-enter-from,
.info-bubble-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
