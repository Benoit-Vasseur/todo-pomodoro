/// <reference lib="dom" />
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimerDisplay from '../TimerDisplay.vue'

describe('TimerDisplay', () => {
  it('affiche le temps restant au format MM:SS', () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 1500, isRunning: false, isPaused: false },
    })
    expect(wrapper.text()).toContain('25:00')
  })

  it('affiche 00:00 quand remaining est 0', () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 0, isRunning: false, isPaused: false },
    })
    expect(wrapper.text()).toContain('00:00')
  })

  it('affiche un bouton Démarrer quand le timer est arrêté', () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 1500, isRunning: false, isPaused: false },
    })
    expect(wrapper.find('button').text()).toBe('Démarrer')
  })

  it('affiche un bouton Pause quand le timer tourne', () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 1400, isRunning: true, isPaused: false },
    })
    expect(wrapper.find('button').text()).toBe('Pause')
  })

  it('affiche un bouton Reprendre quand le timer est en pause', () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 1400, isRunning: false, isPaused: true },
    })
    expect(wrapper.find('button').text()).toBe('Reprendre')
  })

  it('émet startTimer au clic sur Démarrer', async () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 1500, isRunning: false, isPaused: false },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('startTimer')).toBeDefined()
  })

  it('émet pauseTimer au clic sur Pause', async () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 1400, isRunning: true, isPaused: false },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('pauseTimer')).toBeDefined()
  })

  it('émet resumeTimer au clic sur Reprendre', async () => {
    const wrapper = mount(TimerDisplay, {
      props: { remaining: 1400, isRunning: false, isPaused: true },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('resumeTimer')).toBeDefined()
  })
})
