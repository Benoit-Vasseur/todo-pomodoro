/// <reference lib="dom" />
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ThemeToggle from '../ThemeToggle.vue'

// Les icônes lucide sont des composants fonctionnels dont le `inject` de
// contexte ne se résout pas sous @vue/test-utils (alors qu'il fonctionne dans
// le navigateur — cf. e2e). On les stubbe : le test vise le comportement du
// dark mode, pas le rendu des icônes.
const stubs = { Sun: true, Moon: true }

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('ajoute la classe .dark sur <html> au clic', async () => {
    const wrapper = mount(ThemeToggle, { global: { stubs } })
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    wrapper.unmount()
  })

  it('retire la classe .dark au second clic', async () => {
    const wrapper = mount(ThemeToggle, { global: { stubs } })
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    wrapper.unmount()
  })

  it('persiste le mode sombre entre deux instances', async () => {
    const first = mount(ThemeToggle, { global: { stubs } })
    await first.find('button').trigger('click')
    await nextTick()
    first.unmount()

    const second = mount(ThemeToggle, { global: { stubs } })
    await nextTick()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    second.unmount()
  })
})
