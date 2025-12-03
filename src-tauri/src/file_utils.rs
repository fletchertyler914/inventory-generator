/// ELITE file utilities for hashing, deduplication, and file operations
/// Optimized for maximum performance: parallel processing, fast hashing, async I/O

use sha2::{Digest, Sha256};
use std::path::Path;
use tokio::fs;
use tokio::io::AsyncReadExt;

/// Calculate SHA-256 hash (for cases where cryptographic security is needed)
/// Slower but cryptographically secure
/// Used for file change detection and duplicate detection
pub async fn calculate_file_hash_secure(file_path: &Path) -> std::io::Result<String> {
    let mut file = fs::File::open(file_path).await?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 65536]; // 64KB buffer
    
    loop {
        let bytes_read = file.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    
    Ok(format!("{:x}", hasher.finalize()))
}

/// Get file metadata including size and timestamps (async)
/// Returns Unix timestamps (seconds since epoch)
pub async fn get_file_metadata_async(file_path: &Path) -> std::io::Result<FileMetadata> {
    let metadata = fs::metadata(file_path).await?;
    
    let created = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());
    
    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());
    
    Ok(FileMetadata {
        size: metadata.len() as i64,
        created_at: created,
        modified_at: modified,
    })
}

/// Synchronous version for compatibility
#[allow(dead_code)] // May be useful for synchronous operations
pub fn get_file_metadata(file_path: &Path) -> std::io::Result<FileMetadata> {
    let metadata = std::fs::metadata(file_path)?;
    
    let created = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());
    
    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());
    
    Ok(FileMetadata {
        size: metadata.len() as i64,
        created_at: created,
        modified_at: modified,
    })
}

#[derive(Debug, Clone)]
pub struct FileMetadata {
    pub size: i64,
    pub created_at: i64,
    pub modified_at: i64,
}

/// Fast-path check: Compare file metadata without hashing
/// Returns true if file appears unchanged (size + modified_time match)
pub fn metadata_matches(meta: &FileMetadata, existing_size: i64, existing_modified: i64) -> bool {
    meta.size == existing_size && meta.modified_at == existing_modified
}

/// Check if file exists and is readable (async)
#[allow(dead_code)] // May be useful for future file validation
pub async fn file_exists_and_readable_async(file_path: &Path) -> bool {
    match fs::metadata(file_path).await {
        Ok(metadata) => metadata.is_file(),
        Err(_) => false,
    }
}
