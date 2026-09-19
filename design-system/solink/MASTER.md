# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Solink
**Generated:** 2026-09-19 13:35:24
**Category:** Smart Home/IoT Dashboard
**Design Dials:** Variance 6/10 (Balanced / Modern) | Motion 2/10 (Subtle) | Density 8/10 (Dense / Dashboard)

---

## Global Rules

### Color Palette

**Verified match:** "Industrial grey + safety orange" from the palette database
(`--domain color`, query `industrial operations control neutral`).

The auto-generated system proposed a slate + `#22C55E` green. That was **rejected**:
the product brief states Solink must not look like a generic green environmental
website. Safety orange is the language of field equipment and infrastructure, which
is what this product actually is, and it reads as solar without reading as "eco".

| Role | Light | Dark | CSS Variable |
|------|-------|------|--------------|
| Primary | `#475569` | `#94A3B8` | `--color-primary` |
| On Primary | `#FFFFFF` | `#0B1220` | `--color-on-primary` |
| Accent / CTA | `#EA580C` | `#F97316` | `--color-accent` |
| On Accent | `#FFFFFF` | `#0B1220` | `--color-on-accent` |
| Background | `#F8FAFC` | `#0B1220` | `--color-background` |
| Surface / Card | `#FFFFFF` | `#141B2D` | `--color-card` |
| Sunken | `#EEF2F7` | `#070C16` | `--color-sunken` |
| Foreground | `#0F172A` | `#E9EEF6` | `--color-foreground` |
| Muted foreground | `#5A6980` | `#94A3B8` | `--color-muted-foreground` |
| Border | `#D6DEE9` | `#26314A` | `--color-border` |

Status colours stay reserved and are never reused for a data series.
Chart series colours are validated separately against each surface.

### Typography

**Verified match:** "Dashboard Data" pairing (`--domain typography`), chosen for
dashboards, analytics and admin panels.

| Role | Family | Notes |
|------|--------|-------|
| UI and body | **Fira Sans** | Humanist, holds up at 12–14px, which is where a dense product lives |
| Figures, codes, IDs | **Fira Code** | Tabular numerals for tables and metrics |
| Arabic | IBM Plex Sans Arabic | Fallback in the same stack, so Arabic is ready from day one |

Base 16px on marketing surfaces, 13–14px in the application. Line-height 1.5 for
prose, 1.35 in dense tables.

### Spacing Variables

*Density: 8/10 — Dense / Dashboard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `2px` / `0.125rem` | Tight gaps |
| `--space-sm` | `4px` / `0.25rem` | Icon gaps, inline spacing |
| `--space-md` | `8px` / `0.5rem` | Standard padding |
| `--space-lg` | `12px` / `0.75rem` | Section padding |
| `--space-xl` | `16px` / `1rem` | Large gaps |
| `--space-2xl` | `24px` / `1.5rem` | Section margins |
| `--space-3xl` | `32px` / `2rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #22C55E;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #1E293B;
  border: 2px solid #1E293B;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #0F172A;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #1E293B;
  outline: none;
  box-shadow: 0 0 0 3px #1E293B20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Glassmorphism

**Keywords:** Frosted glass, transparent, blurred background, layered, vibrant background, light source, depth, multi-layer

**Best For:** Modern SaaS, financial dashboards, high-end corporate, lifestyle apps, modal overlays, navigation

**Key Effects:** Backdrop blur (10-20px), subtle border (1px solid rgba white 0.2), light reflection, Z-depth

### Page Pattern

**Pattern Name:** Real-Time / Operations Landing

- **Conversion Strategy:** Offer a demo or sandbox and show trust signals. Label telemetry as live only when backed by a current source, with update time and stale state. Provide pause/hide or update-frequency controls for tickers and previews, stop offscreen/hidden work, support keyboard controls, and render a static final snapshot under reduced motion.
- **CTA Placement:** Primary CTA in nav + After metrics
- **Section Order:** Hero (product + live preview or status) > Key metrics/indicators > How it works > CTA (Start trial / Contact)

---

## Motion

Dial: 2/10, subtle only.

The generated system attached a GSAP scroll-reveal preset. That is **not used**:
the project owner explicitly ruled out fade-in on scroll. No animation library is
installed and none is needed.

- Transitions: 150ms on colour and border only.
- Hover is a change of surface, never an opacity fade.
- `prefers-reduced-motion` disables the remaining transitions.

## Anti-Patterns (Do NOT Use)

- ❌ Slow updates
- ❌ No automation

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

---

## Project constraints (from the owner, binding)

These override any generated recommendation.

**Never use:** purple-to-blue gradients · gradient hero text · emojis in headings ·
Inter as the everywhere font · coloured border cards · glassmorphism · low-contrast
dark mode · three icon boxes in a row · a badge above the headline · untouched shadcn
defaults · fade-in on scroll · cursor-following beams · buttons that fade on hover ·
inconsistent spacing · em dashes throughout the copy · generic buzzword copy · serif
italic accents · Space Grotesk with Instrument Serif.

**Always:** every figure carries its data-classification label; a value with no source
is shown as missing, never filled in; demo records are marked; no fake live readings.
