import { computed } from 'vue'
import { useColorMode as useVueUseColorMode, type BasicColorMode } from '@vueuse/core'

export type ColorMode = BasicColorMode

/**
 * Mode clair/sombre persisté via `@vueuse/core`.
 *
 * La classe `.dark` est posée/retirée sur `<html>` (convention shadcn-vue),
 * et le choix persiste dans `localStorage` sous la clé `color-mode`.
 */
export function useColorMode() {
  const mode = useVueUseColorMode<ColorMode>({
    selector: 'html',
    attribute: 'class',
    modes: { light: '', dark: 'dark' },
    storageKey: 'color-mode',
    initialValue: 'light',
  })

  const isDark = computed(() => mode.value === 'dark')

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  return { mode, isDark, toggle }
}
