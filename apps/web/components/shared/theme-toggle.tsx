'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center w-9 h-9 rounded-md transition-colors duration-150 hover:bg-bg-elevated active:scale-95"
      aria-label={mounted ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
    >
      {mounted ? (
        theme === 'dark' ? (
          <Sun className="w-5 h-5 text-text-secondary" />
        ) : (
          <Moon className="w-5 h-5 text-text-secondary" />
        )
      ) : (
        <div className="w-5 h-5" />
      )}
    </button>
  )
}
