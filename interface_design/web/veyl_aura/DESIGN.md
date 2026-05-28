---
name: Veyl Aura
colors:
  surface: '#131319'
  surface-dim: '#131319'
  surface-bright: '#39383f'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b21'
  surface-container: '#1f1f25'
  surface-container-high: '#2a2930'
  surface-container-highest: '#34343b'
  on-surface: '#e4e1ea'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e4e1ea'
  inverse-on-surface: '#303036'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#ddb8ff'
  on-secondary: '#490081'
  secondary-container: '#62259b'
  on-secondary-container: '#d1a1ff'
  tertiary: '#ffb784'
  on-tertiary: '#4f2500'
  tertiary-container: '#a15100'
  on-tertiary-container: '#ffe0cd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb8ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#62259b'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#131319'
  on-background: '#e4e1ea'
  surface-variant: '#34343b'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1200px
  gutter: 20px
---

## Brand & Style

The design system is built for an ephemeral, anonymous communication environment where privacy meets premium aesthetics. The style is a sophisticated blend of **Minimalism** and **Glassmorphism**, creating a sense of "digital smoke"—present yet passing. 

The UI should evoke a feeling of security through its dark, grounded palette, while the primary violet accents provide a sense of digital energy and focus. The interface relies on depth and translucency rather than heavy borders, ensuring the product feels lightweight and modern. A subtle noise texture is applied globally to the background to eliminate "banding" in gradients and add a tactile, cinematic quality to the dark surfaces.

## Colors

The palette is anchored in deep shadows to prioritize privacy and reduce eye strain in low-light environments.

- **Primary:** Deep Violet (#7C3AED) is used for active states, primary actions, and brand-defining glows. 
- **Secondary:** A lighter violet/lavender is used for accents and interactive feedback.
- **Background:** A deep, two-tone dark gradient creates an immersive void, enhanced by a 2% opacity monochromatic noise overlay.
- **Surface:** Surfaces use a high-refraction glass effect. Background blur (blur-xl) is mandatory for all surface layers to maintain legibility over the radial glows.
- **Typography Colors:** Use pure white (#FFFFFF) for high-importance headings. For body and secondary text, use a silver-gray (#94A3B8) to maintain hierarchy without overwhelming the user.

## Typography

This design system utilizes **Inter** exclusively to achieve a clean, utilitarian, and highly readable interface. The type scale is designed for high contrast against dark backgrounds.

- **Headings:** Utilize tighter letter-spacing and heavier weights to create a sense of authority and modernity.
- **Body:** Generous line-height is applied to ensure long-form chat messages remain readable and airy.
- **Labels:** Small caps or uppercase with increased tracking are used for metadata, timestamps, and status indicators to differentiate them from the conversational content.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model with generous safe areas to reinforce the "lightweight" feel. 

- **Grid:** A 12-column grid for desktop, 8-column for tablet, and 4-column for mobile.
- **Rhythm:** An 8px base unit (with 4px half-steps for micro-adjustments) governs all padding and margins. 
- **Floating Containers:** Primary content areas (chat windows, profile cards) should be centered with ample horizontal margins (minimum 24px on mobile) to maintain a "floating" appearance.
- **Chat Flow:** Vertical spacing between chat bubbles should be tight (8px) for same-user messages and wider (20px) for different users to visually group conversations.

## Elevation & Depth

Depth in the design system is achieved through **Glassmorphism** and light-based hierarchy rather than heavy drop shadows.

- **Layer 0 (Background):** The dark gradient with noise.
- **Layer 1 (Floating Cards):** Background blur (20px to 40px), 80% opacity surface color, and a 1px solid border (#262631) to define the edge.
- **Layer 2 (Modals/Popovers):** Higher blur (60px), a slightly brighter border (#3F3F46), and a very soft, large-radius violet glow shadow (0 20px 50px rgba(124, 58, 237, 0.15)).
- **Radial Glows:** Decorative violet blurs (300px - 500px radius) should be placed sporadically behind the glass layers to create a sense of "aura" and depth.

## Shapes

The shape language is organic and approachable, utilizing large corner radii to soften the technical feel of the dark UI.

- **Primary Radius:** 0.5rem (8px) for small elements like tags.
- **Component Radius:** 1.25rem (20px) for buttons and inputs, creating a semi-pill aesthetic.
- **Container Radius:** 1.5rem (24px) for cards and main chat windows.
- **Icons:** Use rounded-cap icons (line-weight 2px) to match the curvature of the UI components.

## Components

### Buttons
- **Primary:** Violet gradient background (from #7C3AED to #9333EA). Rounded 20px. On hover, add a subtle outer glow.
- **Secondary:** Transparent background with a 1.5px border (#262631). Rounded 20px. On hover, the border brightens to violet.

### Input Fields
- **Search/Chat Input:** Background #15151B (opaque) or glass-blured. Rounded 18px. 
- **Focus State:** 1.5px solid #7C3AED border with a faint inner glow.

### Cards & Surfaces
- **Chat Bubbles:** For the sender, use a solid Violet surface. For the receiver, use the glassmorphic surface. All cards must have the standard 24px corner radius.

### Chips & Status
- **Ephemeral Indicator:** A small, pulsing dot next to a "Time remaining" label. 
- **Status Chips:** Small, rounded (pill-shaped) with a subtle glass background and #94A3B8 text.

### Interactive Feedback
- **Motion:** Use "Spring" animations (stiffness: 300, damping: 30) for cards appearing and buttons being pressed. Transitions should feel fluid and elastic.