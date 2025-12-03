# CaseSpace Blank Screen Debugging Guide

This guide helps diagnose and fix the blank screen issue in the production build.

## Quick Start

Run the automated debugging script:
```bash
./debug-build.sh
```

This will:
1. Verify frontend build exists
2. Check asset paths
3. Build the Tauri app
4. Verify assets are embedded
5. Report any issues found

## Manual Step-by-Step Debugging

### Step 1: Verify Frontend Build

```bash
# Build frontend
pnpm build

# Verify dist/ exists and has files
ls -la dist/
ls -la dist/assets/

# Check index.html exists
test -f dist/index.html && echo "✅ index.html exists" || echo "❌ Missing"
```

**Expected:** `dist/index.html` and `dist/assets/` directory with JS/CSS files.

### Step 2: Check dist/index.html Paths

```bash
# Check for absolute paths (should be relative)
grep -n 'src="/' dist/index.html
grep -n 'href="/' dist/index.html
```

**Expected:** No absolute paths found. All paths should be relative (`./assets/...`).

### Step 3: Verify tauri.conf.json

```bash
# Check frontendDist path
cat src-tauri/tauri.conf.json | grep -A 1 frontendDist

# Verify the path resolves correctly
cd src-tauri && ls -la ../dist/index.html
```

**Expected:** `frontendDist: "../dist"` and the path resolves to `dist/index.html`.

### Step 4: Clean Build

```bash
# Clean previous builds
cd src-tauri
cargo clean
cd ..

# Build Tauri app
pnpm tauri build
```

**Watch for:**
- Any errors about missing files
- Warnings about asset embedding
- Build completion without errors

### Step 5: Check App Bundle

```bash
# Find the app bundle
APP_PATH=$(find src-tauri/target/release/bundle/macos -name "*.app" -type d | head -1)

# Check Resources directory
ls -la "$APP_PATH/Contents/Resources/"

# Check for index.html
test -f "$APP_PATH/Contents/Resources/index.html" && echo "✅ Found" || echo "❌ Missing"

# Check for assets
test -d "$APP_PATH/Contents/Resources/assets" && echo "✅ Found" || echo "❌ Missing"
```

**Expected:** Both `index.html` and `assets/` directory exist in Resources.

### Step 6: Test the App

```bash
# Launch the app
open "$APP_PATH"

# In another terminal, watch logs
./logs:watch
```

**Check logs for:**
- Window URL (should be `tauri://localhost/index.html`)
- Any `AssetNotFound` errors
- Frontend console logs

## Common Issues and Fixes

### Issue 1: Assets Not Embedded

**Symptoms:**
- `Resources/` directory only has `icon.icns`
- No `index.html` in Resources
- Window URL is `tauri://localhost` (no path)

**Possible Causes:**
1. `frontendDist` path is incorrect
2. `dist/` doesn't exist when Tauri builds
3. Tauri build process not embedding assets

**Fixes:**
1. Verify `frontendDist: "../dist"` in `tauri.conf.json`
2. Ensure `pnpm build` runs before `tauri build` (check `beforeBuildCommand`)
3. Check build logs for embedding errors

### Issue 2: Window URL Wrong

**Symptoms:**
- Window URL is `tauri://localhost` instead of `tauri://localhost/index.html`
- Blank screen

**Possible Causes:**
1. Window config missing `url` field (should default to `index.html`)
2. Assets not embedded, so Tauri can't find `index.html`

**Fixes:**
1. Ensure window config doesn't have explicit `url` (let it default)
2. Fix asset embedding (see Issue 1)

### Issue 3: Absolute Paths in dist/

**Symptoms:**
- Assets load in dev but not in production
- 404 errors for assets

**Fixes:**
1. Ensure `base: './'` in `vite.config.ts`
2. Rebuild frontend: `pnpm build`
3. Verify `dist/index.html` has relative paths

## Debugging Tools

### View Logs
```bash
# Tail logs in real-time
./logs:watch

# View only errors
./logs:errors

# View last N lines
./logs -n 100
```

### Check Window URL (in Rust)
The setup callback in `src-tauri/src/lib.rs` logs the window URL. Check logs for:
```
[CaseSpace] Main window URL: tauri://localhost/index.html
```

### Test Asset Server
If assets are embedded, you can test by:
1. Opening the app
2. Checking browser console (if devtools enabled)
3. Looking for network errors loading assets

## Next Steps After Diagnosis

Once you identify the issue:

1. **If assets not embedded:**
   - Check Tauri version compatibility
   - Verify `tauri-build` version matches `tauri` version
   - Check for build script errors

2. **If window URL wrong:**
   - Verify window config in `tauri.conf.json`
   - Check if window is created programmatically (should use config)

3. **If paths wrong:**
   - Fix `vite.config.ts` base path
   - Rebuild frontend
   - Rebuild Tauri app

## Getting Help

If issues persist:
1. Run `./debug-build.sh` and save output
2. Check logs with `./logs:errors`
3. Compare with a fresh Tauri v2 React template
4. Check Tauri v2 GitHub issues for similar problems

