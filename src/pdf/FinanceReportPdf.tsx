import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { C, F, LOGO, registerFonts } from "./theme";
import { money, dLong } from "./format";
import type { FinanceReportData } from "./types";

registerFonts();
const s = StyleSheet.create({
  page: { fontFamily: F.body, fontSize: 9.5, color: C.ink, paddingTop: 34, paddingBottom: 62, paddingHorizontal: 38, backgroundColor: C.white },
  row: { flexDirection: "row" },
  eyebrow: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.6, color: C.gold700, textTransform: "uppercase" },
  h2: { fontFamily: F.head, fontWeight: 800, fontSize: 17, letterSpacing: -0.3 },
  muted: { color: C.muted },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14 },
  th: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 22, left: 38, right: 38, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6 },
  th2: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingBottom: 6 },
});
const Kpi = ({ label, value, big = false, tone }: { label: string; value: string; big?: boolean; tone?: string }) => (
  <View style={[s.card, { flex: 1 }]}><Text style={s.th}>{label}</Text><Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: big ? 22 : 16, marginTop: 4, color: tone ?? C.ink }}>{value}</Text></View>
);

export default function FinanceReportPdf({ d }: { d: FinanceReportData }) {
  const profitTone = d.profit >= 0 ? C.green : "#B42318";
  return (
    <Document title={`Profit report ${d.label}`} author={d.company.name} subject="Monthly profit report">
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
          <Image src={LOGO} style={{ height: 40, objectFit: "contain" }} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.eyebrow}>Monthly profit report</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 13, marginTop: 3 }}>{d.label}</Text>
            <Text style={[s.muted, { fontSize: 8, marginTop: 1 }]}>Generated {dLong(d.generatedAt)} · internal, not for customers</Text>
          </View>
        </View>

        <View style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: 18, padding: 20 }}>
          <Text style={[s.eyebrow, { color: C.gold }]}>{d.label}</Text>
          <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 24, lineHeight: 1.1, marginTop: 4, color: C.white, letterSpacing: -0.5 }}>{money(d.profit, d.currency)} profit</Text>
          <Text style={{ marginTop: 4, fontSize: 9.5, color: "#D8CFC2" }}>{money(d.revenue, d.currency)} collected minus {money(d.cost, d.currency)} in cost{d.margin != null ? ` · ${d.margin.toFixed(1)}% margin` : ""}</Text>
        </View>

        <View style={[s.row, { marginTop: 14, gap: 10 }]}>
          <Kpi label="Revenue collected" value={money(d.revenue, d.currency)} big />
          <Kpi label="Cost" value={money(d.cost, d.currency)} big />
          <Kpi label="Profit" value={money(d.profit, d.currency)} big tone={profitTone} />
        </View>
        <View style={[s.row, { marginTop: 10, gap: 10 }]}>
          <Kpi label="Margin" value={d.margin != null ? `${d.margin.toFixed(1)}%` : "—"} />
          <Kpi label="Payments counted" value={String(d.paymentCount)} />
          <Kpi label="Bookings involved" value={String(d.bookingCount)} />
        </View>

        {d.noCostCount > 0 && <View style={{ marginTop: 12, backgroundColor: C.cream, borderRadius: 12, padding: 12 }}>
          <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 10.5 }}>Heads up</Text>
          <Text style={{ marginTop: 3, fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>
            {d.noCostCount} booking{d.noCostCount === 1 ? "" : "s"} ({money(d.noCostRevenue, d.currency)} of the revenue above) {d.noCostCount === 1 ? "has" : "have"} no cost recorded on its tour, so no cost was counted for it here. Profit is understated by however much that trip actually cost to run.
          </Text>
        </View>}

        <View style={{ marginTop: 16 }}>
          <Text style={s.h2}>By tour</Text>
          <View style={[s.th2, { marginTop: 8 }]}>
            <Text style={[s.th, { flex: 2.2 }]}>Tour</Text><Text style={[s.th, { flex: 0.8, textAlign: "right" }]}>Bookings</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Revenue</Text><Text style={[s.th, { flex: 1, textAlign: "right" }]}>Cost</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Profit</Text><Text style={[s.th, { flex: 0.8, textAlign: "right" }]}>Margin</Text>
          </View>
          {d.byTour.map((t, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={{ flex: 2.2, fontSize: 9, fontWeight: 700 }}>{t.title}</Text><Text style={{ flex: 0.8, fontSize: 9, textAlign: "right" }}>{t.bookings}</Text>
              <Text style={{ flex: 1, fontSize: 9, textAlign: "right" }}>{money(t.revenue, d.currency)}</Text><Text style={{ flex: 1, fontSize: 9, textAlign: "right", color: C.muted }}>{money(t.cost, d.currency)}</Text>
              <Text style={{ flex: 1, fontSize: 9, textAlign: "right", fontWeight: 700, color: t.profit >= 0 ? C.green : "#B42318" }}>{money(t.profit, d.currency)}</Text>
              <Text style={{ flex: 0.8, fontSize: 9, textAlign: "right", color: C.muted }}>{t.margin != null ? `${t.margin.toFixed(0)}%` : "—"}</Text>
            </View>
          ))}
          {!d.byTour.length && <Text style={{ marginTop: 10, fontSize: 9, color: C.muted }}>No payments were recorded as paid in this period.</Text>}
        </View>

        <View style={{ marginTop: 16 }} break>
          <Text style={s.h2}>Corporate requests</Text>
          <Text style={{ marginTop: 3, fontSize: 8.5, color: C.muted }}>{d.corporateRequestCount} request{d.corporateRequestCount === 1 ? "" : "s"} · {d.corporatePaymentCount} payment{d.corporatePaymentCount === 1 ? "" : "s"} · already counted in the totals above.</Text>
          <View style={[s.th2, { marginTop: 8 }]}>
            <Text style={[s.th, { flex: 2.2 }]}>Request</Text><Text style={[s.th, { flex: 1, textAlign: "right" }]}>Revenue</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Cost</Text><Text style={[s.th, { flex: 1, textAlign: "right" }]}>Profit</Text><Text style={[s.th, { flex: 0.8, textAlign: "right" }]}>Margin</Text>
          </View>
          {d.byCorporate.map((c, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={{ flex: 2.2, fontSize: 9, fontWeight: 700 }}>{c.companyName} · {c.ref}</Text>
              <Text style={{ flex: 1, fontSize: 9, textAlign: "right" }}>{money(c.revenue, d.currency)}</Text><Text style={{ flex: 1, fontSize: 9, textAlign: "right", color: C.muted }}>{money(c.cost, d.currency)}</Text>
              <Text style={{ flex: 1, fontSize: 9, textAlign: "right", fontWeight: 700, color: c.profit >= 0 ? C.green : "#B42318" }}>{money(c.profit, d.currency)}</Text>
              <Text style={{ flex: 0.8, fontSize: 9, textAlign: "right", color: C.muted }}>{c.margin != null ? `${c.margin.toFixed(0)}%` : "—"}</Text>
            </View>
          ))}
          {!d.byCorporate.length && <Text style={{ marginTop: 10, fontSize: 9, color: C.muted }}>No corporate payments were recorded as paid in this period.</Text>}
        </View>

        <Text style={{ marginTop: 16, fontSize: 7.5, color: C.muted, lineHeight: 1.5 }}>
          Cash basis: a payment counts in the month it was recorded as paid, not the month of the trip. Each payment carries its share of that booking's cost, so a deposit this month and a balance
          next month each contribute their fair part. Cost is only the core tour cost recorded on the tour; add-ons and private-tour upgrades are counted as pure profit.
        </Text>

        <View style={s.footer} fixed>
          <Text>{d.company.name} · Internal document, not for customers</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
