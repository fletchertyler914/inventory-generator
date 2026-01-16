#!/bin/bash
# Test script for backend Rust code
# Verifies that commands and repositories work correctly

set -e

echo "🧪 Running backend tests..."
echo ""

cd src-tauri

echo "📦 Running repository unit tests..."
cargo test --lib repositories::tests -- --nocapture

echo ""
echo "📦 Running command integration tests..."
cargo test --lib commands::tests -- --nocapture

echo ""
echo "📦 Running critical feature tests..."
cargo test --lib commands::tests_critical_features -- --nocapture

echo ""
echo "📦 Running performance tests..."
cargo test --lib commands::tests_performance -- --nocapture

echo ""
echo "✅ All backend tests passed!"
