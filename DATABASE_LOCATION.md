# Database Location - Platform-Specific App Data Directory

## ✅ Standard OS Conventions

The database is stored in the **platform-specific app data directory**, following OS best practices:

### Database Paths

| Platform | Path |
|----------|------|
| **macOS** | `~/Library/Application Support/com.casespace/casespace.db` |
| **Windows** | `%LOCALAPPDATA%\com.casespace\casespace.db` |
| **Linux** | `~/.local/share/com.casespace/casespace.db` |

## 🎯 Why App Data Directory?

### ✅ Advantages

1. **OS Standard**: Follows platform conventions (Apple, Microsoft, XDG)
2. **Automatic Backups**: macOS automatically backs up Application Support to iCloud
3. **Clean Documents**: Keeps user's Documents folder clean
4. **Proper Permissions**: OS manages security and permissions
5. **Hidden from Casual Browsing**: Less likely to be accidentally deleted
6. **Cross-Platform Consistency**: Same concept across all platforms

### 📋 Comparison

| Location | Pros | Cons |
|----------|------|------|
| **App Data Directory** ✅ | OS standard, auto-backup, proper permissions | Harder to find manually |
| **Documents Folder** | Easy to find, user-friendly | Mixes app data with user docs |
| **Custom Location** | User control | Requires configuration, not standard |

## 🔧 Implementation

### Native App (Rust)
```rust
// Uses Tauri's app_data_dir() - automatically platform-specific
let app_data = app.path().app_data_dir()?;
let db_path = app_data.join("casespace.db");
```

### Web App (TypeScript)
```typescript
// Uses File System Access API
// User navigates to app data directory when selecting database file
// Browser remembers permission for future access
```

## 📝 Finding the Database

### macOS
```bash
# Open Finder, press Cmd+Shift+G, paste:
~/Library/Application Support/com.casespace/
```

### Windows
```powershell
# Open Run (Win+R), paste:
%LOCALAPPDATA%\com.casespace\
```

### Linux
```bash
# In terminal:
~/.local/share/com.casespace/
```

## 🔄 Migration from Documents

If you previously used `~/Documents/CaseSpace/`, the database will be in the new location automatically on next app launch. Old location is not automatically migrated (by design - keeps Documents clean).

## 🚀 Future: Custom Location

Future enhancement: Allow users to configure custom database location via settings, while defaulting to app data directory.

