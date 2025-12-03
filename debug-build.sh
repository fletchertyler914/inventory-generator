#!/bin/bash
# CaseSpace Build Debugging Script
# This script helps diagnose the blank screen issue step by step

set -e

echo "=========================================="
echo "CaseSpace Build Debugging Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Verify frontend build
echo -e "${BLUE}STEP 1: Verifying frontend build (dist/)${NC}"
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist/ directory missing${NC}"
    echo "Running: pnpm build"
    pnpm build
else
    echo -e "${GREEN}✅ dist/ directory exists${NC}"
fi

if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ dist/index.html missing${NC}"
    exit 1
else
    echo -e "${GREEN}✅ dist/index.html exists${NC}"
    echo "   File size: $(du -h dist/index.html | awk '{print $1}')"
fi

ASSET_COUNT=$(find dist -type f | wc -l | tr -d ' ')
echo -e "${GREEN}✅ Found $ASSET_COUNT files in dist/${NC}"
echo ""

# Step 2: Check dist/index.html paths
echo -e "${BLUE}STEP 2: Checking dist/index.html for path issues${NC}"
if grep -q 'src="/' dist/index.html; then
    echo -e "${RED}❌ Found absolute paths in dist/index.html${NC}"
    grep 'src="/' dist/index.html
else
    echo -e "${GREEN}✅ All paths in dist/index.html are relative${NC}"
fi
echo ""

# Step 3: Verify tauri.conf.json
echo -e "${BLUE}STEP 3: Verifying tauri.conf.json configuration${NC}"
if [ ! -f "src-tauri/tauri.conf.json" ]; then
    echo -e "${RED}❌ tauri.conf.json missing${NC}"
    exit 1
fi

FRONTEND_DIST=$(grep -A 1 '"frontendDist"' src-tauri/tauri.conf.json | grep -o '"[^"]*"' | tail -1 | tr -d '"')
echo "   frontendDist: $FRONTEND_DIST"

# Resolve relative path
if [[ "$FRONTEND_DIST" == ../* ]]; then
    RESOLVED_PATH=$(cd src-tauri && cd "$FRONTEND_DIST" && pwd)
    echo "   Resolved path: $RESOLVED_PATH"
    if [ -f "$RESOLVED_PATH/index.html" ]; then
        echo -e "${GREEN}✅ Resolved frontendDist path contains index.html${NC}"
    else
        echo -e "${RED}❌ Resolved frontendDist path does NOT contain index.html${NC}"
    fi
fi
echo ""

# Step 4: Check for build artifacts
echo -e "${BLUE}STEP 4: Checking for existing build artifacts${NC}"
if [ -d "src-tauri/target/release" ]; then
    echo -e "${YELLOW}⚠️  Release build artifacts found${NC}"
    echo "   Consider cleaning with: cargo clean (in src-tauri/)"
else
    echo -e "${GREEN}✅ No existing release build (clean state)${NC}"
fi
echo ""

# Step 5: Build with verbose output
echo -e "${BLUE}STEP 5: Building Tauri app (this may take a while...)${NC}"
echo "   Running: pnpm tauri build"
echo ""

# Capture build output
pnpm tauri build 2>&1 | tee /tmp/tauri-build.log

BUILD_EXIT_CODE=${PIPESTATUS[0]}
if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Build failed with exit code $BUILD_EXIT_CODE${NC}"
    echo "   Check /tmp/tauri-build.log for details"
    exit 1
fi
echo ""

# Step 6: Verify assets in app bundle
echo -e "${BLUE}STEP 6: Verifying assets in app bundle${NC}"
APP_PATH=$(find src-tauri/target/release/bundle/macos -name "*.app" -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}❌ App bundle not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ App bundle found: $APP_PATH${NC}"
echo ""

# Check Resources directory
RESOURCES_DIR="$APP_PATH/Contents/Resources"
if [ -d "$RESOURCES_DIR" ]; then
    echo "   Resources directory contents:"
    ls -lh "$RESOURCES_DIR" | head -10
    echo ""
    
    # Check for index.html
    if [ -f "$RESOURCES_DIR/index.html" ]; then
        echo -e "${GREEN}✅ index.html found in Resources${NC}"
    else
        echo -e "${RED}❌ index.html NOT found in Resources${NC}"
        echo "   This is the problem! Assets are not being embedded."
    fi
    
    # Check for assets directory
    if [ -d "$RESOURCES_DIR/assets" ]; then
        ASSET_FILES=$(find "$RESOURCES_DIR/assets" -type f | wc -l | tr -d ' ')
        echo -e "${GREEN}✅ assets/ directory found with $ASSET_FILES files${NC}"
    else
        echo -e "${RED}❌ assets/ directory NOT found in Resources${NC}"
    fi
else
    echo -e "${RED}❌ Resources directory not found${NC}"
fi
echo ""

# Step 7: Check binary size (should include embedded assets)
echo -e "${BLUE}STEP 7: Checking binary size${NC}"
BINARY_PATH="$APP_PATH/Contents/MacOS/casespace"
if [ -f "$BINARY_PATH" ]; then
    BINARY_SIZE=$(du -h "$BINARY_PATH" | awk '{print $1}')
    echo "   Binary size: $BINARY_SIZE"
    
    # Check if binary contains asset references
    if strings "$BINARY_PATH" | grep -q "index.html"; then
        echo -e "${GREEN}✅ Binary contains 'index.html' string${NC}"
    else
        echo -e "${YELLOW}⚠️  Binary does not contain 'index.html' string${NC}"
    fi
else
    echo -e "${RED}❌ Binary not found${NC}"
fi
echo ""

# Step 8: Summary
echo -e "${BLUE}=========================================="
echo "DEBUGGING SUMMARY"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. If index.html is missing from Resources:"
echo "   - Check tauri.conf.json frontendDist path"
echo "   - Verify dist/ contains all files"
echo "   - Check build logs for embedding errors"
echo ""
echo "2. If assets are missing:"
echo "   - Check if Tauri is embedding assets correctly"
echo "   - Verify base: './' in vite.config.ts"
echo ""
echo "3. To test the app:"
echo "   open \"$APP_PATH\""
echo ""

