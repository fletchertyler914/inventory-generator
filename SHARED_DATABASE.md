# Database Location

## ✅ Native Desktop App Database

The native Tauri desktop app stores the database in a platform-specific location:

### Default Database Path (Platform-Specific App Data Directory)

Following OS conventions for application data storage:

- **macOS**: `~/Library/Application Support/com.casespace/casespace.db`
- **Windows**: `%LOCALAPPDATA%\com.casespace\casespace.db`
- **Linux**: `~/.local/share/com.casespace/casespace.db`

**Why App Data Directory?**
- ✅ Standard OS convention for application data
- ✅ OS-managed, automatically backed up (on macOS/iCloud)
- ✅ Hidden from casual browsing (cleaner Documents folder)
- ✅ Proper permissions and security
- ✅ Cross-platform consistency

## 🎯 Benefits

✅ **Standard Location**: Follows OS conventions for application data  
✅ **Automatic Backups**: macOS automatically backs up Application Support to iCloud  
✅ **Clean Documents**: Keeps user's Documents folder clean  
✅ **Proper Permissions**: OS manages security and permissions  
✅ **Cross-Platform**: Consistent location concept across Windows, macOS, Linux

## 📋 How It Works

### Native Desktop App
- Automatically creates app data directory on first launch
- Stores database at `casespace.db` in that folder
- No configuration needed
- Database is created automatically if it doesn't exist
- All cases, files, and notes are stored in the same database

## 🛠️ Technical Details

### Native App (Rust)
```rust
// Uses Tauri's app_data_dir() for platform-specific app data directory
let app_data = app.path().app_data_dir()?;
let db_path = app_data.join("casespace.db");
// macOS: ~/Library/Application Support/com.casespace/casespace.db
// Windows: %LOCALAPPDATA%\com.casespace\casespace.db
// Linux: ~/.local/share/com.casespace/casespace.db
```

## 📝 Notes

- Database is created automatically if it doesn't exist
- Uses SQLite with full-text search (FTS5)
- All data is stored locally on the user's machine
- Database location follows OS conventions for application data

## 🚀 Deployment

When building the native app:
- Database location is automatically determined by OS
- No configuration needed
- Works on Windows, macOS, and Linux

