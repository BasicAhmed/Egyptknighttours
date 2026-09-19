import { FONTS, LOGO_DATA } from "./assets.generated";
import { Font, Svg, Path, Circle, Rect, Defs, LinearGradient, Stop, G, Ellipse } from "@react-pdf/renderer";

export const LOGO = LOGO_DATA;
let registered = false;
export function registerFonts() {
  if (registered) return; registered = true;
  Font.register({ family: "Inter", fonts: [{ src: FONTS.inter400, fontWeight: 400 }, { src: FONTS.inter600, fontWeight: 600 }, { src: FONTS.inter700, fontWeight: 700 }] });
  Font.register({ family: "Bricolage", fonts: [{ src: FONTS.brico700, fontWeight: 700 }, { src: FONTS.brico800, fontWeight: 800 }] });
  Font.registerHyphenationCallback((w) => [w]);
}
export const C = { ink: "#141010", gold: "#F0B050", gold600: "#DDA03F", gold700: "#C09040", cream: "#FFF6E0", cream2: "#FBEBC8", white: "#FFFFFF", line: "#EAE4D8", muted: "#6B6560", soft: "#F7F4EC", green: "#1F7A46", nile: "#1F6F78", red: "#B3261E" };
export const F = { body: "Inter", head: "Bricolage" };

const ICONS: Record<string, string> = {
  pin: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  flight: "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
  hotel: "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z",
  meal: "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
  car: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
  clock: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  camera: "M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z",
  boat: "M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.14.52-.06.78L3.95 19z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  coffee: "M2 21h18v-2H2v2zM20 8h-2V5h2v3zm0-5H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2z",
  note: "M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z",
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  arrow: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
  down: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.59-5.58L4 12l8 8 8-8z",
  bank: "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z",
  link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  shield: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",
};
export function Icon({ name, size = 12, color = C.ink }: { name: string; size?: number; color?: string }) {
  return <Svg viewBox="0 0 24 24" width={size} height={size}><Path d={ICONS[name] ?? ICONS.info} fill={color} /></Svg>;
}

// Brand illustration used when there is no photo (react-pdf version of the website scene art).
const S = { top: "#FFF6E0", mid: "#FBD98F", sun: "#F0B050", d1: "#E7B45A", d2: "#C9923A", d3: "#8A5F1E", ink: "#141010", water: "#1F6F78", waterDark: "#17555C" };
export function SceneSvg({ kind = "default", width, height }: { kind?: string; width: number; height: number }) {
  const k = ["giza", "cairo", "luxor", "aswan", "alexandria", "hurghada"].includes(kind) ? kind : "default";
  const gid = `sky-${k}`;
  return (
    <Svg viewBox="0 0 800 600" width={width} height={height} preserveAspectRatio="xMidYMid slice">
      <Defs><LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={S.top} /><Stop offset="1" stopColor={S.mid} /></LinearGradient></Defs>
      <Rect width="800" height="600" fill={`url(#${gid})`} />
      <Circle cx="590" cy="250" r="128" fill={S.sun} opacity={0.18} /><Circle cx="590" cy="250" r="88" fill={S.sun} />
      {(k === "giza" || k === "default") && <G><Path d="M120 430 L300 190 L480 430Z" fill={S.d2} /><Path d="M300 190 L480 430 L360 430Z" fill={S.d3} opacity={0.55} /><Path d="M380 430 L510 265 L640 430Z" fill={S.d1} /><Path d="M510 265 L640 430 L560 430Z" fill={S.d2} /><Path d="M60 430 L150 330 L240 430Z" fill={S.d1} /></G>}
      {k === "cairo" && <G fill={S.ink}><Rect x="90" y="300" width="70" height="150" /><Path d="M95 300 Q125 240 155 300Z" /><Rect x="200" y="250" width="14" height="200" /><Path d="M197 250 L207 205 L217 250Z" /><Rect x="300" y="330" width="120" height="120" /><Path d="M310 330 Q360 250 410 330Z" /><Rect x="470" y="270" width="14" height="180" /><Path d="M467 270 L477 225 L487 270Z" /><Rect x="560" y="340" width="150" height="110" /><Path d="M570 340 Q635 270 700 340Z" /></G>}
      {k === "luxor" && <G fill={S.ink}>{[130, 210, 290, 370, 450].map((x) => <G key={x}><Rect x={x} y="230" width="34" height="220" /><Rect x={x - 8} y="216" width="50" height="18" /></G>)}<Rect x="100" y="200" width="420" height="22" /><Ellipse cx="640" cy="200" rx="44" ry="54" fill={S.d2} /><Path d="M610 240 L670 240 L655 275 L625 275Z" fill={S.ink} /></G>}
      {k === "aswan" && <G><Rect x="0" y="420" width="800" height="180" fill={S.water} /><Rect x="0" y="470" width="800" height="130" fill={S.waterDark} opacity={0.6} /><Path d="M300 410 L300 250 L420 400Z" fill="#fff" /><Path d="M280 410 H440 L420 440 H300Z" fill={S.ink} /><Path d="M0 420 Q120 340 260 420Z" fill={S.d2} /><Path d="M540 420 Q680 330 800 420Z" fill={S.d1} /></G>}
      {k === "alexandria" && <G><Rect x="0" y="440" width="800" height="160" fill={S.water} /><Rect x="0" y="500" width="800" height="100" fill={S.waterDark} opacity={0.6} /><G fill={S.ink}><Rect x="330" y="230" width="50" height="210" /><Rect x="320" y="215" width="70" height="20" /><Rect x="342" y="185" width="26" height="32" /><Path d="M338 185 L355 150 L372 185Z" /></G><Rect x="250" y="410" width="210" height="34" fill={S.d3} /></G>}
      {k === "hurghada" && <G><Rect x="0" y="400" width="800" height="200" fill={S.water} /><Rect x="0" y="460" width="800" height="140" fill={S.waterDark} opacity={0.55} /><Path d="M0 400 Q200 350 420 400Z" fill={S.d1} /></G>}
      {!["aswan", "alexandria", "hurghada"].includes(k) && <G><Path d="M0 430 Q200 380 400 430 T800 410 V600 H0Z" fill={S.d1} /><Path d="M0 500 Q220 450 420 500 T800 480 V600 H0Z" fill={S.d2} /><Path d="M0 560 Q240 520 460 560 T800 550 V600 H0Z" fill={S.d3} /></G>}
    </Svg>
  );
}
