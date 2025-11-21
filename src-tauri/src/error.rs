/// Custom error types for the inventory generator application
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

    #[error("Error generating XLSX: {0}")]
    XlsxError(String),

    #[error("Error generating CSV: {0}")]
    CsvError(String),

    #[error("Error generating JSON: {0}")]
    JsonError(String),

    #[error("Error reading XLSX: {0}")]
    ReadXlsxError(String),

    #[error("Error reading CSV: {0}")]
    ReadCsvError(String),

    #[error("Error reading JSON: {0}")]
    ReadJsonError(String),

    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),
}

/// Helper function to convert AppError to String for Tauri commands
impl AppError {
    pub fn to_string_message(&self) -> String {
        self.to_string()
    }
}

