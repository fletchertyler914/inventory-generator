import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { logger, logError } from "./lib/logger"
import { isTauriContext } from "./lib/env"

// Global error handlers for production
if (typeof window !== "undefined") {
  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    logError("Unhandled promise rejection", event.reason, {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
    })
  })

  // Catch global errors
  window.addEventListener("error", (event) => {
    logError("Global error", event.error, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  // Catch resource loading errors
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target as HTMLElement | null
      if (target && "tagName" in target) {
        const htmlElement = target as HTMLElement & { src?: string; href?: string }
        logError("Resource loading error", undefined, {
          tagName: htmlElement.tagName,
          src: htmlElement.src || htmlElement.href,
        })
      }
    },
    true
  )

  logger.info("Error handlers registered")
  logger.info("Application initializing", { tauri: isTauriContext() })
  // Default to system preference for autodetection with retry
  // Try multiple times for macOS Tauri webview compatibility
  const detectSystemTheme = (): "light" | "dark" => {
    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      if (mediaQuery && typeof mediaQuery.matches === "boolean") {
        return mediaQuery.matches ? "dark" : "light"
      }
    } catch (_error) {
      // Fallback if matchMedia fails
    }
    return "light"
  }

  let theme = detectSystemTheme()

  // Retry system detection multiple times for macOS Tauri webview
  let retries = 0
  const maxRetries = 5
  const retryInterval = setInterval(() => {
    retries++
    const detectedTheme = detectSystemTheme()
    if (detectedTheme !== theme || retries >= maxRetries) {
      theme = detectedTheme
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(theme)
      if (retries >= maxRetries) {
        clearInterval(retryInterval)
      }
    }
  }, 100)

  // Clean up after max time
  setTimeout(() => clearInterval(retryInterval), 2000)

  // Apply theme immediately
  document.documentElement.classList.remove("light", "dark")
  document.documentElement.classList.add(theme)
}

// Initialize React app with error handling
try {
  const rootElement = document.getElementById("root")

  if (!rootElement) {
    throw new Error("Root element not found")
  }

  logger.debug("Creating React root")
  const root = ReactDOM.createRoot(rootElement)

  logger.debug("Rendering App component")
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  logger.info("React app rendered successfully")
} catch (error) {
  logError("Failed to render React app", error, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  // Show user-friendly error in UI if rendering fails
  const errorMessage = error instanceof Error ? error.message : "Unknown error"
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; color: red;">
      <h1>Application Error</h1>
      <p>Failed to initialize the application.</p>
      <p>Please check the logs for technical details.</p>
      <p style="font-size: 12px; color: #666;">Error: ${errorMessage}</p>
    </div>
  `
}
