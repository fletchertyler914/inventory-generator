<!-- 631fbfd2-2b90-4219-97c1-0bd9d374adb6 000b92ff-fed6-466f-9f9c-0b35ecadfa85 -->
# Subscription Access System Implementation

## Overview

Implement a comprehensive subscription management system that balances user empowerment, security, and retention. The system will use API key authentication with a remote verification server, feature-based access control, grace period handling, and encrypted local storage.

## Architecture Decisions

### Subscription Tiers (Stickiness-Optimized)

**Free Tier** (Default - Gets users invested):

- Basic case management (create, view, switch cases)
- File viewing (PDFs, images, basic documents)
- Basic notes (case-level and file-level, plain text)
- Basic search (file names and paths only)
- Basic export (CSV only, limited columns)
- Single case source per case
- Up to 5 cases

**Pro Tier** (Daily workflow essentials - High stickiness):

- Unlimited cases
- Multiple sources per case
- Custom column schemas (global and case-specific)
- Advanced full-text search (FTS5 across files, notes, findings, timeline)
- Rich text notes (formatting, markdown, code blocks, images)
- Findings management (severity levels, file linking)
- Timeline events (automatic and manual)
- Workflow board (Kanban-style organization)
- Advanced export (XLSX with formatting, JSON, custom columns)
- Bulk operations (status updates, tag management)
- Advanced metadata extraction
- Report generation (comprehensive reports with findings/timeline)

### Security & Privacy

- **API Key Storage**: Encrypted using OS keychain (macOS Keychain, Windows Credential Manager, Linux secret service)
- **Local Data**: Always retained permanently, never deleted
- **Cloud Data Retention**: 6 months post-subscription lapse (documented policy)
- **Grace Period**: 1x subscription interval (monthly = 1 month, annual = 1 year)
- **Verification**: At subscription interval including grace period

## Implementation Components

### 1. Backend Subscription Service (Rust/Tauri)

**Files to create/modify:**

- `src-tauri/src/subscription.rs` - Subscription management and verification
- `src-tauri/src/encryption.rs` - API key encryption/decryption using OS keychain
- `src-tauri/src/lib.rs` - Add subscription commands

**Key functions:**

- `verify_subscription(api_key: String) -> SubscriptionStatus`
- `get_subscription_status() -> SubscriptionStatus`
- `store_api_key(api_key: String) -> Result<()>`
- `get_api_key() -> Option<String>`
- `clear_api_key() -> Result<()>`
- `check_feature_access(feature: Feature) -> bool`

**Subscription status structure:**

```rust
pub struct SubscriptionStatus {
    pub tier: SubscriptionTier, // Free, Pro
    pub valid_until: Option<i64>, // Unix timestamp
    pub grace_period_until: Option<i64>, // Unix timestamp
    pub features: Vec<Feature>, // Enabled features
    pub last_verified: i64, // Last successful verification
}
```

### 2. Frontend Subscription Management

**Files to create:**

- `src/services/subscriptionService.ts` - Subscription API client
- `src/store/subscriptionStore.ts` - Zustand store for subscription state
- `src/components/subscription/ActivationDialog.tsx` - API key activation UI
- `src/components/subscription/SubscriptionStatus.tsx` - Status display component
- `src/components/subscription/UpgradePrompt.tsx` - Feature gating UI
- `src/hooks/useSubscription.ts` - Subscription hook with feature checking

**Key features:**

- API key input and activation
- Subscription status display
- Feature access checking
- Grace period warnings
- Upgrade prompts for premium features

### 3. Feature Gating System

**Files to modify:**

- `src/lib/featureGates.ts` - Feature gate utilities
- All premium feature components - Add feature checks

**Implementation pattern:**

```typescript
if (!hasFeatureAccess('custom_schemas')) {
  return <UpgradePrompt feature="custom_schemas" />
}
```

**Features to gate:**

- Custom schemas (column_configs, mapping_configs)
- Advanced search (FTS5 beyond file names)
- Rich text notes (TiptapEditor advanced features)
- Findings management (entire FindingsPanel)
- Timeline events (TimelineView)
- Workflow board (WorkflowBoard)
- Advanced export (XLSX, JSON formats)
- Bulk operations
- Multiple case sources
- Report generation

### 4. Mock Subscription API Server

**Files to create:**

- `subscription-api/` directory (separate service)
- `subscription-api/server.js` - Express.js mock server
- `subscription-api/db.json` - JSON database for mock data
- `subscription-api/README.md` - Setup and API documentation

**Endpoints:**

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify API key, return subscription status
- `GET /api/subscription/status` - Get subscription status (requires API key)
- `POST /api/subscription/activate` - Activate API key
- `POST /api/webhooks/stripe` - Stripe webhook handler (mock)

**Mock data structure:**

```json
{
  "users": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "apiKey": "sk_test_...",
      "subscription": {
        "tier": "pro",
        "status": "active",
        "currentPeriodEnd": 1234567890,
        "gracePeriodEnd": 1234654290
      }
    }
  ]
}
```

### 5. Account Management Website (Mock)

**Files to create:**

- `subscription-website/` directory
- `subscription-website/index.html` - Landing/login page
- `subscription-website/dashboard.html` - User dashboard
- `subscription-website/api-key.html` - API key management
- `subscription-website/pricing.html` - Pricing page
- `subscription-website/checkout.html` - Stripe checkout (mock)

**Features:**

- User registration/login
- API key generation and display
- Subscription management
- Payment method management (Stripe mock)
- Usage statistics
- Account settings

### 6. Database Schema Updates

**Files to modify:**

- `src-tauri/src/database.rs` - Add subscription tables

**New tables:**

```sql
CREATE TABLE IF NOT EXISTS subscription (
    id TEXT PRIMARY KEY,
    api_key_hash TEXT NOT NULL, -- Hashed, not plaintext
    tier TEXT DEFAULT 'free',
    valid_until INTEGER,
    grace_period_until INTEGER,
    last_verified INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_checks (
    id TEXT PRIMARY KEY,
    check_time INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'valid', 'expired', 'grace_period'
    response_data TEXT, -- JSON response from API
    created_at INTEGER NOT NULL
);
```

### 7. Subscription Verification Logic

**Verification flow:**

1. On app launch: Check if verification needed (last check + interval)
2. If needed: Call API with encrypted API key
3. Update local subscription status
4. Store verification timestamp
5. If API unavailable: Use cached status if within grace period

**Grace period handling:**

- If subscription expired but within grace period: Show warning, allow access
- If grace period expired: Downgrade to free tier, show upgrade prompt
- Local data always retained

### 8. Integration Points

**App initialization:**

- `src/App.tsx` - Add subscription check on mount
- `src-tauri/src/main.rs` - Initialize subscription on startup

**Feature integration:**

- `src/components/case/CreateCaseDialog.tsx` - Check case limit (free tier)
- `src/components/mapping/FieldMapperStepper.tsx` - Gate custom schemas
- `src/components/notes/TiptapEditor.tsx` - Gate rich text features
- `src/components/findings/FindingsPanel.tsx` - Gate entire panel
- `src/components/timeline/TimelineView.tsx` - Gate timeline
- `src/components/board/WorkflowBoard.tsx` - Gate workflow board
- `src/components/reports/ReportGenerator.tsx` - Gate advanced reports
- `src/components/table/ColumnManager.tsx` - Gate custom columns

## Security Considerations

1. **API Key Encryption**: Use OS-native keychain (no custom encryption needed)
2. **Network Security**: HTTPS only, certificate pinning for production
3. **Key Rotation**: Support API key regeneration
4. **Rate Limiting**: Implement on API server
5. **Audit Logging**: Log all subscription checks and changes

## Configuration

**Environment variables:**

- `SUBSCRIPTION_API_URL` - API server URL (default: http://localhost:3001)
- `SUBSCRIPTION_CHECK_INTERVAL` - Check frequency (default: matches subscription interval)
- `GRACE_PERIOD_MULTIPLIER` - Grace period calculation (default: 1.0)

## Testing Strategy

1. **Unit tests**: Subscription verification logic
2. **Integration tests**: API key storage/retrieval
3. **E2E tests**: Full activation and feature gating flow
4. **Mock server tests**: API endpoint validation

## Documentation

- API documentation for subscription endpoints
- User guide for activation flow
- Developer guide for adding new feature gates
- Data retention policy documentation