

# SEO Optimization Plan for FinTrack

## Current State
- Basic meta tags exist in `index.html` but descriptions are generic ("Personal Finance")
- `robots.txt` exists but no `sitemap.xml`
- Single-page app with no document title updates per view
- No structured data (JSON-LD)
- No canonical URL
- No `react-helmet` or equivalent for dynamic head management

## Limitations
This is a client-side React SPA. Search engine crawlers have limited ability to index JS-rendered content. We can optimize what's possible within this constraint.

## Plan

### 1. Enhance `index.html` static meta tags
- Write richer, keyword-targeted `description` (e.g., "Track expenses, manage budgets, and monitor your personal finances with FinTrack - a free personal finance tracker")
- Add canonical URL: `<link rel="canonical" href="https://fluid-funds-hub.lovable.app/" />`
- Add `theme-color` meta tag
- Add `og:url` meta property
- Clean up TODO comments

### 2. Add dynamic document titles per page
- Install `react-helmet-async` (lightweight, React 18 compatible)
- Create a reusable `<SEOHead>` component that sets `<title>` and `<meta name="description">` per view
- Add it to Dashboard, Transactions, Accounts, Categories pages and the Auth page
- Pattern: "Transactions | FinTrack", "Dashboard | FinTrack", etc.

### 3. Add structured data (JSON-LD)
- Add `WebApplication` schema in `index.html` for search engine rich results
- Includes app name, description, category, operating system

### 4. Add `sitemap.xml`
- Create `public/sitemap.xml` with the root URL
- Update `robots.txt` to reference the sitemap

### 5. Improve accessibility (SEO signal)
- Add semantic HTML landmarks (`<header>`, `<nav>`, `<main>`) in `AppShell.tsx` where currently using generic `<div>`/`<aside>`
- Ensure images/icons have proper `aria-label` attributes

## Files to create/modify
- `index.html` - Enhanced meta tags, JSON-LD, canonical
- `public/sitemap.xml` - New file
- `public/robots.txt` - Add sitemap reference
- `src/components/shared/SEOHead.tsx` - New reusable component
- `src/pages/Dashboard.tsx`, `Transactions.tsx`, `Accounts.tsx`, `Categories.tsx`, `Auth.tsx` - Add `<SEOHead>`
- `src/components/layout/AppShell.tsx` - Semantic HTML
- `package.json` - Add `react-helmet-async`

