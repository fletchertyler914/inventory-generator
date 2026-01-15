#!/bin/bash

# Reset local database script
# Deletes the casespace.db file to allow fresh migration

set -e

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    DB_DIR="$HOME/Library/Application Support/com.casespace"
    DB_PATH="$DB_DIR/casespace.db"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    DB_DIR="$LOCALAPPDATA/com.casespace"
    DB_PATH="$DB_DIR/casespace.db"
else
    # Linux
    DB_DIR="$HOME/.local/share/com.casespace"
    DB_PATH="$DB_DIR/casespace.db"
fi

echo "🔍 Looking for database at: $DB_PATH"

if [ -f "$DB_PATH" ]; then
    echo "🗑️  Found database file. Deleting..."
    rm "$DB_PATH"
    echo "✅ Database deleted successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart your Tauri app"
    echo "   2. The database will be recreated with fresh migrations"
else
    echo "ℹ️  Database file not found at: $DB_PATH"
    echo "   (This is fine if you haven't run the app yet)"
fi

# Also check for migration tracking table backup (if exists)
echo ""
echo "✨ Database reset complete!"

