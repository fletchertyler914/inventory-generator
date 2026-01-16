# CaseSpace Style Guide

## Overview

This style guide defines the visual design system, UI/UX patterns, and branding guidelines for CaseSpace. It ensures consistency across all components and future development.

## Design Philosophy

CaseSpace uses a **science-backed design system** focused on:
- **Perceptual uniformity**: Colors use OKLCH color space for consistent appearance
- **Accessibility**: WCAG AA compliant with colorblind-safe palettes
- **Comfort**: Warm tones, comfortable contrast, moderate saturation
- **Consistency**: Unified design tokens across all components
- **Performance**: Optimized for smooth interactions and fast rendering

## Color System

### Color Space: OKLCH

CaseSpace uses **OKLCH** (OK Lightness Chroma Hue) color space for:
- Perceptually uniform colors
- Better color manipulation
- Consistent appearance across devices
- Science-backed color relationships

### Color Tokens

All colors are defined as CSS custom properties in `src/index.css`.

#### Light Theme

```css
--background: oklch(0.97 0.005 85);        /* Warm off-white */
--foreground: oklch(0.25 0 0);            /* Near-black text */
--card: oklch(0.98 0.005 85);             /* Slightly lighter than background */
--primary: oklch(0.50 0.15 240);          /* Blue primary */
--secondary: oklch(0.55 0.10 220);        /* Purple secondary */
--muted: oklch(0.94 0.005 85);            /* Subtle gray */
--accent: oklch(0.94 0.01 85);            /* Hover states */
--destructive: oklch(0.55 0.18 25);       /* Red for errors */
--success: oklch(0.60 0.15 145);          /* Green for success */
--warning: oklch(0.75 0.12 85);           /* Yellow for warnings */
--info: oklch(0.60 0.12 220);             /* Blue for info */
--border: oklch(0.85 0.01 85);            /* Subtle borders */
```

#### Dark Theme

```css
--background: oklch(0.18 0.01 85);        /* Warm dark gray */
--foreground: oklch(0.92 0.005 85);       /* Near-white text */
--card: oklch(0.20 0.01 85);              /* Slightly lighter than background */
--primary: oklch(0.65 0.18 240);          /* Brighter blue */
--secondary: oklch(0.50 0.12 220);        /* Purple secondary */
--muted: oklch(0.22 0.01 85);             /* Subtle dark gray */
--accent: oklch(0.25 0.01 85);            /* Hover states */
--destructive: oklch(0.65 0.20 25);       /* Red for errors */
--success: oklch(0.70 0.18 145);          /* Green for success */
--warning: oklch(0.80 0.15 85);           /* Yellow for warnings */
--info: oklch(0.70 0.15 220);             /* Blue for info */
--border: oklch(0.35 0.01 85);            /* Subtle borders */
```

### Border Opacity

Borders use different opacity levels for light and dark themes:

- **Light theme**: `border-border/30` (30% opacity)
- **Dark theme**: `border-border/40` (40% opacity)

**Usage Pattern:**
```tsx
className="border border-border/30 dark:border-border/40"
```

### Semantic Colors

Use semantic color tokens instead of raw colors:

- ✅ `bg-primary` / `text-primary-foreground`
- ✅ `bg-destructive` / `text-destructive-foreground`
- ✅ `bg-success` / `text-success-foreground`
- ✅ `bg-warning` / `text-warning-foreground`
- ✅ `bg-info` / `text-info-foreground`
- ❌ Avoid: `bg-blue-500`, `text-red-600` (use semantic tokens)

## Typography

### Font Families

```css
--font-sans: Montserrat, sans-serif;      /* Light theme */
--font-sans: Inter, sans-serif;           /* Dark theme */
--font-serif: Georgia, serif;              /* Both themes */
--font-mono: Fira Code, monospace;         /* Both themes */
```

### Font Usage

- **Sans-serif** (Montserrat/Inter): Primary UI text, buttons, labels
- **Serif** (Georgia): Long-form content, notes, descriptions
- **Monospace** (Fira Code): Code, file paths, technical data

### Type Scale

```css
text-xs      /* 0.75rem / 12px */
text-sm      /* 0.875rem / 14px */
text-base    /* 1rem / 16px */
text-lg      /* 1.125rem / 18px */
text-xl      /* 1.25rem / 20px */
text-2xl     /* 1.5rem / 24px */
```

### Font Weights

- **Regular** (400): Body text
- **Medium** (500): Buttons, labels
- **Semibold** (600): Headings, emphasis
- **Bold** (700): Strong emphasis (rarely used)

### Line Height

- **Tight**: `leading-none` (1.0) - Headings
- **Normal**: `leading-normal` (1.5) - Body text
- **Relaxed**: `leading-relaxed` (1.75) - Long-form content

## Spacing

### Base Unit

Base spacing unit: `0.25rem` (4px)

### Spacing Scale

```css
p-1    /* 0.25rem / 4px */
p-2    /* 0.5rem / 8px */
p-3    /* 0.75rem / 12px */
p-4    /* 1rem / 16px */
p-6    /* 1.5rem / 24px */
p-8    /* 2rem / 32px */
```

### Common Patterns

- **Card padding**: `p-6` (24px)
- **Card header spacing**: `space-y-1.5` (6px)
- **Button padding**: `px-4 py-2` (16px horizontal, 8px vertical)
- **Input padding**: `px-3 py-1` (12px horizontal, 4px vertical)
- **Gap between elements**: `gap-2` (8px)

## Border Radius

### Base Radius

```css
--radius: 0.35rem;  /* ~5.6px */
```

### Radius Variants

```css
--radius-sm: calc(var(--radius) - 4px);   /* ~1.6px */
--radius-md: calc(var(--radius) - 2px);   /* ~3.6px */
--radius-lg: var(--radius);                /* ~5.6px */
--radius-xl: calc(var(--radius) + 4px);   /* ~9.6px */
```

### Usage

- **Buttons, inputs**: `rounded-md` (uses `--radius`)
- **Cards**: `rounded` (uses `--radius`)
- **Badges**: `rounded` (uses `--radius`)
- **Modals, popovers**: `rounded-md` (uses `--radius`)

## Shadows

### Shadow System

Shadows use a consistent system with subtle elevation:

```css
--shadow-xs: 0px 2px 0px 0px hsl(0 0% 20% / 0.07);
--shadow-sm: 0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 1px 2px -1px hsl(0 0% 20% / 0.15);
--shadow-md: 0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 2px 4px -1px hsl(0 0% 20% / 0.15);
--shadow-lg: 0px 2px 0px 0px hsl(0 0% 20% / 0.15), 0px 4px 6px -1px hsl(0 0% 20% / 0.15);
```

### Usage

- **Buttons (outline)**: `shadow-xs`
- **Cards**: No shadow (borders only)
- **Popovers, dropdowns**: `shadow-md`
- **Modals**: `shadow-lg`

## Components

### Buttons

#### Variants

```tsx
<Button variant="default">Primary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="secondary">Alternative</Button>
<Button variant="ghost">Subtle Action</Button>
<Button variant="link">Link Style</Button>
<Button variant="success">Success Action</Button>
<Button variant="warning">Warning Action</Button>
<Button variant="info">Info Action</Button>
```

#### Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

#### States

- **Default**: Base color
- **Hover**: 90% opacity (`hover:bg-primary/90`)
- **Active**: 80% opacity + scale down (`active:bg-primary/80 active:scale-[0.98]`)
- **Disabled**: 50% opacity (`disabled:opacity-50`)
- **Focus**: Ring with primary color (`focus-visible:ring-primary/30`)

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

**Styling:**
- Border: `border-border/30 dark:border-border/40`
- Background: `bg-card`
- Padding: `p-6` for header/content
- Border radius: `rounded` (uses `--radius`)

### Inputs

```tsx
<Input 
  type="text" 
  placeholder="Enter text..."
  className="w-full"
/>
```

**Styling:**
- Height: `h-9` (36px)
- Border: `border-border/30 dark:border-border/40`
- Focus: `focus-visible:border-primary/60 focus-visible:ring-primary/30`
- Invalid: `aria-invalid:border-destructive`

### Badges

```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>
```

**Styling:**
- Size: `text-xs` (12px)
- Padding: `px-2 py-0.5`
- Border radius: `rounded`

## Transitions & Animations

### Transition Duration

- **Fast**: `transition-all` (default ~150ms)
- **Smooth**: `duration-200` (200ms)
- **Deliberate**: `duration-300` (300ms)

### Common Transitions

```tsx
// Button hover
className="transition-all hover:bg-primary/90"

// Scale on active
className="active:scale-[0.98]"

// Fade in
className="animate-fade-in"  // 0.15s ease-out

// Slide in
className="animate-slide-in"  // 0.15s ease-out
```

### Animation Principles

- **Fast**: Most interactions should feel instant (<150ms)
- **Smooth**: Use ease-out for natural motion
- **Subtle**: Scale changes are minimal (0.98, not 0.9)
- **Purposeful**: Animations should enhance UX, not distract

## Icons

### Icon Library

CaseSpace uses **Lucide React** for icons.

### Icon Sizing

```tsx
// Default size (16px)
<Icon className="size-4" />

// Small (14px)
<Icon className="size-3.5" />

// Large (20px)
<Icon className="size-5" />
```

### Icon Usage in Buttons

Icons in buttons automatically size to `size-4` (16px) unless specified:

```tsx
<Button>
  <Icon />  {/* Automatically size-4 */}
  Label
</Button>
```

### Icon Spacing

- **With text**: `gap-2` (8px between icon and text)
- **Icon-only buttons**: No gap needed

## Layout Patterns

### Grid System

Use Tailwind's grid system:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>
```

### Flexbox Patterns

```tsx
// Horizontal layout
<div className="flex items-center gap-2">
  {/* Items */}
</div>

// Vertical layout
<div className="flex flex-col gap-4">
  {/* Items */}
</div>

// Space between
<div className="flex items-center justify-between">
  {/* Items */}
</div>
```

### Panel Layouts

Use `react-resizable-panels` for resizable layouts:

```tsx
<PanelGroup direction="horizontal">
  <Panel defaultSize={20}>
    {/* Left panel */}
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={60}>
    {/* Center panel */}
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={20}>
    {/* Right panel */}
  </Panel>
</PanelGroup>
```

## Accessibility

### Focus States

All interactive elements must have visible focus states:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
```

### ARIA Labels

Always provide ARIA labels for icon-only buttons:

```tsx
<Button aria-label="Close dialog">
  <X />
</Button>
```

### Color Contrast

All color combinations meet WCAG AA standards:
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons, checkboxes
- **Escape**: Close modals, dialogs
- **Arrow keys**: Navigate lists, menus

## Dark Mode

### Theme Switching

Use the `useTheme` hook:

```tsx
import { useTheme } from "@/hooks/useTheme"

const { theme, setTheme, resolvedTheme } = useTheme()
```

### Dark Mode Classes

Always provide dark mode variants:

```tsx
className="bg-background dark:bg-background text-foreground dark:text-foreground"
```

### Border Opacity in Dark Mode

Dark mode uses slightly higher border opacity:

```tsx
className="border-border/30 dark:border-border/40"
```

## Duplicate Color Palette

For duplicate file visualization, use the scientifically-designed palette:

```tsx
import { DUPLICATE_COLOR_PALETTE } from "@/lib/duplicate-color-palette"

// Colors are:
// - Perceptually uniform
// - Colorblind-safe
// - High contrast
// - Work in both light and dark modes
```

**Available colors**: Blue, Orange, Green, Purple, Pink, Teal, Amber, Rose

## Best Practices

### Do's ✅

- ✅ Use semantic color tokens (`bg-primary`, not `bg-blue-500`)
- ✅ Always provide dark mode variants
- ✅ Use consistent spacing scale
- ✅ Apply transitions to interactive elements
- ✅ Include focus states for accessibility
- ✅ Use appropriate border opacity (30% light, 40% dark)
- ✅ Follow component patterns from `src/components/ui/`

### Don'ts ❌

- ❌ Don't use raw color values (use tokens)
- ❌ Don't skip dark mode variants
- ❌ Don't use arbitrary spacing values
- ❌ Don't forget focus states
- ❌ Don't use hard-coded colors in components
- ❌ Don't mix design systems

## Component Examples

### Standard Button

```tsx
<Button variant="default" size="default">
  <Icon />
  Click Me
</Button>
```

### Card with Content

```tsx
<Card>
  <CardHeader>
    <CardTitle>Case Details</CardTitle>
    <CardDescription>View and edit case information</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Form Input

```tsx
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input 
    id="name" 
    placeholder="Enter name..."
    className="w-full"
  />
</div>
```

### Status Badge

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Error</Badge>
```

## Resources

- **Component Library**: `src/components/ui/`
- **Color Tokens**: `src/index.css`
- **Theme Hook**: `src/hooks/useTheme.ts`
- **Duplicate Colors**: `src/lib/duplicate-color-palette.ts`

## Updates

This style guide should be updated when:
- New design tokens are added
- Component patterns change
- Color system is updated
- New UI patterns are established

---

**Last Updated**: Production Launch
**Version**: 1.0
