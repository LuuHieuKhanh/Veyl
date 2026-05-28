---
name: Veyl
colors:
  surface: '#121317'
  surface-dim: '#121317'
  surface-bright: '#38393d'
  surface-container-lowest: '#0d0e12'
  surface-container-low: '#1a1b1f'
  surface-container: '#1e1f23'
  surface-container-high: '#292a2e'
  surface-container-highest: '#343539'
  on-surface: '#e3e2e7'
  on-surface-variant: '#cdc2d7'
  inverse-surface: '#e3e2e7'
  inverse-on-surface: '#2f3034'
  outline: '#968da0'
  outline-variant: '#4b4454'
  surface-tint: '#d6baff'
  primary: '#d6baff'
  on-primary: '#420089'
  primary-container: '#aa73ff'
  on-primary-container: '#3a0079'
  inverse-primary: '#7832d9'
  secondary: '#e6feff'
  on-secondary: '#003739'
  secondary-container: '#00f4fe'
  on-secondary-container: '#006c71'
  tertiary: '#c7c5d0'
  on-tertiary: '#303038'
  tertiary-container: '#918f9a'
  on-tertiary-container: '#292932'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ecdcff'
  primary-fixed-dim: '#d6baff'
  on-primary-fixed: '#280057'
  on-primary-fixed-variant: '#5f00c0'
  secondary-fixed: '#63f7ff'
  secondary-fixed-dim: '#00dce5'
  on-secondary-fixed: '#002021'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#e4e1ed'
  tertiary-fixed-dim: '#c7c5d0'
  on-tertiary-fixed: '#1b1b23'
  on-tertiary-fixed-variant: '#46464f'
  background: '#121317'
  on-background: '#e3e2e7'
  surface-variant: '#343539'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
  message-text:
    fontFamily: Hanken Grotesk
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is anchored in a philosophy of "Ephemeral Premium"—an aesthetic that balances the weightlessness of temporary communication with the gravity of absolute privacy. It targets a tech-literate, privacy-conscious audience that values speed and discretion without sacrificing visual delight.

The style is a sophisticated blend of **Glassmorphism** and **High-Contrast Dark UI**. It utilizes depth through translucent layering, vibrant radial blurs, and tactile grain textures to create a sense of digital "atmosphere." The interface should feel like a floating, luminous console suspended in a dark, infinite space, evoking feelings of security, modernity, and focus.

## Colors
The palette is dominated by deep, ink-like tones to ensure energy efficiency on OLED screens and maximum privacy in low-light environments. 

- **Primary (Vibrant Violet):** Used exclusively for high-priority actions, active message bubbles, and primary branding elements.
- **Secondary (Cyan/Emerald):** Reserved for "Active" or "Online" status indicators and subtle success feedback.
- **Surface Tones:** A mix of deep charcoals and semi-transparent layers. 
- **The Glow:** Strategic use of violet radial glows behind key cards or buttons to simulate a soft light source within the UI.

Avoid pure black (#000000) to prevent black-smear during scrolling; use the specified tertiary dark blue-gray instead.

## Typography
This design system utilizes **Hanken Grotesk** for its primary communication. It is a sharp, contemporary sans-serif that maintains high legibility even at low weights against dark backgrounds. 

For technical details—such as expiration timers, room IDs, and metadata—**JetBrains Mono** is employed to provide a "coded" and precise feel that reinforces the ephemeral, technical nature of the platform. Use high-contrast white (#FFFFFF) for primary text and muted grays (#8E8E93) for secondary information to establish a clear visual hierarchy.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a mobile-first priority. 

- **Mobile:** Single column with 20px side margins. Content cards should span the full width minus margins.
- **Desktop:** A centered 12-column layout (max-width: 1200px) with 24px gutters. Chat interfaces should be centered with wide "safe-area" gutters to maintain focus.
- **Spacing Rhythm:** Based on a 4px baseline. Use generous vertical padding (32px+) between major sections to emphasize the "lightweight" feel of the app.
- **Reflow:** On wider screens, the chat window maintains a fixed maximum width of 720px to prevent long line lengths that hinder readability.

## Elevation & Depth
Depth is achieved through **Glassmorphism** and backdrop filters rather than traditional shadows.

1.  **Level 0 (Background):** A deep violet-tinted gradient with a 2% noise texture overlay to prevent color banding.
2.  **Level 1 (Surface):** Semi-transparent dark surfaces (Background + 5% opacity white) with a 20px `backdrop-blur`.
3.  **Level 2 (Active Cards):** Same as Level 1 but with a 1px solid border at 10% white opacity.
4.  **Level 3 (Floating/Hover):** When an element is focused or hovered, apply a "Violet Inner Glow"—a 1px stroke using the primary violet at 40% opacity and a soft outer glow (`box-shadow: 0 0 20px rgba(157, 92, 255, 0.2)`).

Background lights (blobs) should be positioned randomly behind the main UI container, using extreme blurs (100px+) and low opacity (10%).

## Shapes
The shape language is organic and approachable. 
- **Standard Components:** 0.75rem (12px) for input fields and small buttons.
- **Cards & Chat Bubbles:** 1.5rem (24px) to 2rem (32px) for a "2xl/3xl" modern feel.
- **Message Alignment:** User messages have a sharp corner on the bottom right (2px), while received messages have a sharp corner on the bottom left to indicate the "origin" of the speech bubble.

## Components
- **Buttons:** Primary buttons use a solid Violet-to-Deep-Purple gradient. Secondary buttons use a "Glass" style with a 1px white-translucent border.
- **Chat Bubbles:** Sent messages are Vibrant Violet; received messages are a deep "Glass" surface.
- **Input Fields:** Floating glass style. On focus, the border transitions from muted gray to a glowing Violet. Use a monospaced font for the "Timer" countdown inside the input bar.
- **Chips/Status:** Use the Cyan/Emerald color for a tiny pulsing dot next to "Active" labels. For "Expiring" status, use a soft Red text with a subtle background tint.
- **Noise Overlay:** Apply a global, non-scrolling SVG noise filter at 3% opacity over all UI elements to give a tactile, "analog" feel to the digital privacy.
- **Navigation:** A bottom-docked glass bar for mobile, using iconography with 2pt stroke weights.