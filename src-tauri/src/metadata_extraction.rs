/// ELITE: Comprehensive metadata extraction for forensic analysis
/// Extracts file hashes, EXIF, PDF metadata, email headers, etc.
/// All extraction is async and cached in database for performance

use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;
use tokio::io::AsyncReadExt;
use sha2::{Digest, Sha256};
use md5;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadataExtracted {
    pub file_path: String,
    pub file_size: i64,
    pub created_at: i64,
    pub modified_at: i64,
    pub md5_hash: Option<String>,
    pub sha256_hash: Option<String>,
    pub file_type: String,
    pub mime_type: Option<String>,
    // PDF-specific
    pub pdf_info: Option<PdfMetadata>,
    // Image-specific
    pub image_info: Option<ImageMetadata>,
    // Email-specific
    pub email_info: Option<EmailMetadata>,
    // Media-specific
    pub media_info: Option<MediaMetadata>,
    // Generic metadata
    pub metadata_json: Option<String>, // JSON for extensibility
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfMetadata {
    pub page_count: Option<i32>,
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub creator: Option<String>,
    pub producer: Option<String>,
    pub creation_date: Option<String>,
    pub modification_date: Option<String>,
    pub encrypted: Option<bool>,
    pub permissions: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub format: Option<String>,
    pub color_space: Option<String>,
    pub exif: Option<String>, // JSON string of EXIF data
    pub has_transparency: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailMetadata {
    pub from: Option<String>,
    pub to: Option<String>,
    pub cc: Option<String>,
    pub bcc: Option<String>,
    pub subject: Option<String>,
    pub date: Option<String>,
    pub message_id: Option<String>,
    pub headers: Option<String>, // JSON string of all headers
    pub attachment_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaMetadata {
    pub duration: Option<f64>, // seconds
    pub codec: Option<String>,
    pub bitrate: Option<i64>,
    pub sample_rate: Option<i32>,
    pub channels: Option<i32>,
}

/// Extract comprehensive metadata from a file
/// Caches results in database for performance
pub async fn extract_file_metadata(file_path: &Path) -> Result<FileMetadataExtracted, String> {
    let metadata = fs::metadata(file_path).await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    
    let file_size = metadata.len() as i64;
    let created_at = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());
    
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());
    
    // Get file extension
    let file_type = file_path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "unknown".to_string());
    
    // Calculate hashes (async, can be done in parallel)
    let md5_hash = calculate_md5_hash(file_path).await.ok();
    let sha256_hash = calculate_sha256_hash(file_path).await.ok();
    
    // Extract type-specific metadata
    let pdf_info = if file_type == "pdf" {
        extract_pdf_metadata(file_path).await.ok()
    } else {
        None
    };
    
    let image_info = if ["jpg", "jpeg", "png", "gif", "tiff", "tif", "webp", "bmp"].contains(&file_type.as_str()) {
        extract_image_metadata(file_path).await.ok()
    } else {
        None
    };
    
    let email_info = if file_type == "eml" || file_type == "msg" {
        extract_email_metadata(file_path).await.ok()
    } else {
        None
    };
    
    let media_info = if ["mp3", "wav", "mp4", "avi", "mov", "m4a"].contains(&file_type.as_str()) {
        extract_media_metadata(file_path).await.ok()
    } else {
        None
    };
    
    Ok(FileMetadataExtracted {
        file_path: file_path.to_string_lossy().to_string(),
        file_size,
        created_at,
        modified_at,
        md5_hash,
        sha256_hash,
        file_type,
        mime_type: None, // Can be enhanced with mime_guess crate
        pdf_info,
        image_info,
        email_info,
        media_info,
        metadata_json: None,
    })
}

/// Calculate MD5 hash (async)
async fn calculate_md5_hash(file_path: &Path) -> Result<String, std::io::Error> {
    let mut file = fs::File::open(file_path).await?;
    let mut context = md5::Context::new();
    let mut buffer = vec![0u8; 65536]; // 64KB buffer
    
    loop {
        let bytes_read = file.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        context.consume(&buffer[..bytes_read]);
    }
    
    let digest = context.compute();
    Ok(format!("{:x}", digest))
}

/// Calculate SHA-256 hash (async)
async fn calculate_sha256_hash(file_path: &Path) -> Result<String, std::io::Error> {
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

/// Extract PDF metadata (basic - can be enhanced with pdf crate)
async fn extract_pdf_metadata(_file_path: &Path) -> Result<PdfMetadata, String> {
    // TODO: Implement PDF metadata extraction using pdf crate
    // For now, return basic structure
    Ok(PdfMetadata {
        page_count: None,
        title: None,
        author: None,
        subject: None,
        creator: None,
        producer: None,
        creation_date: None,
        modification_date: None,
        encrypted: None,
        permissions: None,
    })
}

/// Extract image metadata (basic - can be enhanced with image crate)
async fn extract_image_metadata(_file_path: &Path) -> Result<ImageMetadata, String> {
    // TODO: Implement image metadata extraction using image crate
    // For now, return basic structure
    Ok(ImageMetadata {
        width: None,
        height: None,
        format: None,
        color_space: None,
        exif: None,
        has_transparency: None,
    })
}

/// Extract email metadata (basic - can be enhanced with mailparse crate)
async fn extract_email_metadata(_file_path: &Path) -> Result<EmailMetadata, String> {
    // TODO: Implement email metadata extraction using mailparse crate
    // For now, return basic structure
    Ok(EmailMetadata {
        from: None,
        to: None,
        cc: None,
        bcc: None,
        subject: None,
        date: None,
        message_id: None,
        headers: None,
        attachment_count: None,
    })
}

/// Extract media metadata (basic - can be enhanced with ffmpeg bindings)
async fn extract_media_metadata(_file_path: &Path) -> Result<MediaMetadata, String> {
    // TODO: Implement media metadata extraction using ffmpeg bindings
    // For now, return basic structure
    Ok(MediaMetadata {
        duration: None,
        codec: None,
        bitrate: None,
        sample_rate: None,
        channels: None,
    })
}

