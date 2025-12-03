/// ELITE: Generic field extraction module
/// High-performance pattern matching and data extraction for file system metadata
/// Supports date extraction, number extraction, text extraction with regex patterns

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionPattern {
    pub pattern: String,
    pub flags: Option<String>, // Regex flags (e.g., "i" for case-insensitive)
    pub group: Option<usize>,  // Capture group number (0 = full match)
    pub format: Option<String>, // Output format
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExtractionMethod {
    Direct,
    Pattern,
    Date,
    Number,
    TextBefore,
    TextAfter,
    TextBetween,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMappingRule {
    pub source_type: String, // "file_name", "folder_name", "folder_path", etc.
    pub extraction_method: ExtractionMethod,
    pub pattern: Option<ExtractionPattern>,
    pub target_field: String,
}

/// ELITE: Cached regex compilation for performance
/// Reuses compiled regex patterns to avoid recompilation overhead
pub struct RegexCache {
    patterns: HashMap<String, Regex>,
}

impl RegexCache {
    pub fn new() -> Self {
        Self {
            patterns: HashMap::new(),
        }
    }

    fn get_or_compile(&mut self, pattern: &str, flags: Option<&str>) -> Result<&Regex, String> {
        let cache_key = format!("{}{}", pattern, flags.unwrap_or(""));
        
        if !self.patterns.contains_key(&cache_key) {
            let mut regex_pattern = pattern.to_string();
            
            // Apply flags
            if let Some(flags_str) = flags {
                if flags_str.contains('i') {
                    regex_pattern = format!("(?i){}", regex_pattern);
                }
            }
            
            let compiled = Regex::new(&regex_pattern)
                .map_err(|e| format!("Invalid regex pattern '{}': {}", pattern, e))?;
            
            self.patterns.insert(cache_key.clone(), compiled);
        }
        
        Ok(self.patterns.get(&cache_key).unwrap())
    }
}

/// Extract value using pattern matching
/// ELITE: Optimized for performance with regex caching
pub fn extract_with_pattern(
    text: &str,
    pattern: &ExtractionPattern,
    cache: &mut RegexCache,
) -> Result<Option<String>, String> {
    let regex = cache.get_or_compile(&pattern.pattern, pattern.flags.as_deref())?;
    let group = pattern.group.unwrap_or(0);
    
    if let Some(captures) = regex.captures(text) {
        if let Some(matched) = captures.get(group) {
            return Ok(Some(matched.as_str().to_string()));
        }
    }
    
    Ok(None)
}

/// Extract date from text using pattern
/// ELITE: Supports multiple date formats and patterns
pub fn extract_date(text: &str, pattern: Option<&ExtractionPattern>) -> Option<String> {
    // Common date patterns
    let date_patterns = vec![
        // YYYY-MM-DD
        r"\d{4}-\d{2}-\d{2}",
        // MM/DD/YYYY or DD/MM/YYYY
        r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
        // Month name patterns (e.g., "Jan 2024", "January 2024")
        r"[A-Za-z]+\s+\d{2,4}",
        // Unix timestamp
        r"\d{10}",
    ];
    
    if let Some(pat) = pattern {
        // Use custom pattern
        let mut cache = RegexCache::new();
        if let Ok(Some(date)) = extract_with_pattern(text, pat, &mut cache) {
            return Some(date);
        }
    }
    
    // Try common patterns
    for pattern_str in date_patterns {
        if let Ok(regex) = Regex::new(pattern_str) {
            if let Some(captures) = regex.captures(text) {
                if let Some(matched) = captures.get(0) {
                    return Some(matched.as_str().to_string());
                }
            }
        }
    }
    
    None
}

/// Extract number from text using pattern
/// ELITE: Handles various number formats
pub fn extract_number(text: &str, pattern: Option<&ExtractionPattern>) -> Option<String> {
    if let Some(pat) = pattern {
        // Use custom pattern
        let mut cache = RegexCache::new();
        if let Ok(Some(num)) = extract_with_pattern(text, pat, &mut cache) {
            return Some(num);
        }
    }
    
    // Default: extract first number found
    if let Ok(regex) = Regex::new(r"-?\d+(?:\.\d+)?") {
        if let Some(captures) = regex.captures(text) {
            if let Some(matched) = captures.get(0) {
                return Some(matched.as_str().to_string());
            }
        }
    }
    
    None
}

/// Extract text before a pattern
pub fn extract_text_before(
    text: &str,
    pattern: &ExtractionPattern,
    cache: &mut RegexCache,
) -> Result<Option<String>, String> {
    let regex = cache.get_or_compile(&pattern.pattern, pattern.flags.as_deref())?;
    
    if let Some(mat) = regex.find(text) {
        let before = &text[..mat.start()];
        return Ok(Some(before.trim().to_string()));
    }
    
    Ok(None)
}

/// Extract text after a pattern
#[allow(dead_code)] // Will be used when mapping system is fully integrated
pub fn extract_text_after(
    text: &str,
    pattern: &ExtractionPattern,
    cache: &mut RegexCache,
) -> Result<Option<String>, String> {
    let regex = cache.get_or_compile(&pattern.pattern, pattern.flags.as_deref())?;
    
    if let Some(mat) = regex.find(text) {
        let after = &text[mat.end()..];
        return Ok(Some(after.trim().to_string()));
    }
    
    Ok(None)
}

/// Extract text between two patterns
#[allow(dead_code)] // Will be used when mapping system is fully integrated
pub fn extract_text_between(
    text: &str,
    start_pattern: &ExtractionPattern,
    end_pattern: &ExtractionPattern,
    cache: &mut RegexCache,
) -> Result<Option<String>, String> {
    // ELITE: Get both regexes first to avoid multiple mutable borrows
    let start_regex = cache.get_or_compile(&start_pattern.pattern, start_pattern.flags.as_deref())?;
    let start_match = start_regex.find(text);
    
    // Get end regex after we're done with start_regex
    let end_regex = cache.get_or_compile(&end_pattern.pattern, end_pattern.flags.as_deref())?;
    
    if let Some(start_mat) = start_match {
        let search_start = start_mat.end();
        let remaining = &text[search_start..];
        
        if let Some(end_mat) = end_regex.find(remaining) {
            let between = &remaining[..end_mat.start()];
            return Ok(Some(between.trim().to_string()));
        }
    }
    
    Ok(None)
}

/// Apply field mapping rule to extract value
/// ELITE: Main extraction function with method routing
#[allow(dead_code)] // Will be used when mapping system is fully integrated
pub fn apply_mapping_rule(
    rule: &FieldMappingRule,
    file_name: &str,
    folder_name: &str,
    folder_path: &str,
    metadata: &HashMap<String, String>,
    cache: &mut RegexCache,
) -> Result<Option<String>, String> {
    // Get source text based on source_type
    let source_text = match rule.source_type.as_str() {
        "file_name" => file_name,
        "folder_name" => folder_name,
        "folder_path" => folder_path,
        _ => {
            // Try metadata
            metadata.get(&rule.source_type).map(|s| s.as_str()).unwrap_or("")
        }
    };
    
    if source_text.is_empty() {
        return Ok(None);
    }
    
    // Apply extraction method
    match rule.extraction_method {
        ExtractionMethod::Direct => Ok(Some(source_text.to_string())),
        ExtractionMethod::Pattern => {
            if let Some(ref pattern) = rule.pattern {
                extract_with_pattern(source_text, pattern, cache)
            } else {
                Ok(Some(source_text.to_string()))
            }
        }
        ExtractionMethod::Date => {
            Ok(extract_date(source_text, rule.pattern.as_ref()))
        }
        ExtractionMethod::Number => {
            Ok(extract_number(source_text, rule.pattern.as_ref()))
        }
        ExtractionMethod::TextBefore => {
            if let Some(ref pattern) = rule.pattern {
                extract_text_before(source_text, pattern, cache)
            } else {
                Err("Pattern required for text_before extraction".to_string())
            }
        }
        ExtractionMethod::TextAfter => {
            if let Some(ref pattern) = rule.pattern {
                extract_text_after(source_text, pattern, cache)
            } else {
                Err("Pattern required for text_after extraction".to_string())
            }
        }
        ExtractionMethod::TextBetween => {
            // For text_between, we'd need two patterns - simplified for now
            Err("TextBetween requires two patterns (not yet implemented)".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_date() {
        assert!(extract_date("2024-01-15", None).is_some());
        assert!(extract_date("Jan 2024", None).is_some());
        assert!(extract_date("01/15/2024", None).is_some());
    }

    #[test]
    fn test_extract_number() {
        assert_eq!(extract_number("Price: $123.45", None), Some("123.45".to_string()));
        assert_eq!(extract_number("Count: 42", None), Some("42".to_string()));
    }

    #[test]
    fn test_extract_with_pattern() {
        let mut cache = RegexCache::new();
        let pattern = ExtractionPattern {
            pattern: r"\d{4}".to_string(),
            flags: None,
            group: Some(0),
            format: None,
        };
        
        let result = extract_with_pattern("Year 2024", &pattern, &mut cache).unwrap();
        assert_eq!(result, Some("2024".to_string()));
    }
}

