/**
 * ELITE: Fast HTML to text conversion utility
 * Uses regex instead of DOM manipulation for performance
 * Caches results to avoid repeated processing
 */

// Simple cache for text extraction (WeakMap would be better but we need string keys)
const textCache = new Map<string, string>();
const CACHE_SIZE_LIMIT = 1000; // Prevent memory leaks

/**
 * Extract plain text from HTML content
 * Optimized for performance - uses regex instead of DOM manipulation
 * 
 * @param html - HTML content string
 * @returns Plain text with HTML tags removed
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  
  // Check cache first
  const cached = textCache.get(html);
  if (cached !== undefined) {
    return cached;
  }
  
  // Fast regex-based extraction (much faster than DOM manipulation)
  let text = html
    // Remove script and style tags with their content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
  
  // Cache result (with size limit to prevent memory leaks)
  if (textCache.size >= CACHE_SIZE_LIMIT) {
    // Clear oldest entries (simple FIFO)
    const firstKey = textCache.keys().next().value;
    if (firstKey) textCache.delete(firstKey);
  }
  textCache.set(html, text);
  
  return text;
}

/**
 * Clear the text extraction cache
 * Useful for memory management
 */
export function clearTextCache(): void {
  textCache.clear();
}

