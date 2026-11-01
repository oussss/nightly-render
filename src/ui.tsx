import React from "react";
import { random } from "remotion";
import { EASE, EASE_IN, INK, LILAC, MIST, MUTED, PAPER, VIOLET, WA, k, mono, pop, r, sans, serif } from "./theme";

/* ───────────────────────── type ───────────────────────── */

/**
 * A word that rises out of a mask. `accent` switches to the italic serif in
 * violet with a springy tilt — the showreel's signature pairing.
 */
export const KW: React.FC<{
  f: number;
  at: number;
  children: React.ReactNode;
  size: number;
  accent?: boolean;
  color?: string;
  weight?: number;
  out?: number; // frame to leave
  gap?: number;
  font?: string;
}> = ({ f, at, children, size, accent, color, weight = 700, out, gap = 0.22, font }) => {
  const s = pop(f, at, accent ? 11 : 15, accent ? 150 : 190);
  const o = out !== undefined ? k(f, out, out + 14, EASE_IN) : 0;
  const y = (1 - s) * size * 1.05 - o * size * 1.1;
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: size * 0.12, marginBottom: -size * 0.12, paddingRight: accent ? size * 0.08 : 0, marginRight: `${gap}em`, fontSize: size }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: font ?? (accent ? serif : sans),
          fontWeight: accent ? 400 : weight,
          fontSize: size * (accent ? 1.12 : 1),
          letterSpacing: accent ? "-0.01em" : "-0.045em",
          lineHeight: 1.04,
          color: color ?? (accent ? VIOLET : INK),
          transform: `translateY(${y}px) rotate(${accent ? (1 - s) * 9 : 0}deg)`,
          transformOrigin: "0% 100%",
          opacity: f < at ? 0 : 1,
        }}
      >
        {children}
      </span>
    </span>
  );
};

/** Mono kicker, typed on. */
export const Kicker: React.FC<{ f: number; at: number; text: string; color?: string; size?: number; out?: number }> = ({ f, at, text, color = MUTED, size = 22, out }) => {
  const n = Math.floor(Math.max(0, f - at) / 1.6);
  const o = out !== undefined ? 1 - k(f, out, out + 12) : 1;
  const shown = text.slice(0, n);
  const scramble = n < text.length && n > 0 ? String.fromCharCode(97 + Math.floor(random(`${text}${f}`) * 26)) : "";
  return (
    <div style={{ fontFamily: mono, fontSize: size, color, letterSpacing: "0.02em", opacity: o, whiteSpace: "pre" }}>
      {shown}
      {scramble}
    </div>
  );
};

/** Hand-drawn underline that draws itself on. */
export const Swash: React.FC<{ f: number; at: number; width: number; color?: string; stroke?: number; dur?: number }> = ({ f, at, width, color = VIOLET, stroke = 9, dur = 22 }) => {
  const t = k(f, at, at + dur, EASE);
  const d = `M 4 22 C ${width * 0.25} 8, ${width * 0.55} 6, ${width - 6} 14 C ${width * 0.7} 16, ${width * 0.4} 26, ${width * 0.18} 34`;
  return (
    <svg width={width} height={44} style={{ display: "block", overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
    </svg>
  );
};

/* ───────────────────────── surfaces ───────────────────────── */

export const Card: React.FC<{ label?: string; style?: React.CSSProperties; children?: React.ReactNode; dark?: boolean; labelRight?: React.ReactNode }> = ({ label, style, children, dark, labelRight }) => (
  <div
    style={{
      position: "absolute",
      background: dark ? "#1E1A2E" : PAPER,
      borderRadius: 30,
      boxShadow: dark ? "0 30px 60px rgba(0,0,0,.35)" : "0 1px 0 rgba(22,19,31,.04), 0 24px 60px rgba(40,30,90,.12), 0 0 0 1.5px rgba(22,19,31,.05)",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
    {label && (
      <div style={{ position: "absolute", left: 26, top: 22, right: 26, display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 17, color: dark ? "#8F8AA8" : MUTED }}>
        <span>{label}</span>
        {labelRight}
      </div>
    )}
  </div>
);

/** iPhone-ish frame. Content is laid out at 390 × 844 and scaled to `w`. */
export const Phone: React.FC<{ w: number; children?: React.ReactNode; style?: React.CSSProperties; screenBg?: string; time?: string; darkStatus?: boolean }> = ({ w, children, style, screenBg = PAPER, time = "9:41", darkStatus }) => {
  const s = w / 430;
  return (
    <div style={{ position: "absolute", width: 430 * s, height: 884 * s, ...style }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: "0 0", width: 430, height: 884 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 72, background: "#0F0D17", boxShadow: "0 50px 100px rgba(30,20,80,.28), inset 0 0 0 3px #2A2638" }} />
        <div style={{ position: "absolute", left: 20, top: 20, width: 390, height: 844, borderRadius: 54, overflow: "hidden", background: screenBg }}>
          {children}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", fontFamily: sans, fontWeight: 600, fontSize: 17, color: darkStatus ? "#fff" : INK }}>
            <span>{time}</span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <svg width="18" height="12" viewBox="0 0 18 12">
                {[0, 1, 2, 3].map((i) => (
                  <rect key={i} x={i * 4.6} y={9 - i * 3} width={3.4} height={3 + i * 3} rx={1} fill={darkStatus ? "#fff" : INK} />
                ))}
              </svg>
              <svg width="26" height="13" viewBox="0 0 26 13">
                <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke={darkStatus ? "#fff" : INK} opacity={0.5} />
                <rect x="2.5" y="2.5" width="16" height="8" rx="2" fill={darkStatus ? "#fff" : INK} />
              </svg>
            </span>
          </div>
          <div style={{ position: "absolute", left: 140, top: 12, width: 110, height: 32, borderRadius: 20, background: "#000" }} />
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── marks & icons ───────────────────────── */

export const Check: React.FC<{ size?: number; color?: string; stroke?: string; t?: number }> = ({ size = 34, color = VIOLET, stroke = "#fff", t = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" style={{ display: "block" }}>
    <circle cx={17} cy={17} r={17 * Math.min(1, t * 1.4)} fill={color} />
    <path d="M 10 17.5 L 15 22 L 24 12" fill="none" stroke={stroke} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.max(0, Math.min(1, (t - 0.3) / 0.7))} />
  </svg>
);

export const IconInstagram: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <defs>
      <radialGradient id="igg" cx="0.3" cy="1.05" r="1.25">
        <stop offset="0" stopColor="#FFD776" />
        <stop offset="0.25" stopColor="#F9A03F" />
        <stop offset="0.5" stopColor="#E23B7A" />
        <stop offset="0.8" stopColor="#8E3BD8" />
        <stop offset="1" stopColor="#5B51D8" />
      </radialGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#igg)" />
    <rect x="15" y="15" width="34" height="34" rx="10" fill="none" stroke="#fff" strokeWidth="4.5" />
    <circle cx="32" cy="32" r="8.5" fill="none" stroke="#fff" strokeWidth="4.5" />
    <circle cx="42.5" cy="21.5" r="2.8" fill="#fff" />
  </svg>
);

export const IconWhatsApp: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill={WA} />
    <path d="M32 14c-10 0-18 8-18 18 0 3.3.9 6.4 2.5 9.1L14 50l9.2-2.4c2.6 1.4 5.6 2.3 8.8 2.3 10 0 18-8 18-18s-8-17.9-18-17.9z" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinejoin="round" />
    <path d="M25.5 24.5c.6-1.2 1.6-1.3 2.2-.2l1.8 3.3c.4.8.2 1.6-.5 2.2l-1 .9c1.3 2.6 3.3 4.6 5.9 5.9l.9-1c.6-.7 1.4-.9 2.2-.5l3.3 1.8c1.1.6 1 1.6-.2 2.2-1.7.9-3.8 1-6.2-.2-4.1-2-7.2-5.1-9.2-9.2-1.2-2.4-1.1-4.5-.2-6.2z" fill="#fff" />
  </svg>
);

export const IconTikTok: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#111" />
    <path d="M36 14v24.5a7.5 7.5 0 1 1-7.5-7.5" fill="none" stroke="#25F4EE" strokeWidth="5" transform="translate(-1.5 -1)" strokeLinecap="round" />
    <path d="M36 14v24.5a7.5 7.5 0 1 1-7.5-7.5" fill="none" stroke="#FE2C55" strokeWidth="5" transform="translate(1.5 1)" strokeLinecap="round" />
    <path d="M36 14v24.5a7.5 7.5 0 1 1-7.5-7.5M36 14c1 5 4.5 8.5 10 9" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export const IconFacebook: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#1877F2" />
    <path d="M35 52V35h6l1-7h-7v-4.5c0-2 .8-3.5 3.6-3.5H42v-6.2c-.7-.1-2.9-.3-5.3-.3-5.3 0-8.7 3.2-8.7 9V28h-6v7h6v17z" fill="#fff" />
  </svg>
);

export const IconPin: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="#fff" stroke={MIST} strokeWidth="2" />
    <path d="M32 12c-8 0-14 6-14 14 0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z" fill="#EA4335" />
    <circle cx="32" cy="26" r="5.5" fill="#fff" />
  </svg>
);

export const IconQR: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill={INK} />
    {[
      [14, 14],
      [36, 14],
      [14, 36],
    ].map(([x, y], i) => (
      <g key={i}>
        <rect x={x} y={y} width="14" height="14" rx="2" fill="none" stroke="#fff" strokeWidth="3" />
        <rect x={x + 4.5} y={y + 4.5} width="5" height="5" fill="#fff" />
      </g>
    ))}
    {[
      [38, 38],
      [45, 38],
      [38, 45],
      [45, 45],
      [42, 42],
    ].map(([x, y], i) => (
      <rect key={i} x={x} y={y} width="4" height="4" fill="#fff" />
    ))}
  </svg>
);

export const IconCalendar: React.FC<{ size: number; color?: string }> = ({ size, color = VIOLET }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const Star: React.FC<{ size: number; color?: string }> = ({ size, color = "#E9A23B" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2 6.1 20.4l1.3-6.5L2.5 9.3l6.6-.8z" fill={color} />
  </svg>
);

/** Pointer hand cursor with a press + ripple at `press`. */
export const Tap: React.FC<{ f: number; x: number; y: number; press: number; from?: [number, number]; arrive?: number; color?: string }> = ({ f, x, y, press, from = [300, 500], arrive = 18, color = INK }) => {
  const t = k(f, press - arrive, press - 2, EASE);
  const cx = x + from[0] * (1 - t);
  const cy = y + from[1] * (1 - t);
  const down = f >= press && f < press + 8 ? 0.82 : 1;
  const rip = k(f, press, press + 22);
  const vis = f >= press - arrive ? 1 - k(f, press + 30, press + 42) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: vis, pointerEvents: "none" }}>
      {f >= press && (
        <div
          style={{
            position: "absolute",
            left: x - 60,
            top: y - 60,
            width: 120,
            height: 120,
            borderRadius: 999,
            border: `4px solid ${VIOLET}`,
            transform: `scale(${0.2 + rip * 0.9})`,
            opacity: 1 - rip,
          }}
        />
      )}
      <svg width={64} height={76} viewBox="0 0 32 38" style={{ position: "absolute", left: cx - 13, top: cy - 3, transform: `scale(${down}) rotate(-8deg)`, transformOrigin: "13px 3px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.25))" }}>
        <path
          d="M11 3.5c0-1.7 2.7-1.7 2.7 0v11.2l1.2-.2V11c0-1.6 2.6-1.6 2.6 0v3.6l1.2.1v-2.6c0-1.6 2.6-1.6 2.6 0v3l1.1.2v-1.8c0-1.6 2.6-1.6 2.6 0v8.1c0 5.2-3 9.3-8.4 9.3h-1.4c-3.2 0-5.1-1.5-6.9-4.1l-4.6-6.9c-.9-1.4 1-3 2.3-1.8L11 21z"
          fill="#fff"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/** Little avatar with initials. */
export const Avatar: React.FC<{ size: number; text: string; bg: string; color?: string; ring?: string }> = ({ size, text, bg, color = "#fff", ring }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: bg,
      color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: sans,
      fontWeight: 700,
      fontSize: size * 0.36,
      boxShadow: ring ? `0 0 0 ${size * 0.06}px #fff, 0 0 0 ${size * 0.12}px ${ring}` : undefined,
      flexShrink: 0,
    }}
  >
    {text}
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; bg?: string; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, bg = LILAC, color = INK, size = 18, style }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: `${size * 0.35}px ${size * 0.75}px`, borderRadius: 999, background: bg, color, fontFamily: sans, fontWeight: 600, fontSize: size, whiteSpace: "nowrap", ...style }}>{children}</span>
);

/** Camera shake offset (px) decaying from `at`. */
export const shake = (f: number, at: number, amp = 18, dur = 26) => {
  if (f < at || f > at + dur) return [0, 0, 0];
  const d = 1 - (f - at) / dur;
  const a = amp * d * d;
  return [(random(`sx${f}`) - 0.5) * 2 * a, (random(`sy${f}`) - 0.5) * 2 * a, (random(`sr${f}`) - 0.5) * a * 0.08];
};

export const fadeOut = (f: number, a: number, b: number) => 1 - r(f, [a, b], [0, 1], EASE_IN);
export { EASE };
