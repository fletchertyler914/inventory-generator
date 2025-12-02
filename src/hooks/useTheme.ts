import { useEffect, useState, useCallback } from "react"
import { getStoreValue, setStoreValue, removeStoreValue } from "@/lib/store-utils"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

/**
 * ELITE: System-aware theme hook with automatic detection
 * - Respects system preference by default
 * - Listens for system preference changes
 * - Only stores manual overrides (not "system")
 * - Handles Tauri macOS webview edge cases
 * - Uses tauri-plugin-store for secure persistence
 */
export function useTheme() {
  // Get system preference with retry for Tauri macOS webview
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === "undefined") return "light"
    
    // Try to get media query
    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      if (mediaQuery && mediaQuery.matches !== undefined) {
        return mediaQuery.matches ? "dark" : "light"
      }
    } catch (_error) {
      // Fallback if matchMedia fails
    }
    
    // Fallback: check if dark class is already present (from initial load)
    if (document.documentElement.classList.contains("dark")) {
      return "dark"
    }
    
    return "light"
  }, [])

  // Get stored theme preference (or default to "system")
  const [theme, setTheme] = useState<Theme>("system")
  const [isLoading, setIsLoading] = useState(true)

  // Load theme from store on mount
  useEffect(() => {
    let mounted = true
    getStoreValue<Theme>("theme", "system", "settings")
      .then((stored) => {
        if (mounted) {
          // Only accept valid themes, default to "system" for autodetection
          if (stored === "light" || stored === "dark" || stored === "system") {
            setTheme(stored)
          }
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  // Resolved theme (actual theme to apply)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === "system") {
      return getSystemTheme()
    }
    return theme
  })

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  // Update resolved theme when theme preference changes
  useEffect(() => {
    if (theme === "system") {
      setResolvedTheme(getSystemTheme())
    } else {
      setResolvedTheme(theme)
    }
  }, [theme, getSystemTheme])

  // Listen for system preference changes (only when using "system" theme)
  useEffect(() => {
    if (theme !== "system") return

    // Retry mechanism for Tauri macOS webview (media query might not be ready immediately)
    let retryCount = 0
    const maxRetries = 10
    const retryDelay = 100 // ms

    const setupMediaQuery = () => {
      try {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        
        if (!mediaQuery || mediaQuery.matches === undefined) {
          // Media query not ready yet, retry
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(setupMediaQuery, retryDelay)
            return
          }
          // Max retries reached, use fallback
          return
        }

        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
          const matches = e instanceof MediaQueryListEvent ? e.matches : (e as MediaQueryList).matches
          setResolvedTheme(matches ? "dark" : "light")
        }

        // Set initial value
        handleChange(mediaQuery)

        // Modern browsers
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener("change", handleChange as EventListener)
          return () => mediaQuery.removeEventListener("change", handleChange as EventListener)
        } else {
          // Fallback for older browsers
          const listener = handleChange as (this: MediaQueryList, ev: MediaQueryListEvent) => void
          mediaQuery.addListener(listener)
          return () => mediaQuery.removeListener(listener)
        }
      } catch (_error) {
        // If media query fails, check periodically as fallback
        const interval = setInterval(() => {
          const currentTheme = getSystemTheme()
          setResolvedTheme(currentTheme)
        }, 1000)
        return () => clearInterval(interval)
      }
    }

    // Start setup with a small delay to ensure window is ready
    const timeoutId = setTimeout(setupMediaQuery, 50)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [theme, getSystemTheme])

  // Store theme preference (only store manual overrides, not "system" as default)
  useEffect(() => {
    if (isLoading) return // Don't save during initial load

    if (theme === "system") {
      // Remove from store to allow system autodetection
      removeStoreValue("theme", "settings").catch(console.error)
    } else {
      // Store manual override
      setStoreValue("theme", theme, "settings").catch(console.error)
    }
  }, [theme, isLoading])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      // Cycle: system -> light -> dark -> system
      if (prev === "system") return "light"
      if (prev === "light") return "dark"
      return "system"
    })
  }, [])

  const setThemeDirect = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
  }, [])

  return { 
    theme, 
    resolvedTheme,
    setTheme: setThemeDirect, 
    toggleTheme 
  }
}

