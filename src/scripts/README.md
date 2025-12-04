# Dummy Case Generation Scripts

Scripts for generating test cases to test the CaseListView features.

## Usage

### Method 1: UI Buttons (Easiest)

When running in development mode (`pnpm tauri dev`), you'll see two buttons in the CaseListView header:
- **Generate Test Cases** - Creates ~30 dummy cases with various properties
- **Clear Test Cases** - Removes all test cases (cases with TEST- or CASE-2024- prefix)

These buttons only appear in development mode.

### Method 2: Import in Code

```typescript
import { generateDummyCases, generateRandomCases, clearDummyCases } from './scripts/generateDummyCases';

// Generate all predefined dummy cases
await generateDummyCases();

// Generate specific number of random cases
await generateRandomCases(50);

// Clear all dummy cases (cases with TEST- or CASE-2024- prefix)
await clearDummyCases();
```

## What Gets Generated

The script creates cases with:

- **Various departments**: Litigation, Corporate, Cybersecurity, Employment, etc.
- **Different clients**: Smith & Associates, Acme Corporation, TechCo Inc, etc.
- **Mixed deployment modes**: Both 'local' and 'cloud'
- **Case IDs**: Some with CASE-2024-XXX format, some with TEST-XXX
- **Optional fields**: Some cases have all fields, some are minimal

## Testing Features

### Recent Cases Section
- Cases are created with current timestamp
- To test "Recent Cases" (last 7 days), open cases in sequence with delays:
  ```javascript
  // In browser console
  const cases = await caseService.listCases();
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
    // Open case (this updates last_opened_at)
    await caseService.getCase(cases[i].id);
  }
  ```

### Search & Filter
- Search by case name, ID, department, or client
- Filter by deployment mode (local/cloud)
- Filter by department or client (multiple cases share these)

### View Modes
- Grid view: Default for <20 cases
- List view: Auto-switches at 20+ cases
- Manual toggle available

### Sorting
- Recently Opened (default)
- Name (A-Z)
- Date Created
- File Count

## Clearing Test Data

```typescript
import { clearDummyCases } from './scripts/generateDummyCases';

// Removes all cases with TEST- prefix or CASE-2024- prefix
await clearDummyCases();
```

Or manually delete cases through the UI.

## Notes

- Cases use cloud URIs as sources (no file system validation required)
- Cases are created with current timestamp (all will appear "recent" initially)
- To test different `last_opened_at` times, open cases sequentially with delays
- The script includes error handling and progress logging

