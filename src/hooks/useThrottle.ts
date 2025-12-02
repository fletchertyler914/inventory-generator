import { useRef, useCallback, useEffect } from "react"

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
  const callbackRef = useRef(callback)

  // Keep callback ref in sync
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Note: Using inline arrow function for React Compiler compatibility
  // Ref-based callback pattern ensures stable reference
  // This pattern is intentional - we need stable reference with ref-based callback
   
  return useCallback(
      ((...args: Parameters<T>) => {
        const now = Date.now()
        if (now - lastRun.current >= delay) {
          callbackRef.current(...args)
          lastRun.current = now
        }
      }) as T,
      [delay] // Only depend on delay, use ref for callback
    )
}

