/**
 * Unit tests for useDebounce hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDebounce } from "../useDebounce"

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("test", 300))

    expect(result.current).toBe("test")
  })

  it("should debounce value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: "initial" },
      }
    )

    expect(result.current).toBe("initial")

    rerender({ value: "updated" })
    expect(result.current).toBe("initial") // Still initial

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe("updated")
  })

  it("should use custom delay", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: "initial" },
      }
    )

    rerender({ value: "updated" })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe("initial") // Still initial after 300ms

    await act(async () => {
      vi.advanceTimersByTime(200) // Total 500ms
    })

    expect(result.current).toBe("updated")
  })
})
