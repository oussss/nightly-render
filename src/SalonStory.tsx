// "Comment réserver chez <salon>": one 9:16 story per salon (Oct 2026), 60 fps.
// 1. The salon's Instagram profile (built from its real name, photo, handle and city):
//    the finger taps the link in bio, the page slides up.
// 2. A real screen recording of the salon's own booking page (scripts/nightly.mjs:
//    salon.json + photos, record.mjs → frames filmed at half speed, tomp4.py
//    → screen.mp4 60 fps + events.json; the booking request is caught, nothing is saved).
//    Site address and brand name come from salon.json (SITE_HOST / BRAND_NAME secrets).
// 3. A white end card with the salon's photo and link.
// Look: lilac grid paper, mono kickers, Outfit headlines with a serif
// accent word. Text follows the salon's page language (fr / ar). No voice.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { EASE_IN, EASE_IO, INK, LILAC, MUTED, VIOLET, k, mono, pop, r, sans } from "./theme";
import { KW, Kicker, Phone } from "./ui";

const cairo = loadCairo("normal", { weights: ["600", "700", "800"], subsets: ["arabic", "latin"] }).fontFamily;
// Instagram's screen: Inter, so it looks the same on the Linux machines that render at night.
const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;

export const STORY_FPS = 60;
const S = (s: number) => Math.round(s * STORY_FPS);

type Ev = { type: "tap" | "mark"; name?: string; label?: string; t: number; x?: number; y?: number };
type Salon = { name: string; slug: string; site: string; brand: string; lang: "fr" | "ar"; ig: string; city: string; avatar: string | null; cover: string | null; photos: string[] };
// openSfx: the sound when the booking page slides up; music: base music volume (end card +60%).
// fps: output frame rate (60 for the showcase render, 30 for the app). Animations run on a
// 60 fps "logical" clock either way, so they look the same at any output rate.
export type SalonStoryProps = { dir: string; salon?: Salon; events: Ev[]; openSfx?: string; openVol?: number; music?: number; fps?: number };

const IG_TAP = 2.0; // the finger taps the link in bio
const REC = IG_TAP + 0.12; // the booking page (recording) starts sliding up here
const TAP_LEAD = 0.38; // record.mjs moves the finger 0.38 s before each click
const END_HOLD = 3.8;
const endAt = (events: Ev[]) => REC + (events.find((e) => e.name === "end")?.t ?? 20) - 0.6;

export const calcSalonStory: CalculateMetadataFunction<SalonStoryProps> = async ({ props }) => {
  const events: Ev[] = props.events.length ? props.events : await fetch(staticFile(`${props.dir}/events.json`)).then((x) => x.json());
  const salon: Salon = props.salon ?? (await fetch(staticFile(`${props.dir}/salon.json`)).then((x) => x.json()));
  const fps = props.fps ?? STORY_FPS;
  return { fps, durationInFrames: Math.round((endAt(events) + END_HOLD) * fps), props: { ...props, events, salon } };
};

/* ───────────── words (fr / ar) ───────────── */
type Head = { kicker: string; l1: string; l2: [string, string] };
const TEXT = {
  fr: {
    top: "// comment réserver",
    heads: (s: Salon): Record<string, Head> => ({
      ig: { kicker: `// instagram · @${s.ig}`, l1: "Réserver chez", l2: ["", `${s.name} ?`] },
      page: { kicker: `// ${s.site}/${s.slug}`, l1: "Le lien de", l2: ["notre", "bio."] },
      service: { kicker: "// étape 1 sur 3", l1: "Choisissez", l2: ["votre", "prestation."] },
      time: { kicker: "// étape 2 sur 3", l1: "Le jour,", l2: ["puis l'", "heure."] },
      details: { kicker: "// étape 3 sur 3", l1: "Votre nom,", l2: ["votre", "numéro."] },
      confirm: { kicker: "// demande envoyée ✓", l1: "Et voilà.", l2: ["On vous", "confirme."] },
    }),
    bio: ["Salon de beauté", "Réservez en ligne 👇"],
    stats: ["publications", "followers", "suivi(e)s"],
    follow: ["Suivre", "Message", "Contacter"],
    end: ["Réservez", "en", "30 secondes."],
    endCta: "👆 Lien dans notre bio",
    foot: "réservation en ligne · ",
  },
  ar: {
    top: "// طريقة الحجز",
    heads: (s: Salon): Record<string, Head> => ({
      ig: { kicker: `// instagram · @${s.ig}`, l1: "احجز عند", l2: ["", `${s.name}؟`] },
      page: { kicker: `// ${s.site}/${s.slug}`, l1: "الرابط", l2: ["الموجود في", "البيو."] },
      service: { kicker: "// الخطوة 1 من 3", l1: "اختر", l2: ["", "الخدمة."] },
      time: { kicker: "// الخطوة 2 من 3", l1: "اختر اليوم،", l2: ["ثم", "الوقت."] },
      details: { kicker: "// الخطوة 3 من 3", l1: "اسمك", l2: ["و", "رقم هاتفك."] },
      confirm: { kicker: "// تم إرسال الطلب ✓", l1: "هذا كل شيء.", l2: ["", "سنؤكد لك قريباً."] },
    }),
    bio: ["صالون تجميل", "احجز أونلاين 👇"],
    stats: ["منشورات", "متابِعون", "متابَعون"],
    follow: ["متابعة", "رسالة", "تواصل"],
    end: ["احجز", "في", "30 ثانية."],
    endCta: "👆 الرابط في البيو",
    foot: "حجز أونلاين · ",
  },
} as const;

/* ───────────── layout ───────────── */
const GRID = "linear-gradient(rgba(111,92,236,.07) 2px, transparent 2px), linear-gradient(90deg, rgba(111,92,236,.07) 2px, transparent 2px)";
const PW = 600;
const PX = (1080 - PW) / 2;
const PY = 520;

/* ───────────── the salon's Instagram profile (390 × 844 phone coordinates) ───────────── */
const IG_FONT_STACK = "-apple-system, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const LINK_Y = 262; // the link line in the bio
const LINK_X = 120;

const IGProfileScreen: React.FC<{ f: number; s: Salon; dir: string }> = ({ f, s, dir }) => {
  // Instagram's own screen stays in French for every salon (owner's choice, 27 Oct 2026).
  const T = TEXT.fr;
  const src = (name: string | null) => (name ? staticFile(`${dir}/${name}`) : null);
  const tiles = [s.cover, ...s.photos].filter(Boolean) as string[];
  const press = f >= S(IG_TAP) && f < S(IG_TAP) + 14;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", fontFamily: `${inter}, ${IG_FONT_STACK}, ${cairo}`, color: "#000", direction: "ltr" }}>
      {/* top bar */}
      <div style={{ position: "absolute", top: 54, left: 0, right: 0, height: 44, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, direction: "ltr" }}>
        <span style={{ fontSize: 30, lineHeight: 1, marginTop: -4 }}>‹</span>
        <span style={{ fontWeight: 700, fontSize: 17, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.ig}</span>
        <span style={{ fontSize: 20, letterSpacing: 2 }}>···</span>
      </div>
      {/* avatar + stats */}
      <div style={{ position: "absolute", top: 104, left: 16, right: 16, display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ width: 88, height: 88, borderRadius: 99, padding: 3, background: "linear-gradient(45deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5)", flexShrink: 0 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 99, background: "#fff", padding: 3 }}>
            {src(s.avatar) ? <Img src={src(s.avatar)!} style={{ width: "100%", height: "100%", borderRadius: 99, objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", borderRadius: 99, background: VIOLET, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 34 }}>{s.name.slice(0, 1).toUpperCase()}</div>}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {T.stats.map((label) => (
              <div key={label} style={{ fontSize: 13 }}>
                {/* real counts aren't known: shown softly blurred */}
                <div style={{ fontWeight: 700, fontSize: 16, filter: "blur(4px)" }}>1 234</div>
                <div>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* bio */}
      <div style={{ position: "absolute", top: 206, left: 16, right: 16, fontSize: 14, lineHeight: "19px" }}>
        <div style={{ color: "#737373" }}>{T.bio[0]}{s.city ? ` · 📍 ${s.city}` : ""}</div>
        <div>{T.bio[1]}</div>
        <div style={{ color: "#00376B", fontWeight: 600, marginTop: 3, display: "inline-block", padding: "1px 4px", marginInlineStart: -4, borderRadius: 6, background: press ? "rgba(0,55,107,.12)" : "transparent", direction: "ltr" }}>🔗 {s.site}/{s.slug}</div>
      </div>
      {/* buttons */}
      <div style={{ position: "absolute", top: 300, left: 16, right: 16, display: "flex", gap: 6 }}>
        {T.follow.map((b, i) => (
          <div key={b} style={{ flex: 1, background: i === 0 ? "#0095F6" : "#EFEFEF", color: i === 0 ? "#fff" : "#000", borderRadius: 8, textAlign: "center", padding: "7px 0", fontWeight: 600, fontSize: 14 }}>{b}</div>
        ))}
      </div>
      {/* highlights */}
      <div style={{ position: "absolute", top: 352, left: 16, right: 16, display: "flex", gap: 16 }}>
        {[0, 1, 2, 3].map((i) => {
          const im = tiles.length ? tiles[i % tiles.length] : null;
          return (
            <div key={i} style={{ width: 64, height: 64, borderRadius: 99, border: "1.5px solid #DBDBDB", padding: 3 }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 99, overflow: "hidden", background: ["#F4F2FB", "#FDE7EE", "#FFF3D6", "#E9E6F7"][i] }}>
                {im && <Img src={src(im)!} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${20 + i * 25}% 50%` }} />}
              </div>
            </div>
          );
        })}
      </div>
      {/* tabs + grid */}
      <div style={{ position: "absolute", top: 440, left: 0, right: 0, display: "flex", borderBottom: "1px solid #DBDBDB" }}>
        {["▦", "▶", "◎"].map((t, i) => <div key={t} style={{ flex: 1, textAlign: "center", fontSize: 20, padding: "8px 0", borderBottom: i === 0 ? "1.5px solid #000" : "none", color: i === 0 ? "#000" : "#8e8e8e" }}>{t}</div>)}
      </div>
      <div style={{ position: "absolute", top: 482, left: 0, right: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const im = tiles.length ? tiles[i % tiles.length] : null;
          return (
            <div key={i} style={{ height: 172, overflow: "hidden", background: ["#F4F2FB", "#FDE7EE", "#FFF3D6", "#E9E6F7", "#EAF6F0"][i % 5] }}>
              {im && <Img src={src(im)!} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${(i * 37) % 100}% ${(i * 53) % 100}%`, transform: `scale(${1 + (i % 3) * 0.35})` }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ───────────── headline ───────────── */
const Headline: React.FC<{ f: number; events: Ev[]; s: Salon; end: number }> = ({ f, events, s, end }) => {
  const heads = TEXT[s.lang].heads(s);
  const ar = s.lang === "ar";
  const list = [{ name: "ig", at: 0 }, ...events.filter((e) => e.type === "mark" && e.name && heads[e.name] && e.name !== "end").map((e) => ({ name: e.name!, at: REC + e.t + (e.name === "page" ? 0.35 : -0.2) }))];
  let cur = 0;
  list.forEach((m, i) => { if (f / STORY_FPS >= m.at) cur = i; });
  const h = heads[list[cur].name];
  const at = Math.max(6, S(list[cur].at));
  const nextAt = cur + 1 < list.length ? S(list[cur + 1].at) : S(end);
  const out = nextAt - 12;
  const accent = h.l2[1];
  const accSize = accent.length > 16 ? Math.max(62, 96 - (accent.length - 16) * 3) : 96;
  const font = ar ? cairo : undefined;
  return (
    <div key={list[cur].name} style={{ position: "absolute", left: 80, right: 70, top: 215, direction: ar ? "rtl" : "ltr" }}>
      <Kicker f={f} at={at} text={h.kicker} size={26} out={out} />
      <div style={{ marginTop: 10, whiteSpace: "nowrap" }}>
        {h.l1.split(" ").map((w, i) => <KW key={i} f={f} at={at + 4 + i * 5} size={ar ? 76 : 84} weight={ar ? 800 : 700} font={font} out={out}>{w}</KW>)}
      </div>
      <div style={{ marginTop: ar ? 0 : -8 }}>
        {h.l2[0] && h.l2[0].split(" ").map((w, i) => <KW key={i} f={f} at={at + 14 + i * 5} size={ar ? 64 : 72} weight={600} color={MUTED} font={font} out={out} gap={w.endsWith("'") ? 0 : 0.22}>{w}</KW>)}
        {ar ? (
          <KW f={f} at={at + 24} size={accSize * 0.85} weight={800} color={VIOLET} font={cairo} out={out}>{accent}</KW>
        ) : (
          <KW f={f} at={at + 24} size={accSize} accent out={out}>{accent}</KW>
        )}
      </div>
    </div>
  );
};

const TopBar: React.FC<{ f: number; end: number; s: Salon }> = ({ f, end, s }) => {
  const tc = (x: number) => { const sec = Math.floor(x / STORY_FPS); const fr = Math.floor((x % STORY_FPS) / 2); return `00:00:${String(sec).padStart(2, "0")}:${String(fr).padStart(2, "0")}`; };
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 150, display: "flex", justifyContent: "space-between", direction: s.lang === "ar" ? "rtl" : "ltr", fontFamily: s.lang === "ar" ? `${mono}, ${cairo}` : mono, fontSize: 24, color: MUTED, opacity: 1 - k(f, S(end) - 12, S(end)) }}>
      <span>{TEXT[s.lang].top}</span><span>{tc(f)}</span>
    </div>
  );
};

/* ───────────── end card ───────────── */
const EndCard: React.FC<{ f: number; dir: string; s: Salon; end: number }> = ({ f, dir, s, end }) => {
  const a = S(end);
  if (f < a - 4) return null;
  const T = TEXT[s.lang];
  const ar = s.lang === "ar";
  const wipe = k(f, a - 4, a + 28, EASE_IO);
  const bounce = Math.sin(((f - a) / STORY_FPS) * 6) * 7;
  const nameSize = s.name.length > 14 ? Math.max(70, 112 - (s.name.length - 14) * 3.5) : 112;
  const font = ar ? cairo : undefined;
  return (
    <AbsoluteFill style={{ fontFamily: ar ? cairo : sans, color: INK, alignItems: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 540 - 2600 * wipe, top: 1000 - 2600 * wipe, width: 5200 * wipe, height: 5200 * wipe, borderRadius: 9999, background: "#fff" }} />
      <AbsoluteFill style={{ opacity: k(f, a + 8, a + 28), backgroundImage: "linear-gradient(rgba(111,92,236,.05) 2px, transparent 2px), linear-gradient(90deg, rgba(111,92,236,.05) 2px, transparent 2px)", backgroundSize: "90px 90px" }} />
      <div style={{ position: "absolute", top: 300, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <div style={{ transform: `scale(${pop(f, a + 8, 11, 150)}) rotate(${(1 - pop(f, a + 8, 10, 120)) * -14}deg)`, width: 290, height: 290, borderRadius: 999, padding: 9, background: `conic-gradient(from 200deg, ${VIOLET}, #F59EB5, #FFD166, ${VIOLET})`, boxShadow: "0 30px 70px rgba(111,92,236,.30)" }}>
          {s.avatar ? (
            <Img src={staticFile(`${dir}/${s.avatar}`)} style={{ width: "100%", height: "100%", borderRadius: 999, objectFit: "cover", background: "#fff", border: "8px solid #fff" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: 999, border: "8px solid #fff", background: VIOLET, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 800, fontSize: 130 }}>{s.name.slice(0, 1).toUpperCase()}</div>
          )}
        </div>
        <div style={{ fontWeight: 800, fontSize: nameSize, letterSpacing: ar ? 0 : "-0.045em", textAlign: "center", lineHeight: 1.05, opacity: f >= a + 20 ? 1 : 0, transform: `translateY(${(1 - pop(f, a + 20, 13, 170)) * 60}px)` }}>{s.name}</div>
        <div style={{ textAlign: "center", lineHeight: 1.05, marginTop: -6, direction: ar ? "rtl" : "ltr" }}>
          <KW f={f} at={a + 32} size={ar ? 62 : 72} weight={600} color={MUTED} font={font}>{T.end[0]}</KW>
          <KW f={f} at={a + 38} size={ar ? 62 : 72} weight={600} color={MUTED} font={font}>{T.end[1]}</KW>
          {ar ? <KW f={f} at={a + 44} size={72} weight={800} color={VIOLET} font={cairo}>{T.end[2]}</KW> : <KW f={f} at={a + 44} size={86} accent>{T.end[2]}</KW>}
        </div>
      </div>
      <div style={{ position: "absolute", top: 1150, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ padding: "24px 52px", borderRadius: 99, background: VIOLET, color: "#fff", fontWeight: 700, fontSize: 46, boxShadow: "0 20px 50px rgba(111,92,236,.35)", transform: `scale(${pop(f, a + 56, 10, 180)}) translateY(${f > a + 80 ? bounce : 0}px)`, direction: ar ? "rtl" : "ltr" }}>
          {T.endCta}
        </div>
        <div style={{ fontFamily: mono, fontSize: 34, color: INK, opacity: k(f, a + 68, a + 92), letterSpacing: "0.01em" }}>{s.site}/{s.slug}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1560, textAlign: "center", fontFamily: ar ? cairo : mono, fontSize: 22, color: MUTED, opacity: k(f, a + 88, a + 120), letterSpacing: ar ? 0 : "0.04em" }}>
        {T.foot}{s.brand}
      </div>
    </AbsoluteFill>
  );
};


/* ───────────── one finger gliding from tap to tap (390 × 844 phone coordinates) ───────────── */
type Press = { t: number; x: number; y: number };
const easeIO = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const MOVE = 0.55; // longest glide between two taps (s)
const LEAVE_GAP = 1.8; // a longer wait: the finger slips out of view and comes back
const ARRIVE = 0.08; // lands just before the press
const offscreen = (p: Press) => ({ x: p.x + 70, y: Math.min(p.y + 320, 980) });

function fingerAt(time: number, presses: Press[]) {
  const enterFrom = (p: Press, dur: number) => {
    const a = offscreen(p);
    const k = easeIO(Math.min(1, Math.max(0, (time - (p.t - ARRIVE - dur)) / dur)));
    return { x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k, o: Math.min(1, k * 2.2) };
  };
  const leaveFrom = (p: Press, start: number, dur: number) => {
    const b = offscreen(p);
    const k = easeIO(Math.min(1, Math.max(0, (time - start) / dur)));
    return { x: p.x + (b.x - p.x) * k, y: p.y + (b.y - p.y) * k, o: 1 - Math.min(1, k * 1.6) };
  };
  if (!presses.length) return null;
  const first = presses[0];
  if (time < first.t - ARRIVE - 0.6) return null;
  if (time < first.t) return enterFrom(first, 0.6);
  for (let i = 0; i < presses.length; i++) {
    const p0 = presses[i];
    const p1 = presses[i + 1];
    if (p1 && time >= p1.t) continue;
    if (!p1) { // after the last tap: rest, then leave
      if (time < p0.t + 0.6) return { x: p0.x, y: p0.y, o: 1 };
      const r = leaveFrom(p0, p0.t + 0.6, 0.5);
      return r.o <= 0 ? null : r;
    }
    const gap = p1.t - p0.t;
    if (gap > LEAVE_GAP) {
      if (time < p0.t + 0.35) return { x: p0.x, y: p0.y, o: 1 };
      if (time < p0.t + 0.85) return leaveFrom(p0, p0.t + 0.35, 0.5);
      if (time < p1.t - ARRIVE - 0.55) return null;
      return enterFrom(p1, 0.55);
    }
    const travel = Math.min(MOVE, gap * 0.7);
    const start = p1.t - ARRIVE - travel;
    if (time < start) return { x: p0.x, y: p0.y, o: 1 };
    const k = easeIO(Math.min(1, (time - start) / travel));
    // a gentle arc rather than a straight line, like a real hand
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / len) * len * 0.14, cy = my + (dx / len) * len * 0.14;
    const x = (1 - k) * (1 - k) * p0.x + 2 * (1 - k) * k * cx + k * k * p1.x;
    const y = (1 - k) * (1 - k) * p0.y + 2 * (1 - k) * k * cy + k * k * p1.y;
    return { x, y, o: 1 };
  }
  return null;
}

const Finger: React.FC<{ f: number; presses: Press[] }> = ({ f, presses }) => {
  const time = f / STORY_FPS;
  const at = fingerAt(time, presses);
  // the press: a quick, soft dip in size
  const dip = presses.reduce((acc, p) => {
    const d = time - p.t;
    return d >= -0.04 && d < 0.24 ? Math.max(acc, Math.sin((Math.PI * (d + 0.04)) / 0.28)) : acc;
  }, 0);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: 844, pointerEvents: "none" }}>
      {presses.map((p, i) => {
        const d = time - p.t;
        if (d < 0 || d > 0.5) return null;
        const k = d / 0.5;
        return <div key={i} style={{ position: "absolute", left: p.x - 34, top: p.y - 34, width: 68, height: 68, borderRadius: 999, border: `3px solid ${VIOLET}`, background: "rgba(111,92,236,.12)", transform: `scale(${0.3 + easeIO(k) * 0.9})`, opacity: 1 - k }} />;
      })}
      {at && (
        <svg width={64} height={76} viewBox="0 0 32 38" style={{ position: "absolute", left: at.x - 13, top: at.y - 3, opacity: at.o, transform: `scale(${1 - 0.13 * dip}) rotate(-8deg)`, transformOrigin: "13px 3px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.25))" }}>
          <path d="M11 3.5c0-1.7 2.7-1.7 2.7 0v11.2l1.2-.2V11c0-1.6 2.6-1.6 2.6 0v3.6l1.2.1v-2.6c0-1.6 2.6-1.6 2.6 0v3l1.1.2v-1.8c0-1.6 2.6-1.6 2.6 0v8.1c0 5.2-3 9.3-8.4 9.3h-1.4c-3.2 0-5.1-1.5-6.9-4.1l-4.6-6.9c-.9-1.4 1-3 2.3-1.8L11 21z" fill="#fff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
};

/* ───────────── composition ───────────── */
export const SalonStory: React.FC<SalonStoryProps> = ({ dir, salon, events, openSfx = "k_maximize_004", openVol = 0.45, music = 0.09 }) => {
  const { fps } = useVideoConfig();
  // logical 60 fps frame (animations) and real-frame helper (Sequences, audio)
  const f = useCurrentFrame() * (STORY_FPS / fps);
  const R = (sec: number) => Math.round(sec * fps);
  if (!salon) return null;
  const s = salon;
  const t = f / STORY_FPS;
  const end = endAt(events);
  const taps = events.filter((e) => e.type === "tap");
  const typing = taps.filter((e) => e.label === "name" || e.label === "phone" || e.label === "instagram");

  // phone springs up at the start; slow push-in and a light handheld drift
  const enter = pop(f, 4, 13, 150);
  const outro = k(f, S(end) - 16, S(end) + 16, EASE_IN);
  const push = 1 + 0.035 * r(f, [0, S(end)], [0, 1], (x) => x);
  const dx = Math.sin(t * 1.1) * 4;
  const dy = Math.cos(t * 0.9) * 5;
  const rot = Math.sin(t * 0.7) * 0.35 + (1 - enter) * -5;
  // the booking page slides up over Instagram, like the in-app browser
  const sheet = k(f, S(REC), S(REC + 0.42), EASE_IO);
  // camera moves in on the bio and its link, then back out as the page opens
  const igZoom = k(f, S(0.45), S(1.35), EASE_IO) * (1 - k(f, S(REC + 0.05), S(REC + 0.6), EASE_IO));
  const ps = PW / 430;
  const zx = PX + (20 + LINK_X + 60) * ps;

  return (
    <AbsoluteFill style={{ background: LILAC, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: GRID, backgroundSize: "90px 90px" }} />
      <TopBar f={f} end={end} s={s} />
      <Headline f={f} events={events} s={s} end={end} />

      <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px, ${dy + Math.max(0, 1 - enter) * 1100 + outro * 200}px) rotate(${rot}deg) scale(${push * (1 - 0.2 * outro)})`, transformOrigin: "50% 60%", opacity: 1 - outro }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.4 * igZoom})`, transformOrigin: `${zx}px ${PY - 40}px` }}>
        <Phone w={PW} style={{ left: PX, top: PY }}>
          {f < S(REC + 0.5) && <IGProfileScreen f={f} s={s} dir={dir} />}
          <Sequence from={R(REC)} layout="none">
            <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: 844, transform: `translateY(${(1 - sheet) * 844}px)`, borderRadius: sheet < 1 ? "18px 18px 0 0" : 0, overflow: "hidden", boxShadow: sheet < 1 ? "0 -10px 30px rgba(0,0,0,.18)" : "none" }}>
              <OffthreadVideo src={staticFile(`${dir}/screen.mp4`)} muted style={{ width: 390, height: 844 }} />
            </div>
          </Sequence>
          <Finger f={f} presses={[{ t: IG_TAP, x: LINK_X, y: LINK_Y }, ...taps.map(e => ({ t: REC + e.t + TAP_LEAD, x: e.x! * 390, y: e.y! * 844 }))]} />
        </Phone>
        </div>
      </div>

      <EndCard f={f} dir={dir} s={s} end={end} />

      <Audio src={staticFile("music.wav")} volume={(x) => (x / fps >= end ? music * 1.6 : music)} />
      {[IG_TAP, ...taps.map((e) => REC + e.t + TAP_LEAD)].map((at, i) => (
        <Sequence key={`c${i}`} from={R(at)}>
          <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.45} />
        </Sequence>
      ))}
      <Sequence from={R(REC)}>
        <Audio src={staticFile(`sfx/${openSfx}.wav`)} volume={openVol} />
      </Sequence>
      {typing.map((e, i) => (
        <Sequence key={`t${i}`} from={R(REC + e.t + TAP_LEAD + 0.15)} durationInFrames={R(1.0)}>
          <Audio src={staticFile("sfx/typing.wav")} volume={0.25} />
        </Sequence>
      ))}
      {taps.filter((e) => e.label === "confirm").map((e, i) => (
        <Sequence key={`k${i}`} from={R(REC + e.t + TAP_LEAD + 0.6)}>
          <Audio src={staticFile("sfx/k_confirmation_002.wav")} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={R(end) - R(8 / STORY_FPS)}>
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.35} />
      </Sequence>
      <Sequence from={R(end) + R(50 / STORY_FPS)}>
        <Audio src={staticFile("sfx/sparkle.wav")} volume={0.4} />
      </Sequence>
    </AbsoluteFill>
  );
};
