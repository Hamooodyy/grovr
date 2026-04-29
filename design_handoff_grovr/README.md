# Design Handoff: Grovr — Grocery Price Comparison App

## Overview
Grovr is a responsive web app that helps customers find the cheapest nearby grocery store for their shopping list, place an order, and track delivery. This handoff covers all five core screens of the app, both mobile and desktop layouts.

## About the Design Files
The files in this bundle (`Grovr.html` and `grovr-screens.jsx`) are **high-fidelity HTML prototypes** — not production code. They demonstrate intended look, feel, and interactions. Your task is to **recreate these designs inside your existing codebase** using its established framework (React, Next.js, etc.) and component library. Do not ship the prototype files directly.

## Fidelity
**High-fidelity.** Colors, typography, spacing, border radii, shadows, and interactions are all intentional and should be matched closely. The prototype is fully interactive — study it to understand hover states, transitions, and flows.

---

## Design Tokens

### Colors
| Token | Value | Usage |
|---|---|---|
| `--green` | `oklch(0.52 0.15 148)` ≈ `#16a34a` | Primary actions, accents, winner highlights |
| `--green-light` | `oklch(0.95 0.05 148)` ≈ `#dcfce7` | Selected states, badge backgrounds |
| `--green-xlight` | `oklch(0.98 0.02 148)` ≈ `#f0fdf4` | Subtle tinted backgrounds |
| `--amber` | `oklch(0.72 0.14 72)` ≈ `#f59e0b` | Savings callouts (reserved for future use) |
| `--bg` | `#f6fdf8` | Page background |
| `--surface` | `#ffffff` | Card/panel backgrounds |
| `--text` | `#0e1f14` | Primary text |
| `--muted` | `#6a7c71` | Secondary text, labels |
| `--border` | `#ddeee4` | Dividers, card borders |
| `--sidebar-bg` | `#0e1f14` | Desktop sidebar background |

### Typography
| Role | Font | Weight | Size |
|---|---|---|---|
| Logo / Display | Syne | 800 | 20–48px |
| Screen titles | Syne | 700 | 18px |
| Body / UI | DM Sans | 400–700 | 12–16px |
| Labels / Caps | DM Sans | 700 | 10–11px, letter-spacing 0.06em |

### Spacing & Radii
- Base card radius: `12px`
- Large card radius: `20px`
- Button radius: `14px`
- Pill radius: `99px`
- Standard padding: `16px`
- Desktop content padding: `24–32px`

### Shadows
```css
--shadow:    0 1px 3px rgba(0,30,15,0.06), 0 4px 12px rgba(0,30,15,0.04);
--shadow-lg: 0 4px 24px rgba(0,30,15,0.12);
```

---

## Responsive Breakpoint
- **Mobile:** < 900px — bottom tab nav, single-column layouts, phone-width content
- **Desktop:** ≥ 900px — dark green sidebar (220px), two-column screen layouts, no bottom nav

---

## Screens

### 1. Stores Map
**Purpose:** Customer views nearby stores on a map and adjusts their search radius.

**Mobile layout:**
- Header: location label + radius range slider + store count
- Full-bleed mock map (SVG) with store pins and radius circle
- Tapping a pin → bottom sheet slides up with store name, distance, delivery ETA, and two CTAs
- Floating "My list" button (bottom right) when no pin selected

**Desktop layout:**
- Left: full-height map (flex: 1)
- Right panel (320px): location label, radius slider with min/max labels, scrollable store card list, "Open Shopping List" CTA at bottom
- Store cards: name, distance, delivery ETA; selected state has green border + tinted bg

**Key interactions:**
- Radius slider filters visible pins in real time; out-of-range stores render at 30% opacity
- Selecting a store highlights its pin (larger, filled green, glow ring)

---

### 2. Shopping List
**Purpose:** Customer builds their list; items are matched to catalog products with category icons.

**Mobile layout:**
- Search bar with live autocomplete dropdown (up to 5 results)
- Scrollable item cards with: category thumbnail, product name, unit, brand preference, qty stepper (−/+), best price, remove (×)
- Bottom bar: item count, estimated total, "Compare prices" CTA (only when list non-empty)

**Desktop layout:**
- Left (flex: 1): search bar + item list (same as mobile)
- Right panel (300px):
  - "List Summary" header with item/category count
  - Category breakdown (icon + label + qty per category)
  - Brand preferences list (name → preference)
  - Estimated total card (green tint)
  - "Compare prices →" CTA pinned to bottom

**Brand Preference feature:**
- Each item card shows a dashed-border pill: "+ Brand preference"
- Tapping expands an inline input below the card row with a text field and "Done" button
- Done button turns green once text is entered
- Set preference renders as a solid green pill with a heart icon; tapping reopens the editor
- Helper text: "We'll match the closest available product at checkout."

**Product category colors (thumbnail bg / accent):**
| Category | Background | Accent |
|---|---|---|
| Dairy | `#fefce8` | `#ca8a04` |
| Produce | `#f0fdf4` | `#16a34a` |
| Bakery | `#fef3c7` | `#b45309` |
| Protein | `#fef2f2` | `#dc2626` |
| Pantry | `#eff6ff` | `#2563eb` |
| Beverage | `#ecfdf5` | `#0d9488` |

---

### 3. Price Compare
**Purpose:** Shows the customer which store is cheapest for their full list, with a savings callout.

**Tabs:** Summary | Details

**Winner card (always visible on mobile; right panel on desktop):**
- Full-bleed green card (`--green`)
- "Best Value" badge (white translucent pill)
- Store name in Syne 24px bold white
- Animated total price (slides up + fades in, 0.5s spring easing, 400ms delay)
- "💰 Save $X.XX vs next best" badge (white 15% bg, appears after price animation)
- Two decorative circles (white, 8–15% opacity) for depth

**Summary tab — three layout variants (user-selectable via Tweaks):**
1. **Summary list:** Ranked list of stores, rank number circle (green for #1), name, delivery, price, "+$X.XX" delta for losers
2. **Bar chart:** Horizontal filled bars, green for winner, gray for others; bars animate in on reveal
3. **Grid badges:** 2-column grid cards; winner card has green tint + "★ Best" label

**Details tab:** Table with item name/unit + price columns for top 3 stores; cheapest price per row highlighted in green bold.

**Desktop layout:**
- Left: tab bar + compare view (Summary or Details)
- Right panel (340px): Winner card + descriptive copy + "Order from X — $XX.XX" CTA button

---

### 4. Checkout
**Purpose:** Confirm delivery details and place the order.

**Fields:**
- Delivery address (text input, pre-filled)
- Delivery time (radio list: ASAP, Today 2–4 PM, Today 4–6 PM, Tomorrow 9–11 AM)
- Shopper tip (4-button grid: None / 10% / 15% / 20%)
- Payment method (display only — "Visa ending in 4242" with card icon)

**Order summary line items:** Subtotal, Delivery fee ($3.49), Service fee ($2.99), Shopper tip, Total

**Mobile layout:** Single column, store banner at top, all fields stacked, CTA at bottom
**Desktop layout:**
- Left (flex: 1): all form fields with 32px horizontal padding
- Right panel (360px): "Order Summary" header, store info card, item list with per-item prices, totals breakdown, payment row, "Place order · $XX.XX" CTA pinned to bottom

**Selected states:**
- Time slot: green border + `--green-light` bg
- Tip button: green border + `--green-light` bg + bold text
- Payment row: green border + `--green-light` bg

---

### 5. Order Tracking
**Purpose:** Live status of the order from placement to delivery.

**ETA hero:** Full-bleed green header, large Syne 42–48px ETA time, store name below

**Progress stepper (5 steps):**
- Placed → Confirmed → Picking → On the way → Delivered
- Completed steps: filled green circle with white checkmark
- Current step: filled green circle with pulsing white dot (CSS animation, 1.2s loop)
- Future steps: unfilled circle with border
- Connector lines: green when passed, `--border` gray when upcoming
- Step labels: 10px, green/bold for current, muted for future
- Current step has a 4px green glow ring (`box-shadow: 0 0 0 4px rgba(22,163,74,0.2)`)

**Item picking list:** Each item has a checkbox-style indicator; items animate to checked state with strikethrough text as the shopper picks them (simulated with 1.8s intervals in prototype).

**Mobile layout:** ETA hero → steps → status message → item picking list
**Desktop layout:**
- Left: compact ETA hero (with order number on right side), progress steps, status message
- Right panel (320px): "Items" header + picked count + progress bar + scrollable item pick list

---

## Interactions & Animations
| Interaction | Spec |
|---|---|
| Bottom sheet (store info) | `transform: translateY` from 20px, opacity 0→1, 250ms ease |
| Price reveal | Spring easing `cubic-bezier(0.34,1.56,0.64,1)`, 500ms, 400ms delay |
| Savings badge fade | Opacity 0→1, 400ms ease, 300ms delay after price |
| Bar chart fill | Width 0→target%, 800ms `cubic-bezier(0.4,0,0.2,1)`, staggered 100ms per bar |
| Item check-off | Border/bg color transition 300ms, text strikethrough |
| Stepper pulse | Scale 1→0.85, opacity 1→0.6, 1.2s loop |
| Card fade-in | translateY 6px → 0, opacity 0→1, 200ms ease |
| Sidebar nav hover | Background rgba(255,255,255,0.1), color white, 150ms |

---

## State Management
```
screen: 'map' | 'list' | 'compare' | 'checkout' | 'track'
items: Array<{ id, name, unit, cat, prices: {storeId: price}, qty, brandPref }>
stores: Array<{ id, name, dist, x, y, delivery, open }>
radius: number (miles, 0.5–5)
selectedStore: Store | null
winnerStore: Store (set when user proceeds from Compare)
compareVariant: 'summary' | 'bars' | 'badges'
```
- `screen` is persisted to `localStorage` ('grovr-screen')

---

## Files
| File | Purpose |
|---|---|
| `Grovr.html` | Main entry: shell, CSS tokens, mock data, App component, Nav, Tweaks |
| `grovr-screens.jsx` | All 5 screen components with mobile + desktop layout variants |

Open `Grovr.html` in a browser to interact with the full prototype. Resize to < 900px to see mobile layout.
