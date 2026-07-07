/// <reference lib="dom" />
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Button } from '@/components/ui/button'

describe('Button (shadcn-vue)', () => {
  it("est importable via @/components/ui/button et rend un <button>", () => {
    const wrapper = mount(Button, { slots: { default: 'Cliquer' } })
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cliquer')
  })
})
