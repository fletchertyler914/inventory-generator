/// ELITE: Path validation utilities for security
/// Prevents path traversal attacks and validates file system access

use std::path::{Path, PathBuf};

/// Validate and canonicalize a file path to prevent path traversal attacks
/// Returns canonicalized path if valid, error if path traversal detected
pub fn validate_and_canonicalize_path(path: &Path) -> Result<PathBuf, String> {
    // Check for path traversal patterns
    let path_str = path.to_string_lossy();
    
    // SECURITY: Reject paths with traversal patterns
    if path_str.contains("..") {
        return Err("Path traversal detected: '..' not allowed".to_string());
    }
    
    // SECURITY: Reject paths with null bytes
    if path_str.contains('\0') {
        return Err("Path contains null byte".to_string());
    }
    
    // SECURITY: Canonicalize to resolve symlinks and normalize path
    match path.canonicalize() {
        Ok(canonical) => Ok(canonical),
        Err(e) => {
            // If canonicalization fails, check if it's just because path doesn't exist yet
            // (e.g., during file creation). Still validate the path structure.
            if path_str.contains("..") || path_str.contains('\0') {
                Err(format!("Invalid path: {}", e))
            } else {
                // Path structure is valid, just doesn't exist yet
                Ok(path.to_path_buf())
            }
        }
    }
}

/// Validate that a path is within an allowed directory (prevents directory traversal)
pub fn validate_path_within_base(path: &Path, base_dir: &Path) -> Result<PathBuf, String> {
    let canonical_path = validate_and_canonicalize_path(path)?;
    let canonical_base = base_dir.canonicalize()
        .map_err(|e| format!("Failed to canonicalize base directory: {}", e))?;
    
    // SECURITY: Ensure path is within base directory
    if !canonical_path.starts_with(&canonical_base) {
        return Err(format!(
            "Path '{}' is outside allowed directory '{}'",
            canonical_path.display(),
            canonical_base.display()
        ));
    }
    
    Ok(canonical_path)
}

/// Validate file path for reading (must exist and be a file)
pub async fn validate_file_path(path: &Path) -> Result<PathBuf, String> {
    use tokio::fs;
    
    // SECURITY: Validate path structure first
    let canonical = validate_and_canonicalize_path(path)?;
    
    // SECURITY: Verify file exists
    if !fs::try_exists(&canonical).await
        .map_err(|e| format!("Failed to check file existence: {}", e))? {
        return Err(format!("File does not exist: {}", canonical.display()));
    }
    
    // SECURITY: Verify it's actually a file (not directory)
    let metadata = fs::metadata(&canonical).await
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    
    if !metadata.is_file() {
        return Err(format!("Path is not a file: {}", canonical.display()));
    }
    
    Ok(canonical)
}

/// Validate directory path (must exist and be a directory)
pub async fn validate_directory_path(path: &Path) -> Result<PathBuf, String> {
    use tokio::fs;
    
    // SECURITY: Validate path structure first
    let canonical = validate_and_canonicalize_path(path)?;
    
    // SECURITY: Verify directory exists
    if !fs::try_exists(&canonical).await
        .map_err(|e| format!("Failed to check directory existence: {}", e))? {
        return Err(format!("Directory does not exist: {}", canonical.display()));
    }
    
    // SECURITY: Verify it's actually a directory
    let metadata = fs::metadata(&canonical).await
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    
    if !metadata.is_dir() {
        return Err(format!("Path is not a directory: {}", canonical.display()));
    }
    
    Ok(canonical)
}

/// Sanitize filename to prevent directory traversal and invalid characters
pub fn sanitize_filename(filename: &str) -> String {
    // Remove path separators and null bytes
    filename
        .replace('/', "_")
        .replace('\\', "_")
        .replace('\0', "")
        .trim()
        .to_string()
}

