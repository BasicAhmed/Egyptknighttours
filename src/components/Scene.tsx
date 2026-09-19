// Brand-coloured illustrated scenes. Used only when a tour/destination has no real photo yet.
const C = { skyTop: "#FFF6E0", skyMid: "#FBD98F", sun: "#F0B050", dune1: "#E7B45A", dune2: "#C9923A", dune3: "#8A5F1E", ink: "#141010", water: "#1F6F78", waterDark: "#17555C" };
type Kind = "giza" | "cairo" | "luxor" | "aswan" | "alexandria" | "hurghada" | "default";
const map: Record<string, Kind> = { giza: "giza", cairo: "cairo", luxor: "luxor", aswan: "aswan", alexandria: "alexandria", hurghada: "hurghada" };
export const sceneFor = (slug?: string): Kind => map[slug ?? ""] ?? "default";

export default function Scene({ kind = "default", className = "" }: { kind?: Kind; className?: string }) {
  const id = `g-${kind}`;
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.skyTop} /><stop offset="1" stopColor={C.skyMid} /></linearGradient>
      </defs>
      <rect width="800" height="600" fill={`url(#${id})`} />
      <circle cx={kind === "hurghada" ? 560 : 590} cy="250" r="88" fill={C.sun} opacity=".95" />
      <circle cx={kind === "hurghada" ? 560 : 590} cy="250" r="128" fill={C.sun} opacity=".18" />
      {kind === "giza" || kind === "default" ? <>
        <path d="M120 430 L300 190 L480 430Z" fill={C.dune2} /><path d="M300 190 L480 430 L360 430Z" fill={C.dune3} opacity=".55" />
        <path d="M380 430 L510 265 L640 430Z" fill={C.dune1} /><path d="M510 265 L640 430 L560 430Z" fill={C.dune2} />
        <path d="M60 430 L150 330 L240 430Z" fill={C.dune1} />
      </> : null}
      {kind === "cairo" ? <g fill={C.ink}>
        <rect x="90" y="300" width="70" height="150" /><path d="M95 300 Q125 240 155 300Z" />
        <rect x="200" y="250" width="14" height="200" /><path d="M197 250 L207 205 L217 250Z" />
        <rect x="300" y="330" width="120" height="120" /><path d="M310 330 Q360 250 410 330Z" /><rect x="352" y="225" width="6" height="35" />
        <rect x="470" y="270" width="14" height="180" /><path d="M467 270 L477 225 L487 270Z" />
        <rect x="560" y="340" width="150" height="110" /><path d="M570 340 Q635 270 700 340Z" />
      </g> : null}
      {kind === "luxor" ? <g fill={C.ink}>
        {[130, 210, 290, 370, 450].map((x) => <g key={x}><rect x={x} y="230" width="34" height="220" /><rect x={x - 8} y="216" width="50" height="18" /></g>)}
        <rect x="100" y="200" width="420" height="22" />
        <ellipse cx="640" cy="200" rx="44" ry="54" fill={C.dune2} /><path d="M610 240 L670 240 L655 275 L625 275Z" fill={C.ink} />
      </g> : null}
      {kind === "aswan" ? <>
        <path d="M0 420 H800 V600 H0Z" fill={C.water} /><path d="M0 470 H800 V600 H0Z" fill={C.waterDark} opacity=".6" />
        <path d="M300 410 L300 250 L420 400Z" fill="#fff" /><path d="M280 410 H440 L420 440 H300Z" fill={C.ink} />
        <path d="M0 420 Q120 340 260 420Z" fill={C.dune2} /><path d="M540 420 Q680 330 800 420Z" fill={C.dune1} />
      </> : null}
      {kind === "alexandria" ? <>
        <path d="M0 440 H800 V600 H0Z" fill={C.water} /><path d="M0 500 Q100 480 200 500 T400 500 T600 500 T800 500 V600 H0Z" fill={C.waterDark} opacity=".6" />
        <g fill={C.ink}><rect x="330" y="230" width="50" height="210" /><rect x="320" y="215" width="70" height="20" /><rect x="342" y="185" width="26" height="32" /><path d="M338 185 L355 150 L372 185Z" /></g>
        <rect x="250" y="410" width="210" height="34" fill={C.dune3} />
      </> : null}
      {kind === "hurghada" ? <>
        <path d="M0 400 H800 V600 H0Z" fill={C.water} />
        <path d="M0 460 Q100 440 200 460 T400 460 T600 460 T800 460 V600 H0Z" fill={C.waterDark} opacity=".55" />
        <path d="M0 400 Q200 350 420 400Z" fill={C.dune1} /><path d="M0 560 Q100 520 180 560Z" fill={C.ink} opacity=".25" />
      </> : null}
      {kind !== "aswan" && kind !== "alexandria" && kind !== "hurghada" ? <>
        <path d="M0 430 Q200 380 400 430 T800 410 V600 H0Z" fill={C.dune1} />
        <path d="M0 500 Q220 450 420 500 T800 480 V600 H0Z" fill={C.dune2} />
        <path d="M0 560 Q240 520 460 560 T800 550 V600 H0Z" fill={C.dune3} />
      </> : null}
    </svg>
  );
}
