import { Easing, interpolate, spring } from "remotion";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const FPS = 60;
export const W = 1920;
export const H = 1080;
/** 112.5 BPM: one beat = 32 frames, one bar = 128 frames. */
export const BEAT = 32;
export const BAR = 128;
export const bar = (b: number) => Math.round(b * BAR);
export const sec = (s: number) => Math.round(s * FPS);
export const TOTAL = bar(26);

export const sans = loadOutfit("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const serif = loadSerif("italic", { weights: ["400"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const serifUp = loadSerif("normal", { weights: ["400"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

// Palette (booking page "chapel" direction)
export const INK = "#16131F";
export const VIOLET = "#6F5CEC";
export const VIOLET_DEEP = "#4B3BC4";
export const LILAC = "#F4F2FB";
export const MIST = "#E9E6F7";
export const MUTED = "#6B6780";
export const GOLD = "#E9A23B";
export const PAPER = "#FFFFFF";
export const NIGHT = "#0E0B1F";
export const WA = "#25D366";
export const ROSE = "#FF7A9A";

export const EASE = Easing.bezier(0.16, 1, 0.3, 1); // expo-out
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);
export const EASE_IO = Easing.bezier(0.83, 0, 0.17, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Clamped interpolate with an easing (defaults to expo-out). */
export const r = (f: number, i: number[], o: number[], e: (t: number) => number = EASE) => interpolate(f, i, o, { ...clamp, easing: e });
/** 0→1 between two frames. */
export const k = (f: number, a: number, b: number, e: (t: number) => number = EASE) => r(f, [a, b], [0, 1], e);
export const pop = (f: number, at: number, damping = 12, stiffness = 170, mass = 1) =>
  f < at ? 0 : spring({ frame: f - at, fps: FPS, config: { damping, stiffness, mass } });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = <T extends Record<string, number>>(a: T, b: T, t: number): T => {
  const o: Record<string, number> = {};
  for (const key of Object.keys(a)) o[key] = lerp(a[key], (b as Record<string, number>)[key] ?? a[key], t);
  return o as T;
};

import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
export const hand = loadCaveat("normal", { weights: ["600", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const nunito = loadNunito("normal", { weights: ["800", "900"], subsets: ["latin"] }).fontFamily;
