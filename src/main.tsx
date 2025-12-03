import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Enhanced error logging for production debugging
const logToTauri = async (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => {
  try {
    // Check if we're in Tauri context
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Tauri log plugin captures console output, so we'll use console
      // which gets captured by the log plugin
      const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
      console[level](`[Frontend] ${logMessage}`);
    } else {
      console[level](`[Frontend] ${message}`, data);
    }
  } catch (error) {
    // Fallback to console if Tauri APIs aren't available
    console[level](`[Frontend] ${message}`, data);
  }
};

// Global error handlers for production debugging
if (typeof window !== "undefined") {
  console.log('[Frontend] ===== WINDOW OBJECT EXISTS =====');
  console.log('[Frontend] Window location:', window.location.href);
  console.log('[Frontend] Document ready state:', document.readyState);
  console.log('[Frontend] Document URL:', document.URL);
  console.log('[Frontend] Tauri available:', typeof (window as any).__TAURI__ !== 'undefined');
  
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Frontend] Unhandled promise rejection:', event.reason);
    logToTauri('error', 'Unhandled promise rejection', {
      reason: event.reason,
      error: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    console.error('[Frontend] Global error:', event.message, event.filename, event.lineno, event.colno);
    logToTauri('error', 'Global error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });
  
  // Catch resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target && (event.target as any).tagName) {
      console.error('[Frontend] Resource loading error:', (event.target as any).tagName, (event.target as any).src || (event.target as any).href);
    }
  }, true);

  console.log('[Frontend] Error handlers registered');
  logToTauri('info', 'Application initializing');
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

// Initialize React app with error handling
console.log('[Frontend] ===== REACT INITIALIZATION START =====');
console.log('[Frontend] Step 1: Looking for root element...');

try {
  const rootElement = document.getElementById("root");
  console.log('[Frontend] Step 2: Root element found:', !!rootElement);
  
  if (!rootElement) {
    console.error('[Frontend] ✗ Root element NOT found!');
    throw new Error("Root element not found");
  }

  console.log('[Frontend] Step 3: Root element exists, creating React root...');
  logToTauri('info', 'Rendering React app');
  
  console.log('[Frontend] Step 4: Creating ReactDOM root...');
  const root = ReactDOM.createRoot(rootElement);
  console.log('[Frontend] Step 5: ReactDOM root created, rendering App component...');
  
  root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
  
  console.log('[Frontend] Step 6: React render called successfully');
  console.log('[Frontend] ===== REACT INITIALIZATION COMPLETE =====');
  logToTauri('info', 'React app rendered successfully');
} catch (error) {
  console.error('[Frontend] ===== REACT INITIALIZATION FAILED =====');
  console.error('[Frontend] Error details:', error);
  logToTauri('error', 'Failed to render React app', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  
  // Show error in UI if rendering fails
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; color: red;">
      <h1>Application Error</h1>
      <p>Failed to initialize the application.</p>
      <p>Check logs at: ~/Library/Logs/com.casespace/casespace.log</p>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
}
