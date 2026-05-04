"use client";

import { useEffect } from "react";
import { useBillbook } from "@/components/billbook-provider";
import type { BillbookState } from "@/lib/types";

/**
 * Applies theme tokens (CSS variables) to the document root.
 * Extracted from billbook-provider.tsx for maintainability.
 */
export function ThemeApplier() {
  const { state } = useBillbook();

  useEffect(() => {
    applyTheme(state.preferences.theme);
    document.documentElement.lang = state.preferences.language;
  }, [state.preferences.theme, state.preferences.language]);

  return null;
}

/** All theme token definitions. Each theme sets CSS variables on :root. */
const THEMES: Record<string, Partial<Record<string, string>>> = {
  fern: {
    background: "#f6f3ec",
    bgStart: "#faf8f4",
    bgEnd: "#f3f0e9",
    foreground: "#13231c",
    muted: "#66736c",
    surface: "rgba(255, 253, 249, 0.78)",
    surfaceStrong: "rgba(255, 253, 249, 0.94)",
    surfaceSoft: "rgba(255, 253, 249, 0.7)",
    surfaceSolid: "rgba(255, 253, 249, 0.98)",
    line: "rgba(19, 35, 28, 0.1)",
    accent: "#17806d",
    accentSoft: "rgba(23, 128, 109, 0.14)",
    glowA: "rgba(23, 128, 109, 0.12)",
    glowB: "rgba(221, 133, 86, 0.14)",
    shadow: "0px 4px 18px rgba(0,0,0,0.036), 0px 2px 8px rgba(0,0,0,0.024), 0px 0.8px 3px rgba(0,0,0,0.016)",
    shellShadow: "0px 14px 52px rgba(0,0,0,0.04), 0px 7px 28px rgba(0,0,0,0.028), 0px 3px 15px rgba(0,0,0,0.02), 0px 1px 7px rgba(0,0,0,0.014)",
    heroGlow: "rgba(23, 128, 109, 0.12)",
    warmGlow: "rgba(196, 137, 87, 0.12)",
    warning: "#b55f35",
    warningSoft: "rgba(181, 95, 53, 0.12)",
  },
  ember: {
    background: "#f7efe6",
    bgStart: "#fbf4ed",
    bgEnd: "#f2e8dc",
    foreground: "#2d1d18",
    muted: "#7c6a63",
    surface: "rgba(255, 250, 246, 0.8)",
    surfaceStrong: "rgba(255, 250, 246, 0.95)",
    surfaceSoft: "rgba(255, 250, 246, 0.72)",
    surfaceSolid: "rgba(255, 250, 246, 0.99)",
    line: "rgba(45, 29, 24, 0.1)",
    accent: "#cf6c4a",
    accentSoft: "rgba(207, 108, 74, 0.16)",
    glowA: "rgba(207, 108, 74, 0.14)",
    glowB: "rgba(199, 152, 70, 0.16)",
    shadow: "0px 4px 18px rgba(0,0,0,0.036), 0px 2px 8px rgba(0,0,0,0.024), 0px 0.8px 3px rgba(0,0,0,0.016)",
    shellShadow: "0px 14px 52px rgba(0,0,0,0.04), 0px 7px 28px rgba(0,0,0,0.028), 0px 3px 15px rgba(0,0,0,0.02), 0px 1px 7px rgba(0,0,0,0.014)",
    heroGlow: "rgba(207, 108, 74, 0.14)",
    warmGlow: "rgba(199, 152, 70, 0.16)",
    warning: "#b55f35",
    warningSoft: "rgba(181, 95, 53, 0.12)",
  },
  ocean: {
    background: "#eef4f8",
    bgStart: "#f4f8fb",
    bgEnd: "#e8eff5",
    foreground: "#102534",
    muted: "#617789",
    surface: "rgba(252, 254, 255, 0.78)",
    surfaceStrong: "rgba(252, 254, 255, 0.94)",
    surfaceSoft: "rgba(252, 254, 255, 0.68)",
    surfaceSolid: "rgba(252, 254, 255, 0.98)",
    line: "rgba(16, 37, 52, 0.1)",
    accent: "#3c6ca8",
    accentSoft: "rgba(60, 108, 168, 0.14)",
    glowA: "rgba(60, 108, 168, 0.14)",
    glowB: "rgba(73, 168, 180, 0.16)",
    shadow: "0px 4px 18px rgba(0,0,0,0.036), 0px 2px 8px rgba(0,0,0,0.024), 0px 0.8px 3px rgba(0,0,0,0.016)",
    shellShadow: "0px 14px 52px rgba(0,0,0,0.04), 0px 7px 28px rgba(0,0,0,0.028), 0px 3px 15px rgba(0,0,0,0.02), 0px 1px 7px rgba(0,0,0,0.014)",
    heroGlow: "rgba(60, 108, 168, 0.14)",
    warmGlow: "rgba(73, 168, 180, 0.16)",
    warning: "#b55f35",
    warningSoft: "rgba(181, 95, 53, 0.12)",
  },
  berry: {
    background: "#f7edf1",
    bgStart: "#fcf5f7",
    bgEnd: "#f0e2e8",
    foreground: "#351b27",
    muted: "#7f6571",
    surface: "rgba(255, 250, 252, 0.8)",
    surfaceStrong: "rgba(255, 250, 252, 0.95)",
    surfaceSoft: "rgba(255, 250, 252, 0.72)",
    surfaceSolid: "rgba(255, 250, 252, 0.99)",
    line: "rgba(53, 27, 39, 0.1)",
    accent: "#b24f7a",
    accentSoft: "rgba(178, 79, 122, 0.16)",
    glowA: "rgba(178, 79, 122, 0.14)",
    glowB: "rgba(215, 141, 171, 0.16)",
    shadow: "0px 4px 18px rgba(0,0,0,0.036), 0px 2px 8px rgba(0,0,0,0.024), 0px 0.8px 3px rgba(0,0,0,0.016)",
    shellShadow: "0px 14px 52px rgba(0,0,0,0.04), 0px 7px 28px rgba(0,0,0,0.028), 0px 3px 15px rgba(0,0,0,0.02), 0px 1px 7px rgba(0,0,0,0.014)",
    heroGlow: "rgba(178, 79, 122, 0.14)",
    warmGlow: "rgba(215, 141, 171, 0.16)",
    warning: "#b55f35",
    warningSoft: "rgba(181, 95, 53, 0.12)",
  },
};

/** CSS variable names mapped from camelCase theme token keys. */
const CSS_VAR_MAP: Record<string, string> = {
  background: "--background",
  bgStart: "--bg-start",
  bgEnd: "--bg-end",
  foreground: "--foreground",
  muted: "--muted",
  surface: "--surface",
  surfaceStrong: "--surface-strong",
  surfaceSoft: "--surface-soft",
  surfaceSolid: "--surface-solid",
  line: "--line",
  accent: "--accent",
  accentSoft: "--accent-soft",
  glowA: "--glow-a",
  glowB: "--glow-b",
  shadow: "--shadow",
  shellShadow: "--shell-shadow",
  heroGlow: "--hero-glow",
  warmGlow: "--warm-glow",
  warning: "--warning",
  warningSoft: "--warning-soft",
};

function applyTheme(theme: string) {
  if (typeof document === "undefined") return;
  const tokens = THEMES[theme];
  if (!tokens) return;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    const cssVar = CSS_VAR_MAP[key];
    if (cssVar && value) {
      root.style.setProperty(cssVar, value);
    }
  }
}
