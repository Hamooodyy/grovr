/**
 * Organic Design System tokens for Grovr.
 *
 * All colors, spacing, radii, shadows and typography constants live here.
 * Every screen imports from this file — never use raw hex values.
 */

// ── Colors ──

export const colors = {
  bg: "#f5ead8",
  surface: "#ebddc5",
  text: "#201e1d",
  divider: "rgba(32, 30, 29, 0.16)",

  accent: {
    DEFAULT: "#c67139",
    100: "#fff2eb",
    200: "#ffe1d0",
    300: "#ffc6a5",
    400: "#f6a06b",
    500: "#d67f48",
    600: "#b2622d",
    700: "#8c491a",
    800: "#643312",
    900: "#402310",
  },

  accent2: {
    DEFAULT: "#7a8a5e",
    100: "#f0fae1",
    200: "#e1eecc",
    300: "#ccdbb2",
    400: "#aebf92",
    500: "#8fa073",
    600: "#728157",
    700: "#56633f",
    800: "#3d472b",
    900: "#272e1b",
  },

  neutral: {
    100: "#f9f4ed",
    200: "#eee7db",
    300: "#dcd3c4",
    400: "#c0b6a5",
    500: "#a19786",
    600: "#82796a",
    700: "#645c50",
    800: "#474238",
    900: "#2e2b25",
  },
} as const;

// ── Spacing (4.4px base, 1.1× density) ──

export const space = {
  1: 4.4,
  2: 8.8,
  3: 13.2,
  4: 17.6,
  6: 26.4,
  8: 35.2,
} as const;

// ── Border radii ──

export const radii = {
  sm: 8,
  md: 16,
  lg: 28,
  card: 32, // lg × 1.15
  pill: 999,
} as const;

// ── Shadows ──

export const shadows = {
  sm: {
    shadowColor: "#2e2b25",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#2e2b25",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: "#2e2b25",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 8,
  },
} as const;

// ── Typography ──

export const fonts = {
  heading: "Caprasimo_400Regular",
  body: "Figtree_400Regular",
  bodySemiBold: "Figtree_600SemiBold",
  bodyBold: "Figtree_700Bold",
} as const;

export const type = {
  h1: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 42, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 36, letterSpacing: -0.48 },
  h3: { fontFamily: fonts.heading, fontSize: 25, lineHeight: 28, letterSpacing: -0.38 },
  h4: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 22, letterSpacing: -0.3 },
  h5: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 18, letterSpacing: -0.24 },
  cardTitle: { fontFamily: fonts.heading, fontSize: 17, lineHeight: 19, letterSpacing: -0.26 },
  cardTitleLg: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 25, letterSpacing: -0.33 },
  cardTitleMd: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 21, letterSpacing: -0.29 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  bodySm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  secondary: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.96,
    textTransform: "uppercase" as const,
  },
  meta: { fontFamily: fonts.body, fontSize: 11, lineHeight: 14 },
  tabLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 13 },
} as const;

// ── Layout constants ──

export const layout = {
  screenGutter: 20,
  onboardingGutter: 24,
  tabBarHeight: 82, // 10 top + 52 content + 30 bottom (home indicator)
  minTapTarget: 44,
  optionRowHeight: 56,
  ctaHeight: 54,
} as const;
