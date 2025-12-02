/// ELITE: Intelligent date extraction from documents
/// Extracts dates from PDFs, emails, CSVs, and receipts
/// Automatically creates timeline events for forensic analysis

use chrono::NaiveDate;
use regex::Regex;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedDate {
    pub date: i64, // Unix timestamp
    pub date_string: String, // Original date string found
    pub context: String, // Context where date was found (e.g., "Statement Date", "Transaction Date")
    pub confidence: f64, // Confidence score 0.0-1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateExtractionResult {
    pub file_path: String,
    pub dates: Vec<ExtractedDate>,
    pub primary_date: Option<i64>, // Most likely document date
}

/// Extract dates from a file based on its type
pub async fn extract_dates_from_file(file_path: &Path) -> Result<DateExtractionResult, String> {
    let file_type = file_path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "unknown".to_string());
    
    let mut dates = Vec::new();
    
    // Extract from filename first (fast, always available)
    if let Some(filename_date) = extract_date_from_filename(file_path) {
        dates.push(ExtractedDate {
            date: filename_date.0,
            date_string: filename_date.1,
            context: "Filename".to_string(),
            confidence: 0.7,
        });
    }
    
    // Extract from file content based on type
    match file_type.as_str() {
        "pdf" => {
            if let Ok(pdf_dates) = extract_dates_from_pdf(file_path).await {
                dates.extend(pdf_dates);
            }
        }
        "eml" | "msg" => {
            if let Ok(email_dates) = extract_dates_from_email(file_path).await {
                dates.extend(email_dates);
            }
        }
        "csv" => {
            if let Ok(csv_dates) = extract_dates_from_csv(file_path).await {
                dates.extend(csv_dates);
            }
        }
        _ => {}
    }
    
    // Deduplicate and sort dates
    dates.sort_by(|a, b| a.date.cmp(&b.date));
    dates.dedup_by(|a, b| a.date == b.date);
    
    // Find primary date (highest confidence, or most recent if equal confidence)
    let primary_date = dates.iter()
        .max_by(|a, b| {
            a.confidence.partial_cmp(&b.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.date.cmp(&b.date))
        })
        .map(|d| d.date);
    
    Ok(DateExtractionResult {
        file_path: file_path.to_string_lossy().to_string(),
        dates,
        primary_date,
    })
}

/// Extract date from filename (e.g., "statement_2024-01-15.pdf")
fn extract_date_from_filename(file_path: &Path) -> Option<(i64, String)> {
    let file_name = file_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    // Try various date patterns
    let patterns = vec![
        // YYYY-MM-DD
        (r"\b(\d{4})-(\d{2})-(\d{2})\b", "%Y-%m-%d"),
        // MM/DD/YYYY
        (r"\b(\d{2})/(\d{2})/(\d{4})\b", "%m/%d/%Y"),
        // DD/MM/YYYY
        (r"\b(\d{2})/(\d{2})/(\d{4})\b", "%d/%m/%Y"),
        // MMM DD, YYYY
        (r"\b([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\b", "%b %d, %Y"),
        // YYYYMMDD
        (r"\b(\d{4})(\d{2})(\d{2})\b", "%Y%m%d"),
    ];
    
    for (pattern, format) in patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(captures) = re.captures(file_name) {
                // Try to parse the date
                let date_str = captures.get(0).map(|m| m.as_str()).unwrap_or("");
                if let Ok(naive_date) = NaiveDate::parse_from_str(date_str, format) {
                    if let Some(datetime) = naive_date.and_hms_opt(0, 0, 0) {
                        let timestamp = datetime.and_utc().timestamp();
                        // Validate reasonable date range (1900-2100)
                        if timestamp > -2208988800 && timestamp < 4102444800 {
                            return Some((timestamp, date_str.to_string()));
                        }
                    }
                }
            }
        }
    }
    
    None
}

/// Extract dates from PDF content
/// TODO: Implement with pdf crate when available
async fn extract_dates_from_pdf(_file_path: &Path) -> Result<Vec<ExtractedDate>, String> {
    // Placeholder - will be implemented with pdf crate
    // Look for patterns like:
    // - "Statement Date: 01/15/2024"
    // - "Period: January 2024"
    // - "Date: 2024-01-15"
    Ok(Vec::new())
}

/// Extract dates from email (EML/MSG files)
/// TODO: Implement with mailparse crate when available
async fn extract_dates_from_email(_file_path: &Path) -> Result<Vec<ExtractedDate>, String> {
    // Placeholder - will be implemented with mailparse crate
    // Extract:
    // - Date header (primary)
    // - Received headers
    // - Dates in email body
    Ok(Vec::new())
}

/// Extract dates from CSV files (bank statements, etc.)
async fn extract_dates_from_csv(file_path: &Path) -> Result<Vec<ExtractedDate>, String> {
    use tokio::fs;
    use tokio::io::AsyncBufReadExt;
    
    let file = fs::File::open(file_path).await
        .map_err(|e| format!("Failed to open CSV: {}", e))?;
    
    let reader = tokio::io::BufReader::new(file);
    let mut lines = reader.lines();
    
    let mut dates = Vec::new();
    let date_patterns = vec![
        // YYYY-MM-DD
        Regex::new(r"\b(\d{4})-(\d{2})-(\d{2})\b").ok(),
        // MM/DD/YYYY
        Regex::new(r"\b(\d{2})/(\d{2})/(\d{4})\b").ok(),
        // DD/MM/YYYY
        Regex::new(r"\b(\d{2})/(\d{2})/(\d{4})\b").ok(),
    ];
    
    let mut line_count = 0;
    while let Some(line) = lines.next_line().await
        .map_err(|e| format!("Failed to read CSV line: {}", e))? {
        
        if line_count > 1000 {
            // Limit processing for performance
            break;
        }
        
        // Look for date patterns in the line
        for pattern_opt in &date_patterns {
            if let Some(pattern) = pattern_opt {
                for cap in pattern.captures_iter(&line) {
                    if let Some(date_match) = cap.get(0) {
                        let date_str = date_match.as_str();
                        // Try to parse as various formats
                        if let Some((timestamp, _)) = parse_date_string(date_str) {
                            dates.push(ExtractedDate {
                                date: timestamp,
                                date_string: date_str.to_string(),
                                context: format!("CSV line {}", line_count + 1),
                                confidence: 0.8,
                            });
                        }
                    }
                }
            }
        }
        
        line_count += 1;
    }
    
    Ok(dates)
}

/// Parse a date string into a timestamp
fn parse_date_string(date_str: &str) -> Option<(i64, String)> {
    let formats = vec![
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%b %d, %Y",
        "%B %d, %Y",
        "%Y%m%d",
    ];
    
    for format in formats {
                if let Ok(naive_date) = NaiveDate::parse_from_str(date_str, format) {
                    if let Some(datetime) = naive_date.and_hms_opt(0, 0, 0) {
                        let timestamp = datetime.and_utc().timestamp();
                        // Validate reasonable date range
                        if timestamp > -2208988800 && timestamp < 4102444800 {
                            return Some((timestamp, date_str.to_string()));
                        }
                    }
                }
    }
    
    None
}

/// Extract statement period from bank statement filename or content
pub fn extract_statement_period(file_name: &str) -> Option<(i64, i64)> {
    // Look for patterns like "Jan2024", "January 2024", "01-2024"
    let name_lower = file_name.to_lowercase();
    
    let months = [
        ("jan", 1), ("feb", 2), ("mar", 3), ("apr", 4),
        ("may", 5), ("jun", 6), ("jul", 7), ("aug", 8),
        ("sep", 9), ("oct", 10), ("nov", 11), ("dec", 12),
    ];
    
    for (month_str, month_num) in months.iter() {
        if let Some(pos) = name_lower.find(month_str) {
            // Look for year after month
            let after_month = &name_lower[pos + month_str.len()..];
            let trimmed = after_month.trim_start_matches(|c: char| !c.is_alphanumeric());
            
            if let Some(year_start) = trimmed.chars().position(|c| c.is_ascii_digit()) {
                let year_part = &trimmed[year_start..];
                let year_str: String = year_part
                    .chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect();
                
                if let Ok(year) = year_str.parse::<i32>() {
                    let year = if year < 100 { year + 2000 } else { year };
                    
                    // Create start and end of month
                    if let (Some(start_date), Some(end_date)) = (
                        NaiveDate::from_ymd_opt(year, *month_num, 1),
                        NaiveDate::from_ymd_opt(year, *month_num, days_in_month(year, *month_num))
                    ) {
                        if let (Some(start_dt), Some(end_dt)) = (
                            start_date.and_hms_opt(0, 0, 0).map(|dt| dt.and_utc()),
                            end_date.and_hms_opt(23, 59, 59).map(|dt| dt.and_utc())
                        ) {
                            return Some((start_dt.timestamp(), end_dt.timestamp()));
                        }
                    }
                }
            }
        }
    }
    
    None
}

fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                29
            } else {
                28
            }
        }
        _ => 28,
    }
}

