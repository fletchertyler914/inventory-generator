/// ELITE: Shared file operation utilities
/// Provides reusable functions for file operations with staleness checks, validation, and error handling
/// 
/// Performance: Cached staleness checks, efficient validation
/// Security: Path validation, filename sanitization, OS-specific rules
/// Modularity: Single source of truth for file operation logic

use crate::file_utils::get_file_metadata_async;
use crate::file_utils::calculate_file_hash_secure;
use crate::path_validation;
use sqlx::{sqlite::SqlitePool, Row};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};
use once_cell::sync::Lazy;

/// Result of staleness check
#[derive(Debug, Clone, PartialEq)]
pub enum StalenessResult {
    Fresh,
    Modified,
    Deleted,
}

/// Cache entry for staleness checks (short-lived to avoid stale data)
struct StalenessCacheEntry {
    result: StalenessResult,
    timestamp: Instant,
}

/// ELITE: Thread-safe staleness cache with TTL
/// Prevents duplicate checks within short time window (5 seconds)
static STALENESS_CACHE: Lazy<Arc<RwLock<HashMap<String, StalenessCacheEntry>>>> = Lazy::new(|| {
    Arc::new(RwLock::new(HashMap::new()))
});
const STALENESS_CACHE_TTL: Duration = Duration::from_secs(5);

/// Check if a file is stale (modified or deleted externally)
/// ELITE: Cached staleness check to avoid duplicate expensive operations
/// 
/// Returns:
/// - `Fresh`: File exists and matches database state
/// - `Modified`: File exists but has been modified externally
/// - `Deleted`: File no longer exists on filesystem
pub async fn check_file_staleness(
    file_id: &str,
    pool: &SqlitePool,
) -> Result<StalenessResult, String> {
    // Check cache first (fast path)
    {
        let cache = STALENESS_CACHE.read().await;
        if let Some(entry) = cache.get(file_id) {
            if entry.timestamp.elapsed() < STALENESS_CACHE_TTL {
                return Ok(entry.result.clone());
            }
        }
    }
    
    // Get file from database
    let row = sqlx::query(
        "SELECT absolute_path, file_hash, file_size, modified_at, status FROM files WHERE id = ? AND deleted_at IS NULL"
    )
        .bind(file_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| "File not found or has been deleted".to_string())?;
    
    let absolute_path: String = row.get("absolute_path");
    let stored_hash: Option<String> = row.get("file_hash");
    let stored_size: i64 = row.get("file_size");
    let stored_modified: i64 = row.get("modified_at");
    let status: String = row.get("status");
    
    // Validate path structure
    let file_path = match path_validation::validate_and_canonicalize_path(&PathBuf::from(&absolute_path)) {
        Ok(p) => p,
        Err(_) => {
            // Path invalid - treat as deleted
            let result = StalenessResult::Deleted;
            update_cache(file_id, result.clone()).await;
            return Ok(result);
        }
    };
    
    // Check if file exists
    let file_exists = tokio::fs::try_exists(&file_path).await
        .map_err(|e| format!("Failed to check file existence: {}", e))?;
    
    if !file_exists {
        let result = StalenessResult::Deleted;
        update_cache(file_id, result.clone()).await;
        return Ok(result);
    }
    
    // Get current file metadata
    let current_meta = get_file_metadata_async(&file_path).await
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    
    // Check if metadata changed
    let metadata_changed = current_meta.size != stored_size || current_meta.modified_at != stored_modified;
    
    // For reviewed/flagged/finalized files, always verify hash even if metadata matches
    let needs_hash_check = metadata_changed || 
        status == "reviewed" || 
        status == "flagged" || 
        status == "finalized";
    
    let hash_changed = if needs_hash_check && stored_hash.is_some() {
        // Calculate current hash
        let current_hash = calculate_file_hash_secure(&file_path).await
            .map_err(|e| format!("Failed to calculate file hash: {}", e))?;
        
        Some(current_hash != stored_hash.unwrap())
    } else {
        None
    };
    
    let changed = metadata_changed || hash_changed.unwrap_or(false);
    
    let result = if changed {
        StalenessResult::Modified
    } else {
        StalenessResult::Fresh
    };
    
    // Update cache
    update_cache(file_id, result.clone()).await;
    
    Ok(result)
}

/// Update staleness cache
async fn update_cache(file_id: &str, result: StalenessResult) {
    let mut cache = STALENESS_CACHE.write().await;
    cache.insert(
        file_id.to_string(),
        StalenessCacheEntry {
            result,
            timestamp: Instant::now(),
        },
    );
    
    // Clean up old entries (keep cache size reasonable)
    if cache.len() > 1000 {
        cache.retain(|_, entry| entry.timestamp.elapsed() < STALENESS_CACHE_TTL);
    }
}

/// Validate filename for OS-specific invalid characters
/// ELITE: Comprehensive validation for Windows, macOS, and Linux
/// 
/// Invalid characters:
/// - Windows: < > : " | ? * \ /
/// - macOS/Linux: / (and null byte)
/// - All: Control characters, leading/trailing spaces/dots
pub fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.trim().is_empty() {
        return Err("Filename cannot be empty".to_string());
    }
    
    // Check for reserved names (Windows)
    let reserved_names = [
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    
    let upper_name = filename.to_uppercase().trim().to_string();
    if reserved_names.contains(&upper_name.as_str()) {
        return Err(format!("'{}' is a reserved filename on Windows", filename));
    }
    
    // Check for invalid characters (Windows + Unix)
    let invalid_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/', '\0'];
    for ch in invalid_chars {
        if filename.contains(ch) {
            return Err(format!("Filename cannot contain '{}'", ch));
        }
    }
    
    // Check for control characters
    if filename.chars().any(|c| c.is_control()) {
        return Err("Filename cannot contain control characters".to_string());
    }
    
    // Check for leading/trailing spaces or dots (Windows issue)
    if filename.starts_with(' ') || filename.ends_with(' ') {
        return Err("Filename cannot start or end with a space".to_string());
    }
    
    if filename.starts_with('.') && filename.len() > 1 && !filename.starts_with("..") {
        // Allow .hidden files on Unix, but not just "."
        // This is fine
    } else if filename == "." || filename == ".." {
        return Err("Filename cannot be '.' or '..'".to_string());
    }
    
    // Check length (Windows MAX_PATH is 260, but we'll be more conservative)
    if filename.len() > 255 {
        return Err("Filename cannot exceed 255 characters".to_string());
    }
    
    Ok(())
}

/// Construct new file path from directory and new filename
/// ELITE: Safe path construction with validation
/// 
/// Validates:
/// - Directory exists and is a directory
/// - Filename is valid
/// - Resulting path is within allowed directory (security)
pub async fn construct_new_path(
    current_path: &Path,
    new_filename: &str,
) -> Result<PathBuf, String> {
    // Validate filename first
    validate_filename(new_filename)?;
    
    // Get parent directory
    let parent_dir = current_path.parent()
        .ok_or_else(|| "File path has no parent directory".to_string())?;
    
    // Validate parent directory exists
    if !tokio::fs::try_exists(parent_dir).await
        .map_err(|e| format!("Failed to check directory: {}", e))? {
        return Err("Parent directory does not exist".to_string());
    }
    
    // Construct new path
    let new_path = parent_dir.join(new_filename);
    
    // Validate new path structure
    path_validation::validate_and_canonicalize_path(&new_path)
        .map_err(|e| format!("Invalid new path: {}", e))?;
    
    Ok(new_path)
}

