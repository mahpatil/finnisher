---
name: Momentum Engine
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9cbb8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849584'
  outline-variant: '#3b4b3c'
  surface-tint: '#00e471'
  primary: '#f0ffed'
  on-primary: '#003917'
  primary-container: '#00ff7f'
  on-primary-container: '#007134'
  inverse-primary: '#006d33'
  secondary: '#ffdb9d'
  on-secondary: '#412d00'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#fff9f8'
  on-tertiary: '#690004'
  tertiary-container: '#ffd4ce'
  on-tertiary-container: '#c21415'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#63ff93'
  primary-fixed-dim: '#00e471'
  on-primary-fixed: '#00210b'
  on-primary-fixed-variant: '#005224'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#930007'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.2'
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.2'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max-width: 1440px
  density: compact
---

## Brand & Style

The design system is engineered for high-velocity execution and cognitive focus. It targets developers and power users who prioritize output over ornamentation. The aesthetic is "Industrial Pro"—a synthesis of technical precision and modern interface fluidity.

The style leans heavily into **Minimalism** with a layer of **Glassmorphism** to provide depth without clutter. It uses high-contrast accents to draw immediate attention to completion states and "momentum" metrics. The interface should feel like a local-first terminal: instantaneous, reliable, and "close to the metal." Every element serves a functional purpose, utilizing subtle borders and raw typography to evoke the feeling of a sophisticated IDE or performance monitoring tool.

## Colors

The palette is optimized for a deep-dark environment to reduce eye strain during long execution sessions. 

- **Primary (Success Green):** A high-vibrancy "Neon Mint" used exclusively for momentum, completion, and positive velocity.
- **Secondary (Warning Amber):** Used for stalled tasks or items requiring attention.
- **Tertiary (Critical Red):** Reserved for blocked execution or high-priority failures.
- **Neutral:** A range of "Obsidian" grays. The base background is nearly black (`#0A0A0A`), with surfaces built from layered transparencies to maintain the glassmorphic depth.
- **High Contrast:** Text and borders utilize pure white or high-brightness grays to ensure legibility against the dark canvas.

## Typography

This design system employs a dual-font strategy to distinguish between UI navigation and data execution.

- **Inter (UI & Content):** Used for all primary interface labels, body text, and headings. It provides a clean, neutral foundation that feels modern and professional.
- **JetBrains Mono (Data & Metrics):** Used for all dynamic values, timestamps, status codes, and momentum trackers. The monospaced nature ensures that changing digits don't cause layout jitter and reinforces the developer-centric aesthetic.

**Scale Strategy:** We use a dense type scale. On mobile, `display-lg` is reduced to 32px (`display-lg-mobile`), while `body-md` remains the standard for legibility.

## Layout & Spacing

The layout philosophy is a **Fluid Grid** with a logic-driven 4px baseline. It is designed to maximize information density ("Data-to-Ink ratio") without sacrificing clarity.

- **Desktop:** 12-column grid with 16px gutters. Components should be docked to the grid to create a rigid, structured feel.
- **Density:** Use compact padding (8px or 12px) within components to allow more execution data to be visible on a single screen.
- **Breakpoints:** 
  - Mobile (<768px): Single column, 16px margins. 
  - Tablet (768px - 1024px): 8-column grid.
  - Desktop (>1024px): 12-column grid with a centered max-width container.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** and **Glassmorphism** rather than traditional drop shadows.

- **Surface Levels:** 
  - Level 0 (Base): `#0A0A0A`.
  - Level 1 (Cards/Containers): `#1A1A1A` with a 0.5px solid border (`#333333`).
  - Level 2 (Popovers/Modals): Backdrop blur (20px) with 60% opacity fill and a brighter stroke.
- **Borders:** Use subtle "Ghost Outlines" to define shapes. Instead of heavy shadows, use a 1px inner stroke with a slight gradient to simulate light hitting the edge of a high-tech hardware component.

## Shapes

The shape language is "Technical Soft." While the brand is industrial, pure sharp corners are avoided to keep the "pro tool" feeling modern and accessible.

- **Standard Radius:** 4px (`rounded-sm`). Used for buttons, input fields, and small cards.
- **Large Radius:** 8px (`rounded-lg`). Used for main layout containers or modal overlays.
- **Interactive States:** Use sharp, high-contrast focus rings (2px offset) to clearly indicate keyboard navigation, reinforcing the developer-centric nature of the tool.

## Components

- **Buttons:** Primary buttons use a solid "Success Green" background with black monospaced text for maximum contrast. Secondary buttons use ghost borders (1px) with white text.
- **Momentum Chips:** Small, monospaced indicators. Use a subtle pulse animation for "active" execution states.
- **Execution Lists:** Extremely dense. Use alternating row backgrounds (subtle 2% white overlay) and monospaced timestamps.
- **Input Fields:** Minimalist. Only a bottom border (1px) in the default state, turning into a full 1px border on focus using the Primary color.
- **Cards:** Utilize a "Glass" effect—15% opacity background with a 20px backdrop-filter. This allows background momentum visualizations to peak through the UI layers.
- **Progress Bars:** Thin (2px or 4px), using a "segment" style (divided into blocks) rather than a continuous line, mimicking terminal loading sequences.