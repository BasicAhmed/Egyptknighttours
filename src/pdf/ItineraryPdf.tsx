import { Document, Page, View, Text, Image, Link, Svg, Defs, LinearGradient, Stop, Rect, StyleSheet } from "@react-pdf/renderer";
import { C, F, LOGO, Icon, SceneSvg, registerFonts } from "./theme";
import { dLong, dWeek } from "./format";
import type { ItineraryPdfData, Day, Block } from "./types";

registerFonts();
const W = 595, H = 841;
const s = StyleSheet.create({
  page: { fontFamily: F.body, fontSize: 9.5, color: C.ink, paddingTop: 40, paddingBottom: 58, paddingHorizontal: 40, backgroundColor: C.white },
  eyebrow: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.6, color: C.gold700, textTransform: "uppercase" },
  h2: { fontFamily: F.head, fontWeight: 800, fontSize: 24, letterSpacing: -0.6, lineHeight: 1.08 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted },
});
const ICON: Record<Block["type"], string> = { ACTIVITY: "camera", TOUR: "camera", TRANSPORT: "car", TRANSFER: "car", FLIGHT: "flight", HOTEL: "hotel", MEAL: "meal", FREE_TIME: "coffee", NOTE: "note", MEETING_POINT: "pin", GUIDE: "person", INFO: "info" };
const LABEL: Record<Block["type"], string> = { ACTIVITY: "Activity", TOUR: "Tour", TRANSPORT: "Transport", TRANSFER: "Transfer", FLIGHT: "Flight", HOTEL: "Hotel", MEAL: "Meal", FREE_TIME: "Free time", NOTE: "Note", MEETING_POINT: "Meeting point", GUIDE: "Your guide", INFO: "Good to know" };
export function sceneKind(text: string) {
  const t = text.toLowerCase();
  if (/alexandria/.test(t)) return "alexandria"; if (/hurghada|sharm|red sea|dahab/.test(t)) return "hurghada";
  if (/aswan|nile|cruise|edfu|kom ombo|esna/.test(t)) return "aswan"; if (/luxor|karnak|valley of the kings/.test(t)) return "luxor";
  if (/giza|pyramid|sakkara|saqqara|memphis/.test(t)) return "giza"; if (/cairo|islamic|khan/.test(t)) return "cairo"; return "default";
}
function Pic({ src, images, kind, w, h, r = 0 }: { src: string; images: Record<string, string>; kind: string; w: number; h: number; r?: number }) {
  const img = src && images[src];
  return <View style={{ width: w, height: h, borderRadius: r, overflow: "hidden" }}>{img ? <Image src={img} style={{ width: w, height: h, objectFit: "cover" }} /> : <SceneSvg kind={kind} width={w} height={h} />}</View>;
}
const Chip = ({ children }: { children: string }) => <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", borderRadius: 20, paddingVertical: 5, paddingHorizontal: 11, marginRight: 8, marginBottom: 6 }}><Text style={{ color: C.white, fontSize: 9, fontWeight: 600 }}>{children}</Text></View>;

function DayView({ day, n, d }: { day: Day; n: number; d: ItineraryPdfData }) {
  const kind = sceneKind(`${day.location} ${day.title}`);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 58, color: C.gold, lineHeight: 0.9, width: 78, letterSpacing: -2 }}>{String(n).padStart(2, "0")}</Text>
        <View style={{ flex: 1, paddingTop: 2 }}>
          <Text style={s.eyebrow}>{[`Day ${n}`, day.date ? dWeek(day.date) : "", day.location].filter(Boolean).join("   ·   ")}</Text>
          <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 19, marginTop: 3, lineHeight: 1.12, letterSpacing: -0.4 }}>{day.title}</Text>
          {day.hook ? <Text style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.5, color: C.muted }}>{day.hook}</Text> : null}
        </View>
      </View>
      <View style={{ marginTop: 12 }}><Pic src={day.imageUrl} images={d.images} kind={kind} w={W - 80} h={196} r={16} /></View>
      <View style={{ marginTop: 14, paddingLeft: 4 }}>
        {day.blocks.map((b, i) => (
          <View key={b.id} wrap={false} style={{ flexDirection: "row" }}>
            <View style={{ width: 50, paddingTop: 4 }}><Text style={{ fontSize: 8.5, fontWeight: 700, color: C.muted }}>{b.time}</Text></View>
            <View style={{ width: 26, alignItems: "center" }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: b.type === "HOTEL" ? C.ink : C.gold, alignItems: "center", justifyContent: "center" }}><Icon name={ICON[b.type]} size={11} color={b.type === "HOTEL" ? C.gold : C.ink} /></View>
              {i < day.blocks.length - 1 && <View style={{ width: 1.5, flex: 1, backgroundColor: C.line, marginTop: 2 }} />}
            </View>
            <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 13 }}>
              <Text style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1.2, color: C.gold700, textTransform: "uppercase" }}>{LABEL[b.type]}</Text>
              {b.title ? <Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 11.5, marginTop: 1 }}>{b.title}</Text> : null}
              {b.description ? <Text style={{ marginTop: 2, lineHeight: 1.5, fontSize: 9.3 }}>{b.description}</Text> : null}
              {b.location ? <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}><Icon name="pin" size={8} color={C.muted} /><Text style={{ fontSize: 8.3, color: C.muted, marginLeft: 3 }}>{b.location}</Text></View> : null}
              {b.link ? <Link src={b.link} style={{ fontSize: 8.3, color: C.nile, marginTop: 2 }}>{b.link.replace(/^https?:\/\//, "").slice(0, 60)}</Link> : null}
              {b.notes ? <View style={{ marginTop: 5, borderLeftWidth: 2, borderLeftColor: C.gold, backgroundColor: C.cream, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 4 }}><Text style={{ fontSize: 8.5, lineHeight: 1.45 }}>{b.notes}</Text></View> : null}
              {b.imageUrl && d.images[b.imageUrl] ? <View style={{ marginTop: 6 }}><Image src={d.images[b.imageUrl]} style={{ width: 210, height: 100, borderRadius: 8, objectFit: "cover" }} /></View> : null}
            </View>
          </View>))}
      </View>
      {day.hotel.name ? (
        <View wrap={false} style={{ marginTop: 2, backgroundColor: C.cream, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", marginRight: 10 }}><Icon name="hotel" size={14} color={C.gold} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1.2, color: C.gold700, textTransform: "uppercase" }}>Tonight you'll stay at</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 12, marginTop: 1 }}>{day.hotel.name}{day.hotel.stars ? `  ·  ${day.hotel.stars}` : ""}</Text>
            {day.hotel.notes ? <Text style={{ fontSize: 8.5, color: C.muted, marginTop: 1 }}>{day.hotel.notes}</Text> : null}
            {day.hotel.link ? <Link src={day.hotel.link} style={{ fontSize: 8.3, color: C.nile, marginTop: 2 }}>{day.hotel.link.replace(/^https?:\/\//, "").slice(0, 60)}</Link> : null}
          </View>
        </View>) : null}
      {day.notes ? <Text style={{ marginTop: 8, fontSize: 8.8, color: C.muted, lineHeight: 1.5 }}>{day.notes}</Text> : null}
    </View>
  );
}

export default function ItineraryPdf({ d }: { d: ItineraryPdfData }) {
  const c = d.content; const n = c.days.length; const nights = Math.max(0, n - 1);
  const coverKind = c.sceneKind && c.sceneKind !== "auto" ? c.sceneKind : sceneKind(`${c.title} ${c.destinations.join(" ")}`);
  const wa = d.company.whatsapp ? `https://wa.me/${d.company.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi Egypt Knight, I'd like to book "${c.title}" (${d.ref}).`)}` : "";
  const cta = d.ctaUrl || wa || (d.company.email ? `mailto:${d.company.email}` : "");
  const cover = c.coverImageUrl && d.images[c.coverImageUrl];
  const footer = (
    <View fixed style={s.footer}><Text>{d.company.name}  ·  {c.title}</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
  );
  return (
    <Document title={c.title} author={d.company.name} subject={`Itinerary ${d.ref}`}>
      {/* COVER */}
      <Page size="A4" style={{ backgroundColor: C.ink }}>
        <View style={{ width: W, height: H, position: "relative" }}>
        <View style={{ position: "absolute", top: 0, left: 0, width: W, height: H }}>
          {cover ? <Image src={cover} style={{ width: W, height: H, objectFit: "cover" }} /> : <SceneSvg kind={coverKind} width={W} height={H} />}
        </View>
        <Svg style={{ position: "absolute", top: 0, left: 0 }} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs><LinearGradient id="ov" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#141010" stopOpacity={0.25} /><Stop offset="0.45" stopColor="#141010" stopOpacity={0.1} /><Stop offset="1" stopColor="#141010" stopOpacity={0.93} /></LinearGradient></Defs>
          <Rect x="0" y="0" width={W} height={H} fill="url(#ov)" />
        </Svg>
        <View style={{ position: "absolute", top: 34, left: 38, backgroundColor: C.white, borderRadius: 14, padding: 9 }}><Image src={LOGO} style={{ height: 40, objectFit: "contain" }} /></View>
        <View style={{ position: "absolute", left: 44, right: 44, bottom: 56 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.4, color: C.gold, textTransform: "uppercase" }}>Your Egypt itinerary</Text>
          <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 44, lineHeight: 1.02, color: C.white, marginTop: 8, letterSpacing: -1.4 }}>{c.title}</Text>
          {c.subtitle ? <Text style={{ fontSize: 14, color: "#EFE6D3", marginTop: 10, lineHeight: 1.4 }}>{c.subtitle}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 18 }}>
            <Chip>{`${n} days · ${nights} nights`}</Chip>
            {c.startDate ? <Chip>{`${dLong(c.startDate)}${c.endDate ? " – " + dLong(c.endDate) : ""}`}</Chip> : null}
            {c.travelers ? <Chip>{c.travelers}</Chip> : null}
            {c.destinations.length ? <Chip>{c.destinations.slice(0, 4).join(" · ")}</Chip> : null}
          </View>
          {c.customerName ? <Text style={{ fontSize: 9.5, color: C.gold, marginTop: 8, letterSpacing: 0.4 }}>Prepared for {c.customerName}</Text> : null}
        </View>
        </View>
      </Page>

      {/* OVERVIEW */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>Your trip at a glance</Text>
        <Text style={[s.h2, { marginTop: 4 }]}>{c.intro ? "Here's what's waiting for you." : "Your journey, day by day."}</Text>
        {c.intro ? <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: "#3A3532" }}>{c.intro}</Text> : null}
        <View style={{ flexDirection: "row", marginTop: 20, gap: 10 }}>
          {[[String(n), "days"], [String(nights), "nights"], [String(Math.max(1, c.destinations.length)), c.destinations.length === 1 ? "destination" : "destinations"]].map(([v, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: C.gold, borderRadius: 14, padding: 14 }}><Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 32, letterSpacing: -1 }}>{v}</Text><Text style={{ fontSize: 9, fontWeight: 600 }}>{l}</Text></View>))}
        </View>
        {c.destinations.length > 0 && <View style={{ marginTop: 22 }}>
          <Text style={s.eyebrow}>Your route</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
            {c.destinations.map((x, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", flex: i < c.destinations.length - 1 ? 1 : 0 }}>
                <View style={{ alignItems: "center" }}><View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold }} /></View><Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 10, marginTop: 5 }}>{x}</Text></View>
                {i < c.destinations.length - 1 && <View style={{ flex: 1, height: 1.5, backgroundColor: C.gold, marginHorizontal: 6, marginBottom: 14 }} />}
              </View>))}
          </View>
        </View>}
        {c.highlights.length > 0 && <View style={{ marginTop: 24 }}>
          <Text style={s.eyebrow}>Highlights</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
            {c.highlights.map((h, i) => <View key={i} style={{ width: "50%", flexDirection: "row", paddingRight: 12, paddingVertical: 5 }}><View style={{ marginRight: 6, marginTop: 1 }}><Icon name="check" size={11} color={C.gold700} /></View><Text style={{ flex: 1, fontSize: 10.5, lineHeight: 1.4, fontWeight: 600 }}>{h}</Text></View>)}
          </View>
        </View>}
        <View style={{ marginTop: 24 }}>
          <Text style={s.eyebrow}>Day by day</Text>
          {c.days.map((day, i) => <View key={day.id} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ width: 44, fontFamily: F.head, fontWeight: 800, fontSize: 11, color: C.gold700 }}>Day {i + 1}</Text><Text style={{ flex: 1, fontWeight: 600 }}>{day.title}</Text><Text style={{ color: C.muted, fontSize: 8.5 }}>{day.location}</Text></View>)}
        </View>
        {footer}
      </Page>

      {/* DAYS: one page per day */}
      {c.days.map((day, i) => (
        <Page key={day.id} size="A4" style={s.page}>
          <DayView day={day} n={i + 1} d={d} />
          {footer}
        </Page>))}

      {/* INCLUDED */}
      {(c.included.length > 0 || c.excluded.length > 0 || c.important.length > 0) && (
        <Page size="A4" style={s.page}>
          <Text style={s.eyebrow}>The details</Text>
          <Text style={[s.h2, { marginTop: 4 }]}>What's included</Text>
          <View style={{ flexDirection: "row", marginTop: 16, gap: 14 }}>
            <View style={{ flex: 1, backgroundColor: C.cream, borderRadius: 14, padding: 16 }}>
              <Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Included</Text>
              {c.included.map((t, i) => <View key={i} style={{ flexDirection: "row", paddingVertical: 3.5 }}><View style={{ marginRight: 6, marginTop: 1 }}><Icon name="check" size={11} color={C.green} /></View><Text style={{ flex: 1, lineHeight: 1.4 }}>{t}</Text></View>)}
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16 }}>
              <Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Not included</Text>
              {c.excluded.map((t, i) => <View key={i} style={{ flexDirection: "row", paddingVertical: 3.5 }}><View style={{ marginRight: 6, marginTop: 1 }}><Icon name="close" size={11} color={C.red} /></View><Text style={{ flex: 1, lineHeight: 1.4 }}>{t}</Text></View>)}
            </View>
          </View>
          {c.important.length > 0 && <View style={{ marginTop: 20 }}><Text style={s.eyebrow}>Important information</Text>
            {c.important.map((t, i) => <View key={i} style={{ flexDirection: "row", marginTop: 8 }}><View style={{ marginRight: 7, marginTop: 1 }}><Icon name="info" size={12} color={C.gold700} /></View><Text style={{ flex: 1, lineHeight: 1.5 }}>{t}</Text></View>)}</View>}
          {footer}
        </Page>)}

      {/* CTA */}
      <Page size="A4" style={{ backgroundColor: C.ink, padding: 44 }}>
        <Image src={LOGO} style={{ height: 46, objectFit: "contain", alignSelf: "flex-start" }} />
        <View style={{ marginTop: 90 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.4, color: C.gold, textTransform: "uppercase" }}>Ready to make it official?</Text>
          <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 46, lineHeight: 1.02, color: C.white, marginTop: 10, letterSpacing: -1.5 }}>Your Egyptian adventure is waiting.</Text>
          <Text style={{ fontSize: 12, color: "#D9D1C3", marginTop: 12, lineHeight: 1.5, maxWidth: 380 }}>Everything above is ready to go. One quick step and we'll lock in your dates, your guides and your hotels.</Text>
        </View>
        {(c.priceLabel || c.paymentTerms) && <View style={{ marginTop: 26, backgroundColor: "#211B1B", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#3A3030" }}>
          {c.priceLabel ? <><Text style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 1.6, color: C.gold, textTransform: "uppercase" }}>Your price</Text><Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 24, color: C.white, marginTop: 4 }}>{c.priceLabel}</Text></> : null}
          {c.paymentTerms ? <Text style={{ fontSize: 10, color: "#D9D1C3", marginTop: 8, lineHeight: 1.5 }}>{c.paymentTerms}</Text> : null}
        </View>}
        {cta ? <Link src={cta} style={{ textDecoration: "none" }}><View style={{ marginTop: 26, backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.ink, fontWeight: 700, fontSize: 13, letterSpacing: 1.6, marginRight: 9 }}>{(c.ctaLabel || "COMPLETE YOUR BOOKING").toUpperCase()}</Text><Icon name="arrow" size={15} color={C.ink} /></View></Link> : null}
        <View style={{ marginTop: 28, gap: 9 }}>
          {wa ? <Link src={wa} style={{ textDecoration: "none" }}><View style={{ flexDirection: "row", alignItems: "center" }}><Icon name="phone" size={13} color={C.gold} /><Text style={{ color: C.white, marginLeft: 9, fontSize: 11 }}>WhatsApp {d.company.whatsapp}</Text></View></Link> : null}
          {d.company.email ? <Link src={`mailto:${d.company.email}`} style={{ textDecoration: "none" }}><View style={{ flexDirection: "row", alignItems: "center" }}><Icon name="mail" size={13} color={C.gold} /><Text style={{ color: C.white, marginLeft: 9, fontSize: 11 }}>{d.company.email}</Text></View></Link> : null}
          {d.company.website ? <View style={{ flexDirection: "row", alignItems: "center" }}><Icon name="link" size={13} color={C.gold} /><Text style={{ color: C.white, marginLeft: 9, fontSize: 11 }}>{d.company.website}</Text></View> : null}
        </View>
        <Text style={{ position: "absolute", bottom: 34, left: 44, fontSize: 8, color: "#9C948A" }}>{d.company.name}{d.company.licence ? `  ·  Licence ${d.company.licence}` : ""}  ·  Reference {d.ref}</Text>
      </Page>
    </Document>
  );
}
