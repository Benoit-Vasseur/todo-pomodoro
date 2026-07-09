import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimer } from '@/composables/useTimer'

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('démarre avec remaining = duration et ni running ni paused', () => {
    const timer = useTimer(1500) // 25 min
    expect(timer.remaining.value).toBe(1500)
    expect(timer.isRunning.value).toBe(false)
    expect(timer.isPaused.value).toBe(false)
  })

  it('start() lance le décompte', () => {
    const timer = useTimer(10)
    timer.start()
    expect(timer.isRunning.value).toBe(true)
    expect(timer.isPaused.value).toBe(false)

    vi.advanceTimersByTime(3000)
    expect(timer.remaining.value).toBe(7)
  })

  it('pause() stoppe le décompte sans remettre à zéro', () => {
    const timer = useTimer(10)
    timer.start()
    vi.advanceTimersByTime(3000)

    timer.pause()
    expect(timer.isRunning.value).toBe(false)
    expect(timer.isPaused.value).toBe(true)
    expect(timer.remaining.value).toBe(7)

    // Le temps n'avance plus
    vi.advanceTimersByTime(5000)
    expect(timer.remaining.value).toBe(7)
  })

  it('resume() reprend le décompte après pause', () => {
    const timer = useTimer(10)
    timer.start()
    vi.advanceTimersByTime(3000)
    timer.pause()

    timer.resume()
    expect(timer.isRunning.value).toBe(true)
    expect(timer.isPaused.value).toBe(false)

    vi.advanceTimersByTime(2000)
    expect(timer.remaining.value).toBe(5)
  })

  it('reset() réinitialise remaining et les flags', () => {
    const timer = useTimer(10)
    timer.start()
    vi.advanceTimersByTime(3000)

    timer.reset()
    expect(timer.remaining.value).toBe(10)
    expect(timer.isRunning.value).toBe(false)
    expect(timer.isPaused.value).toBe(false)
  })

  it('appelle onComplete quand remaining atteint 0', () => {
    const timer = useTimer(5)
    const onComplete = vi.fn()
    timer.onComplete(onComplete)

    timer.start()
    vi.advanceTimersByTime(5000)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(timer.isRunning.value).toBe(false)
    expect(timer.remaining.value).toBe(0)
  })

  it('n’appelle onComplete qu’une seule fois', () => {
    const timer = useTimer(3)
    const onComplete = vi.fn()
    timer.onComplete(onComplete)

    timer.start()
    vi.advanceTimersByTime(5000)

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('start() alors que déjà en cours ne fait rien', () => {
    const timer = useTimer(10)
    timer.start()
    vi.advanceTimersByTime(3000)

    timer.start() // devrait être ignoré
    expect(timer.isRunning.value).toBe(true)
    expect(timer.remaining.value).toBe(7) // pas remis à 10
  })

  it('pause() alors que pas en cours ne fait rien', () => {
    const timer = useTimer(10)
    timer.pause() // no-op
    expect(timer.isPaused.value).toBe(false)
    expect(timer.isRunning.value).toBe(false)
  })

  it('resume() sans pause ne fait rien', () => {
    const timer = useTimer(10)
    timer.resume() // no-op
    expect(timer.isRunning.value).toBe(false)
    expect(timer.isPaused.value).toBe(false)
  })
})
