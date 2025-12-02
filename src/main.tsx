import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize theme from system preference (ELITE: system autodetection)
// Theme will be loaded from Tauri store by useTheme hook
// Use retry mechanism for Tauri macOS webview compatibility
if (typeof window !== "undefined") {
  // Default to system preference for autodetection with retry
  // Try multiple times for macOS Tauri webview compatibility
  const detectSystemTheme = (): "light" | "dark" => {
    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      if (mediaQuery && typeof mediaQuery.matches === "boolean") {
        return mediaQuery.matches ? "dark" : "light";
      }
    } catch (_error) {
      // Fallback if matchMedia fails
    }
    return "light";
  };
  
  let theme = detectSystemTheme();
  
  // Retry system detection multiple times for macOS Tauri webview
  let retries = 0;
  const maxRetries = 5;
  const retryInterval = setInterval(() => {
    retries++;
    const detectedTheme = detectSystemTheme();
    if (detectedTheme !== theme || retries >= maxRetries) {
      theme = detectedTheme;
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      if (retries >= maxRetries) {
        clearInterval(retryInterval);
      }
    }
  }, 100);
  
  // Clean up after max time
  setTimeout(() => clearInterval(retryInterval), 2000);
  
  // Apply theme immediately
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
