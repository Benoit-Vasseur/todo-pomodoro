import { ref, type Ref } from 'vue'

type TimerCallback = () => void

export function useTimer(duration: number) {
  const remaining: Ref<number> = ref(duration)
  const isRunning = ref(false)
  const isPaused = ref(false)

  let intervalId: ReturnType<typeof setInterval> | null = null
  let onCompleteCallback: TimerCallback | null = null

  function clear() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function start() {
    if (isRunning.value) return
    clear()
    isRunning.value = true
    isPaused.value = false
    intervalId = setInterval(() => {
      remaining.value--
      if (remaining.value <= 0) {
        remaining.value = 0
        clear()
        isRunning.value = false
        isPaused.value = false
        onCompleteCallback?.()
      }
    }, 1000)
  }

  function pause() {
    if (!isRunning.value) return
    clear()
    isRunning.value = false
    isPaused.value = true
  }

  function resume() {
    if (isPaused.value) {
      start()
    }
  }

  function reset() {
    clear()
    remaining.value = duration
    isRunning.value = false
    isPaused.value = false
  }

  function onComplete(callback: TimerCallback) {
    onCompleteCallback = callback
  }

  return { remaining, isRunning, isPaused, start, pause, resume, reset, onComplete }
}
