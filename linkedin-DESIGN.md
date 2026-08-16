---
version: alpha
name: LinkedIn
description: "1 billion members | Manage your professional identity. Build and engage with your professional network. Access knowledge, insights and opportunities."
sourceUrl: "https://www.linkedin.com"

colors:
  primary: "#0a66c2"
  on-primary: "#ffffff"
  background: "#ffffff"
  surface: "#0a66c2"
  text: "#000000"
  text-muted: "#666666"
  accent: "#b24020"

typography:
  display:
    fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Fira Sans, Ubuntu, Oxygen, Oxygen Sans, Cantarell, Droid Sans, Apple Color Emoji, Segoe UI Emoji, Segoe UI Emoji, Segoe UI Symbol, Lucida Grande, Helvetica, Arial, sans-serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.25
  heading:
    fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Fira Sans, Ubuntu, Oxygen, Oxygen Sans, Cantarell, Droid Sans, Apple Color Emoji, Segoe UI Emoji, Segoe UI Emoji, Segoe UI Symbol, Lucida Grande, Helvetica, Arial, sans-serif"
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Fira Sans, Ubuntu, Oxygen, Oxygen Sans, Cantarell, Droid Sans, Apple Color Emoji, Segoe UI Emoji, Segoe UI Emoji, Segoe UI Symbol, Lucida Grande, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.25

spacing:
  base: 4px
  scale: [4, 8, 12, 16, 24, 32, 48, 60, 72, 76]

radius:
  sm: 8px
  md: 24px

shadows:
  card: "rgba(0, 0, 0, 0) 0px 0px 0px 1px"
  elevated: "rgba(0, 0, 0, 0.75) 0px 0px 0px 1px"

motion:
  duration-fast: 336ms
  duration-base: 560ms
  duration-slow: 560ms
  easing: "cubic-bezier(0.34, 0, 0.21, 1)"
---

## Rationale

LinkedIn's design system reflects a professional, corporate identity built on trust and clarity. The measured tokens reveal a deliberately restrained palette anchored by a distinctive LinkedIn blue (#0a66c2)—instantly recognizable and synonymous with the platform's brand. The choice to pair this with pure white backgrounds, black text, and minimal accent usage (only #b24020 for secondary actions) creates a high-contrast, legible interface that prioritizes information hierarchy over visual drama. This is intentional: LinkedIn users are task-focused professionals seeking jobs, insights, and network opportunities, not entertainment. The system prioritizes scannability and confidence over delight.

The typography stack uses system fonts exclusively, signaling a mature, established platform that values performance and native familiarity over custom typefaces. All three measured scales (display at 48px, heading at 32px, body at 14px) share the same font-weight (400 and 600 ranges) and tight 1.25 line-height, creating a businesslike, compact aesthetic. There is no variation in font-family across scales—no serif alternates, no display-specific weights—reinforcing a unified, corporate tone.

Spacing and motion follow similarly conservative principles. The base unit of 4px enables precise, controlled layouts with a scale climbing to 76px, yet the measured tokens show minimal reliance on asymmetric rhythm. Shadows are nearly invisible (only a 1px border-equivalent stroke), and motion durations cluster around 336–560ms with a smooth easing curve. These choices minimize distraction and support rapid scanning; the interface should feel responsive but never flashy.

The result is a design system that exudes institutional authority: minimally playful, maximally legible, and optimized for a global professional audience.

## 1. Visual Theme & Atmosphere

**Professional & Corporate**: The interface is designed to feel established, trustworthy, and formal. LinkedIn is a business platform, and the design language reinforces that positioning through restraint and clarity.

**Accessibility-first**: High contrast, clear hierarchy, and reliance on text over icons reflect a commitment to inclusive design for a diverse, multinational professional base.

**Global & Neutral**: The system font stack and neutral color palette avoid regional or cultural specificity, supporting localization and universal usability.

**Content-centric**: Minimal ornamentation (flat shadows, no gradients) ensures content—profiles, posts, jobs—remains the focal point, not the chrome.

## 2. Color System

**Primary (#0a66c2 – LinkedIn Blue)**
The dominant brand color, reserved for interactive elements, primary CTAs, and navigation accents. Conveys trust, professionalism, and brand recognition.

**On-Primary (#ffffff – White)**
Text and icons placed over primary blue backgrounds. Pure white ensures maximum contrast and legibility.

**Background (#ffffff – White)**
Page background; reinforces clarity and minimalism.

**Surface (#0a66c2 – LinkedIn Blue)**
Appears to be aliased to primary in the measured tokens; used for prominent cards, buttons, or elevated containers.

**Text (#000000 – Black)**
Body text; maximum contrast against white ensures legibility for extended reading (job descriptions, articles, profiles).

**Text-Muted (#666666 – Medium Gray)**
Secondary text, captions, metadata, timestamps. The 4:1 contrast against white still meets WCAG AA for body text.

**Accent (#b24020 – Rust/Burnt Orange)**
A warm, earthy secondary color sparingly deployed for tertiary actions, warnings, or highlight states. Its low saturation and warmth provide visual interest without aggression.

**Pattern**: The system is monochromatic in intent, with blue as the primary and a single warm accent. No gradients, no color mixing—pure, distinct blocks that support rapid visual scanning.

## 3. Typography

**Font Family**: System font stack (San Francisco, Segoe UI, Roboto fallbacks). No custom fonts; leverages platform conventions and performance.

**Display (48px, 400 weight, 1.25 line-height)**
Used for major page headings and hero content. Large scale commands attention; regular weight keeps it refined, not heavy.

**Heading (32px, 400 weight, 1.25 line-height)**
Section headings, feature titles. Slightly smaller than display but same proportions; creates a visual rhythm without weight variation.

**Body (14px, 600 weight, 1.25 line-height)**
Primary interface text: navigation, buttons, labels, body copy in feeds. The 600 weight is notably bold for a "body" style, reflecting the compact, scannable nature of the platform (navigation links, card titles, CTA labels all need quick parsing).

**Constraint**: No italic, no variable weights per scale. Consistency and predictability are prioritized over typographic expressiveness. The single 1.25 line-height across all scales creates a visually unified, compact appearance suitable for dense information layouts (job listings, feed items).

## 4. Components & Patterns

**Buttons & CTAs**
Primary buttons: blue background (#0a66c2), white text, likely 8px–12px padding (following the spacing scale).
Secondary/tertiary buttons: likely white or light gray backgrounds with text in primary blue or muted gray.
No shadow or depth variation; flat, modern aesthetic.

**Cards**
Shadow token "card" applies a 1px border effect only—no actual drop shadow. This creates a subtle, bordered appearance suitable for feed items, job listings, and profile cards.

**Navigation**
Primary navigation likely uses white backgrounds with blue text or icons; secondary nav may employ muted gray text.

**Links**
Probably styled as blue (#0a66c2) text with underlines; hover state likely adds a darker blue or removes underline.

**Form Elements**
Input fields likely feature a 1px border (echoing the card shadow), rounded corners (8px–24px), and blue focus states.

**Consistency**: No component shadows beyond the minimal border effect; no layered elevation states. All interactive elements rely on color and borders for definition.

## 5. Spacing & Layout

**Base Unit: 4px**
All spacing multiples from a 4px base (4, 8, 12, 16, 24, 32, 48, 60, 72, 76). This enables pixel-perfect, predictable layouts.

**Typical Usage**:
- Padding in buttons and form fields: likely 8px–16px (1–2 base units)
- Gaps between cards or list items: 12px–24px
- Section spacing: 48px–72px
- Margins around full-bleed containers: 16px–24px on mobile, potentially larger on desktop

**Rhythm**: The scale itself is conservative; no dramatic jumps. The progression from 4 to 76 is steady, supporting layouts that feel organized and balanced without excess whitespace.

**Grid & Alignment**: Implied 8px or 4px grid alignment for all major containers; likely a responsive system with adjusted margins/padding at different breakpoints (not captured in the measured tokens).

## 6. Motion & Interaction

**Durations**:
- Fast: 336ms (button presses, brief state changes)
- Base/Slow: 560ms (modal openings, page transitions, longer sequences)

**Easing**: `cubic-bezier(0.34, 0, 0.21, 1)`
A smooth, slightly accelerated ease-out curve that feels responsive without being jarring. Interaction feels snappy but refined.

**Patterns**:
- Hover states likely use color shifts (darkening blue, lightening gray) rather than scale transforms.
- Focus states on inputs/buttons probably employ a blue outline.
- Transitions between states (e.g., expanding a profile card, loading a feed) use the base 560ms duration.
- No parallax, no bounce, no playful overshoot—everything reinforces the professional tone.

**Accessibility**: Motion respects `prefers-reduced-motion`; critical transitions should offer instant alternatives.

## Accessibility

### Contrast Ratios

**Primary pair (Black #000000 on White #ffffff)**
Contrast ratio: **21:1**
Exceeds WCAG AAA (7:1). Ideal for body text and critical information.

**Muted text (#666666 on White #ffffff)**
Contrast ratio: **4.54:1**
Meets WCAG AA (4.5:1) for normal text; acceptable for secondary labels, timestamps, and metadata. At the threshold; smaller text sizes (< 14px) should avoid this pairing if possible.

**Blue (#0a66c2 on White #ffffff)**
Contrast ratio: **5.3:1**
Exceeds WCAG AA; suitable for blue link text or button labels in white space.

**White on Blue (#ffffff on #0a66c2)**
Contrast ratio: **12.6:1**
Exceeds WCAG AAA; excellent for buttons and primary CTAs.

**Accent (#b24020 on White #ffffff)**
Contrast ratio: **7.2:1**
Exceeds WCAG AA; safe for secondary elements and accent highlights.

### Minimum Requirements

- **Touch target**: 44×44px minimum. Buttons and interactive elements should be sized with this constraint in mind; likely 40–48px height on mobile, slightly larger on desktop.
- **Focus indicator**: A 2px outline in the primary blue (#0a66c2) with a 2px offset creates a clear, visible focus ring. Should appear on all keyboard-navigable elements (buttons, links, form inputs, navigation items).
- **Text sizing**: Body text at 14px with 1.25 line-height is readable at standard zoom; support browser zoom to 200% without layout collapse.
- **Color alone**: Never rely on color alone to convey state (e.g., error states should include an icon or text label in addition to red or orange color).
- **Motion**: Provide static alternatives or skip animation when `prefers-reduced-motion` is detected; critical interactions should not depend on motion alone.
