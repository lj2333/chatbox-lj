import { createTheme, type ThemeOptions } from '@mui/material/styles'
import { useLayoutEffect, useMemo } from 'react'
import { settingsStore, useLanguage, useSettingsStore } from '@/stores/settingsStore'
import { uiStore, useUIStore } from '@/stores/uiStore'
import { type Language, Theme } from '../../shared/types'
import platform from '../platform'
import DesktopPlatform from '../platform/desktop_platform'

const DEFAULT_APP_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
const ARABIC_APP_FONT_FAMILY = 'Cairo, Arial, sans-serif'

export function getAppFontFamily(fontFamily: string | undefined, language: Language) {
  const customFontFamily = fontFamily?.trim()
  if (customFontFamily) {
    return customFontFamily
  }
  return language === 'ar' ? ARABIC_APP_FONT_FAMILY : DEFAULT_APP_FONT_FAMILY
}

export const switchTheme = async (theme: Theme) => {
  let finalTheme = 'light' as 'light' | 'dark'
  if (theme === Theme.System) {
    finalTheme = (await platform.shouldUseDarkColors()) ? 'dark' : 'light'
  } else {
    finalTheme = theme === Theme.Dark ? 'dark' : 'light'
  }
  uiStore.setState({
    realTheme: finalTheme,
  })
  localStorage.setItem('initial-theme', finalTheme)
  if (platform instanceof DesktopPlatform) {
    await platform.switchTheme(finalTheme)
  }
}

export default function useAppTheme() {
  const theme = useSettingsStore((state) => state.theme)
  const fontSize = useSettingsStore((state) => state.fontSize)
  const fontFamily = useSettingsStore((state) => state.fontFamily)
  const realTheme = useUIStore((state) => state.realTheme)
  const language = useLanguage()

  useLayoutEffect(() => {
    switchTheme(theme)
  }, [theme])

  useLayoutEffect(() => {
    platform.onSystemThemeChange(() => {
      const theme = settingsStore.getState().theme
      switchTheme(theme)
    })
  }, [])

  useLayoutEffect(() => {
    // update material-ui theme
    document.querySelector('html')?.setAttribute('data-theme', realTheme)
    // update tailwindcss theme
    if (realTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [realTheme])

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--chatbox-font-family', getAppFontFamily(fontFamily, language))
  }, [fontFamily, language])

  const themeObj = useMemo(
    () => createTheme(getThemeDesign(realTheme, fontSize, language)),
    [realTheme, fontSize, language]
  )
  return themeObj
}

export function getThemeDesign(realTheme: 'light' | 'dark', fontSize: number, language: Language): ThemeOptions {
  return {
    palette: {
      mode: realTheme,
      ...(realTheme === 'light'
        ? {}
        : {
            // MUI 内部无法处理 css 变量，需要使用具体颜色值
            background: {
              default: '#242424',
              paper: '#242424',
            },
          }),
    },
    components: {
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: realTheme === 'dark' ? '#333333' : undefined,
            color: realTheme === 'dark' ? '#ffffff' : undefined,
          },
        },
      },
    },
    typography: {
      fontFamily: 'var(--chatbox-font-family)',
      fontSize: (fontSize * 14) / 16,
    },
    direction: language === 'ar' ? 'rtl' : 'ltr',
    breakpoints: {
      values: {
        xs: 0,
        sm: 640, // 修改sm的值与tailwindcss保持一致
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
  }
}
