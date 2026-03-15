

## Plan: Move Old Deck and Create New Deck from PPTX

### What Changes

1. **Move current deck to `/olddeck` (login-required)**
   - Rename `src/pages/Deck.tsx` to `src/pages/OldDeck.tsx`, update export name
   - Add `/olddeck` route in `App.tsx` wrapped in `<ProtectedRoute>`

2. **Create new `src/pages/Deck.tsx` for `/deck` (public)**
   - 17 slides matching the uploaded PPTX content, using the same design system (SlideHeader, StatCard, hover-lift cards, aura-gradient-text, dot navigation, arrow keys, etc.)

### Slide Mapping (PPTX vs Current)

| # | PPTX Slide | Status |
|---|-----------|--------|
| 1 | Title | Same content |
| 2 | The Origin | Same content |
| 3 | The Problem | Same content |
| 4 | Unfair Advantage | Same content |
| 5 | The Solution | Updated — adds real-time activity intelligence, producer analytics dashboard |
| 6 | How It Works | Same content |
| 7 | **Pulse — Live Feature** | **NEW** — loss run tracking, aging alerts, document processing, email intelligence, activity counter, background job visibility |
| 8 | **Command Center — Live Feature** | **NEW** — producer performance dashboard with MTD/YTD metrics |
| 9 | Intelligence Architecture (Data/Thinking/Human) | Replaces old "Three Layers" + "Human First" (merged) |
| 10 | The Moat | Same content |
| 11 | Platform Expansion | Same content with updated phase items |
| 12 | Extending Intelligence | Same as old "Insured Experience" with added Intake Intelligence |
| 13 | Why AURA Wins | Same content |
| 14 | Revenue Model | Same content |
| 15 | Go-to-Market | Same content |
| 16 | Financial Projections | Same content |
| 17 | The Ask | **Updated numbers**: $500K raise, 10% equity, $5M pre-money, max 2 investors, $250K min |

**Removed from old deck**: "Human First" standalone slide, "Why AURA Exists" closing slide.

### Files Modified
- `src/App.tsx` — add `/olddeck` route, keep `/deck` public
- `src/pages/Deck.tsx` — entirely new file with 17 PPTX slides
- `src/pages/OldDeck.tsx` — renamed copy of current Deck.tsx

