/// Custom error types for the casespace application
/// Uses thiserror for clean error handling and propagation

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Path does not exist: {0}")]
    PathNotFound(String),

    #[error("Path is not a directory: {0}")]
    NotADirectory(String),

    #[error("Error scanning folder: {0}")]
    ScanError(String),
}

/// Helper function to convert AppError to String for Tauri commands
impl AppError {
    pub fn to_string_message(&self) -> String {
        self.to_string()
    }
}

