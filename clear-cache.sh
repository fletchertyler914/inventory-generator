#!/bin/bash
# Clear all dev/build cache for Tauri + Vite project

echo "🧹 Clearing dev/build cache..."

# Clear Vite cache
echo "Clearing Vite cache..."
rm -rf node_modules/.vite
rm -rf .vite

# Clear build output
echo "Clearing build output..."
rm -rf dist

# Clear Tauri target (optional - comment out if you want to keep Rust build cache)
echo "Clearing Tauri target (Rust build cache)..."
rm -rf src-tauri/target

# Clear node_modules (optional - uncomment if you want a full clean)
# echo "Clearing node_modules..."
# rm -rf node_modules

# Clear OS-specific caches
echo "Clearing OS caches..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    rm -rf ~/Library/Caches/com.casespace
    rm -rf ~/Library/Application\ Support/com.casespace/cache
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    rm -rf ~/.cache/com.casespace
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    echo "Windows cache clearing - run manually:"
    echo "  rmdir /s %LOCALAPPDATA%\\com.casespace\\cache"
fi

echo "✅ Cache cleared!"
echo ""
echo "Next steps:"
echo "  1. Run: pnpm install (if you cleared node_modules)"
echo "  2. Run: pnpm tauri dev"

