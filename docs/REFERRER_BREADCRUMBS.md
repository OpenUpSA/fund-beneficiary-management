# Referrer-Based Breadcrumb Navigation

## Overview

The breadcrumb system now supports **referrer-based navigation**, allowing users to see where they came from and easily navigate back through their journey.

## How It Works

### Example Flow

1. User visits: **LDAs > Otsile Bokamosho > Overview**
2. User clicks a fund link: "Youth Development Fund"
3. Breadcrumbs now show: **LDAs > Otsile Bokamosho > Funds > Youth Development Fund > Overview**
4. User can click "Otsile Bokamosho" to go back to the LDA

## Implementation

### 1. Using `buildReferrerUrl()` for Links

When creating links between entities, use the `buildReferrerUrl()` helper:

```tsx
import { buildReferrerUrl } from "@/lib/breadcrumb-utils"

// Example: Linking from LDA to Fund
<Link 
  href={buildReferrerUrl(`/dashboard/funds/${fund.id}`, {
    type: 'lda',
    id: ldaId,
    name: ldaName
  })}
>
  {fund.name}
</Link>
```

**Supported entity types:**
- `'lda'` - Local Development Agency
- `'fund'` - Fund
- `'funder'` - Funder

### 2. Automatic Breadcrumb Detection

The `DynamicBreadcrumb` component automatically reads referrer information from URL parameters:

```
/dashboard/funds/123?from=lda&from_id=456&from_name=Otsile%20Bokamosho
```

This will display:
```
LDAs > Otsile Bokamosho > Funds > Youth Development Fund > Overview
```

### 3. Tab Navigation Preservation

Tab navigation automatically preserves referrer parameters using `preserveReferrer()`:

```tsx
// Already implemented in FundsTabs, FunderTabs, and LDATabs
const searchParams = useSearchParams()

href: preserveReferrer(`/dashboard/funds/${fundId}/overview`, searchParams)
```

## Where to Add Referrer Links

### ✅ Already Implemented

- **LDA Overview → Funds**: Fund links include LDA referrer information

### 🔧 Need to Implement

Add referrer information to these cross-entity links:

#### Fund Pages → LDAs
```tsx
// In components/funds/funded-ldas.tsx or similar
<Link 
  href={buildReferrerUrl(`/dashboard/ldas/${lda.id}`, {
    type: 'fund',
    id: fundId,
    name: fundName
  })}
>
  {lda.name}
</Link>
```

#### Fund Pages → Funders
```tsx
// In components/funds/filtered-funders.tsx or similar
<Link 
  href={buildReferrerUrl(`/dashboard/funders/${funder.id}`, {
    type: 'fund',
    id: fundId,
    name: fundName
  })}
>
  {funder.name}
</Link>
```

#### Funder Pages → Funds
```tsx
// In components/funders/contributed-funds.tsx or similar
<Link 
  href={buildReferrerUrl(`/dashboard/funds/${fund.id}`, {
    type: 'funder',
    id: funderId,
    name: funderName
  })}
>
  {fund.name}
</Link>
```

#### Funder Pages → LDAs
```tsx
// In components/funders pages linking to LDAs
<Link 
  href={buildReferrerUrl(`/dashboard/ldas/${lda.id}`, {
    type: 'funder',
    id: funderId,
    name: funderName
  })}
>
  {lda.name}
</Link>
```

## API Reference

### `buildReferrerUrl(targetUrl, referrer)`

Builds a URL with referrer information for breadcrumb navigation.

**Parameters:**
- `targetUrl` (string): The destination URL
- `referrer` (ReferrerInfo):
  - `type`: 'lda' | 'fund' | 'funder'
  - `id`: string | number
  - `name`: string (will be URL-encoded)

**Returns:** String with query parameters appended

### `preserveReferrer(baseUrl, searchParams)`

Preserves referrer parameters when navigating between tabs.

**Parameters:**
- `baseUrl` (string): The base URL to navigate to
- `searchParams` (URLSearchParams): Current search parameters

**Returns:** String with referrer params preserved if they exist

### `parseReferrer(searchParams)`

Parses referrer information from URL search params.

**Parameters:**
- `searchParams` (URLSearchParams): URL search parameters

**Returns:** ReferrerInfo object or null if no referrer info present

## Benefits

1. **Better UX**: Users can see their navigation path clearly
2. **Easy Navigation**: Click any breadcrumb to go back
3. **Context Preservation**: Tab switching maintains the referrer context
4. **Automatic**: Once links are updated, breadcrumbs work automatically

## Testing

To test the system:

1. Navigate to an LDA: `/dashboard/ldas/123`
2. Click a fund link in the overview
3. Verify breadcrumbs show: `LDAs > [LDA Name] > Funds > [Fund Name] > Overview`
4. Switch tabs and verify the referrer is preserved in the URL
5. Click the LDA name in breadcrumbs to navigate back
