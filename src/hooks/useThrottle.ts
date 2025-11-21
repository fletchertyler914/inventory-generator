import { useRef, useCallback } from "react"

/**
 * Custom hook to throttle a function
 * @param callback - The function to throttle
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The throttled function
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 300
): T {
  const lastRun = useRef<number>(Date.now())

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = now
      }
    }) as T,
    [callback, delay]
  )
}

