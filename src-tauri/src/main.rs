// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    eprintln!("[CaseSpace] ===== MAIN ENTRY POINT ===== ");
    eprintln!("[CaseSpace] Application binary started");
    eprintln!("[CaseSpace] Calling casespace_lib::run()...");
    casespace_lib::run();
    eprintln!("[CaseSpace] casespace_lib::run() returned (should not happen normally)");
}
