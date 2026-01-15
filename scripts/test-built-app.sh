#!/bin/bash
# Test the built Tauri app and check for issues

set -e

echo "=========================================="
echo "Testing Built CaseSpace App"
echo "=========================================="
echo ""

APP_PATH=$(find src-tauri/target/release/bundle/macos -name "*.app" -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    echo "❌ App bundle not found. Run './debug-build.sh' first to build the app."
    exit 1
fi

echo "App bundle: $APP_PATH"
echo ""

# Check Resources directory
RESOURCES_DIR="$APP_PATH/Contents/Resources"
echo "Checking Resources directory..."
if [ ! -d "$RESOURCES_DIR" ]; then
    echo "❌ Resources directory not found!"
    exit 1
fi

echo "Contents of Resources:"
ls -lh "$RESOURCES_DIR"
echo ""

# Check for index.html
if [ -f "$RESOURCES_DIR/index.html" ]; then
    echo "✅ index.html found"
    echo "   Size: $(du -h "$RESOURCES_DIR/index.html" | awk '{print $1}')"
    echo "   First few lines:"
    head -5 "$RESOURCES_DIR/index.html"
else
    echo "❌ index.html NOT FOUND - This is the problem!"
    echo ""
    echo "The assets are not being embedded in the app bundle."
    echo "This explains why the window shows 'tauri://localhost' without the path."
    exit 1
fi

echo ""

# Check for assets
if [ -d "$RESOURCES_DIR/assets" ]; then
    ASSET_COUNT=$(find "$RESOURCES_DIR/assets" -type f | wc -l | tr -d ' ')
    echo "✅ assets/ directory found with $ASSET_COUNT files"
else
    echo "❌ assets/ directory NOT FOUND"
fi

echo ""
echo "To launch the app:"
echo "  open \"$APP_PATH\""
echo ""
echo "To view logs while running:"
echo "  ./logs:watch"

