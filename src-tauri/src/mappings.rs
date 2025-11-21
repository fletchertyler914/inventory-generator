use crate::scanner::FileMetadata;

#[derive(Debug, Clone)]
pub struct DocumentInfo {
    pub document_type: String,
    pub document_description: String,
    pub doc_date_range: String,
}

pub fn derive_document_type(file_name: &str) -> String {
    let name_lower = file_name.to_lowercase();
    
    if name_lower.contains("bank_statement") || name_lower.contains("bank-statement") {
        "Bank Statement".to_string()
    } else if name_lower.contains("credit_card_statement") || name_lower.contains("credit-card-statement") {
        "Credit Card Statement".to_string()
    } else if name_lower.contains("crypto_statement") || name_lower.contains("crypto-statement") {
        "Crypto Statement".to_string()
    } else if name_lower.contains("retirement_statement") || name_lower.contains("retirement-statement") {
        "Retirement Statement".to_string()
    } else if name_lower.contains("discovery_document") || name_lower.contains("discovery-document") {
        "Discovery Request".to_string()
    } else {
        "Document".to_string()
    }
}

pub fn generate_document_description(
    file_name: &str,
    document_type: &str,
    file_type: &str,
) -> String {
    let name_lower = file_name.to_lowercase();
    
    // Check for "joint" prefix
    let prefix = if name_lower.contains("joint") {
        "Joint "
    } else {
        ""
    };
    
    // Expand retirement_statement to "Retirement Account Statement"
    let expanded_type = if document_type == "Retirement Statement" {
        "Retirement Account Statement"
    } else {
        document_type
    };
    
    // Extract month/year from filename (e.g., "Sep 25" or "Sep25")
    let month_year = extract_month_year(file_name);
    
    // Format suffix based on file type
    let format_suffix = if file_type == "CSV" {
        "_CSV"
    } else if file_type == "PDF" {
        " PDF"
    } else {
        ""
    };
    
    format!("{}{} {}{}", prefix, expanded_type, month_year, format_suffix)
}

fn extract_month_year(file_name: &str) -> String {
    // Try to find patterns like "Sep 25", "Sep25", "September 25", etc.
    let months = [
        ("jan", "Jan"), ("feb", "Feb"), ("mar", "Mar"),
        ("apr", "Apr"), ("may", "May"), ("jun", "Jun"),
        ("jul", "Jul"), ("aug", "Aug"), ("sep", "Sep"),
        ("oct", "Oct"), ("nov", "Nov"), ("dec", "Dec"),
    ];
    
    let name_lower = file_name.to_lowercase();
    
    for (month_lower, month_short) in months.iter() {
        if let Some(pos) = name_lower.find(month_lower) {
            // Look for year pattern after month (e.g., "25", "2025")
            let after_month = &name_lower[pos + month_lower.len()..];
            let trimmed = after_month.trim_start_matches(|c: char| !c.is_alphanumeric());
            
            // Try to extract 2 or 4 digit year
            if let Some(year_start) = trimmed.chars().position(|c| c.is_ascii_digit()) {
                let year_part = &trimmed[year_start..];
                let year = year_part
                    .chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>();
                
                if year.len() == 2 || year.len() == 4 {
                    return format!("{} {}", month_short, year);
                }
            }
        }
    }
    
    // Fallback: return empty string if no date found
    "".to_string()
}

pub fn extract_date_range(file_name: &str) -> String {
    // Try to find patterns like "Sep 25", "Sep25", "September 25", etc.
    let months = [
        ("jan", "Jan", 31), ("feb", "Feb", 28), ("mar", "Mar", 31),
        ("apr", "Apr", 30), ("may", "May", 31), ("jun", "Jun", 30),
        ("jul", "Jul", 31), ("aug", "Aug", 31), ("sep", "Sep", 30),
        ("oct", "Oct", 31), ("nov", "Nov", 30), ("dec", "Dec", 31),
    ];
    
    let name_lower = file_name.to_lowercase();
    
    for (month_lower, month_short, days_in_month) in months.iter() {
        if let Some(pos) = name_lower.find(month_lower) {
            // Look for year pattern after month (e.g., "25", "2025")
            let after_month = &name_lower[pos + month_lower.len()..];
            let trimmed = after_month.trim_start_matches(|c: char| !c.is_alphanumeric());
            
            // Try to extract 2 or 4 digit year
            if let Some(year_start) = trimmed.chars().position(|c| c.is_ascii_digit()) {
                let year_part = &trimmed[year_start..];
                let year = year_part
                    .chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>();
                
                if year.len() == 2 || year.len() == 4 {
                    // Format year as 2 digits
                    let year_short = if year.len() == 4 {
                        &year[2..]
                    } else {
                        &year
                    };
                    
                    // Format as date range: "01-Sep-25 to 30-Sep-25"
                    return format!("01-{}-{} to {}-{}-{}", month_short, year_short, days_in_month, month_short, year_short);
                }
            }
        }
    }
    
    // Fallback: return empty string if no date found
    "".to_string()
}

pub fn process_file_metadata(metadata: &FileMetadata) -> DocumentInfo {
    let document_type = derive_document_type(&metadata.file_name);
    let document_description = generate_document_description(
        &metadata.file_name,
        &document_type,
        &metadata.file_type,
    );
    let doc_date_range = extract_date_range(&metadata.file_name);
    
    DocumentInfo {
        document_type,
        document_description,
        doc_date_range,
    }
}
