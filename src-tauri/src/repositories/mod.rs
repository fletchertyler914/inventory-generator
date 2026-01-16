pub mod shared;
pub mod case_repository;
pub mod file_repository;

#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_error_cases;

// Exports for use in commands (when repository pattern is fully adopted)
// pub use case_repository::CaseRepository;
// pub use file_repository::FileRepository;
