// Options for the printable QR poster. Pure data, no screens, so it is easy
// to test and to extend (add a size or design here and the page picks it up).

// Sizes in millimetres. "s10" is a 10 cm square sticker/table card.
export const POSTER_SIZES = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  s10: { width: 100, height: 100 },
} as const;
export type PosterSize = keyof typeof POSTER_SIZES;
export const POSTER_SIZE_KEYS = Object.keys(POSTER_SIZES) as PosterSize[];

export const POSTER_DESIGNS = ["clean", "bold", "wallpaper", "dark"] as const;
export type PosterDesign = (typeof POSTER_DESIGNS)[number];

// Accent colours the owner can pick from.
export const POSTER_COLORS = [
  "#0071e3", // blue
  "#1d7f3a", // green
  "#e8590c", // orange
  "#c92a2a", // red
  "#7048e8", // purple
  "#1c1c1e", // black
] as const;
export type PosterColor = (typeof POSTER_COLORS)[number];

export const POSTER_LANGUAGES = ["both", "ar", "en"] as const;
export type PosterLanguage = (typeof POSTER_LANGUAGES)[number];

// The poster's own texts. They are NOT in messages/*.json because the poster
// language is chosen separately from the language of the screen: an owner
// using the English dashboard may still print an Arabic poster.
export const POSTER_TEXTS = {
  ar: {
    headline: "امسح الرمز لمتابعة طلبك",
    hint: "سيصدر هاتفك تنبيهاً عندما يصبح جاهزاً.",
  },
  en: {
    headline: "Scan to follow your order",
    hint: "Your phone alerts you when it's ready.",
  },
} as const;
