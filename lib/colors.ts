// Mirrors the CSS custom properties in app/globals.css.
// Use these only where a raw value is required (canvas, WebGL, Framer Motion
// keyframes). In markup, prefer Tailwind utilities: bg-surface, text-orange, etc.

export const colors = {
  bg: "#0A0A0A",
  surface: "#141414",
  surface2: "#1E1E1E",
  border: "#2A2A2A",
  orange: "#FF6B00",
  orangeGlow: "#FF6B0033",
  white: "#FFFFFF",
  muted: "#888888",
  clutch: "#FF1A1A",
  clutchGlow: "#FF1A1A44",
} as const;

export type ColorToken = keyof typeof colors;

/** CSS var references, for places that accept a CSS value string. */
export const colorVars: Record<ColorToken, string> = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  surface2: "var(--color-surface-2)",
  border: "var(--color-border)",
  orange: "var(--color-orange)",
  orangeGlow: "var(--color-orange-glow)",
  white: "var(--color-white)",
  muted: "var(--color-muted)",
  clutch: "var(--color-clutch)",
  clutchGlow: "var(--color-clutch-glow)",
};
