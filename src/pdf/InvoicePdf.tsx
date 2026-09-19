import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import { C, F, LOGO, Icon, registerFonts } from "./theme";
import { money, dLong } from "./format";
import type { InvoiceData, PayMethod } from "./types";

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
});

function Field({ k, v, w = 92 }: { k: string; v: string; w?: number }) {
  if (!v) return null;
  return <View style={{ flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ width: w, color: C.muted, fontSize: 8.5 }}>{k}</Text><Text style={{ flex: 1, fontWeight: 600, fontSize: w < 70 ? 8.6 : 9.5 }}>{v}</Text></View>;
}
function Method({ m }: { m: PayMethod }) {
  const bank = m.kind === "BANK";
  return (
    <View wrap={false} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", marginRight: 8 }}><Icon name={bank ? "bank" : "link"} size={12} /></View>
        <Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 12 }}>{m.label}{m.currency ? `  ·  ${m.currency}` : ""}</Text>
      </View>
      {bank ? <View>
        <Field k="Account name" v={m.accountName} /><Field k="Bank" v={m.bankName} /><Field k="Account number" v={m.accountNumber} /><Field k="IBAN" v={m.iban} />
        <Field k="SWIFT / BIC" v={m.swift} /><Field k="Branch" v={m.branch} /><Field k="Bank address" v={m.bankAddress} />
      </View> : null}
      {m.paymentUrl ? <Link src={m.paymentUrl} style={{ color: C.nile, fontWeight: 700, fontSize: 10 }}>{m.paymentUrl}</Link> : null}
      {m.instructions ? <Text style={{ marginTop: 6, fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>{m.instructions}</Text> : null}
    </View>
  );
}

export default function InvoicePdf({ d }: { d: InvoiceData }) {
  const first = d.customer.name.split(" ")[0];
  const settled = d.balance <= 0;
  const cta = settled ? d.trackUrl : d.ctaUrl || "#howtopay";
  const ctaText = settled ? "VIEW YOUR BOOKING" : d.ctaUrl ? "COMPLETE YOUR PAYMENT" : "HOW TO PAY";
  return (
    <Document title={`Invoice ${d.number}`} author={d.company.name} subject={`Booking ${d.ref}`}>
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
          <Image src={LOGO} style={{ height: 40, objectFit: "contain" }} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.eyebrow}>Booking confirmation &amp; invoice</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 13, marginTop: 3 }}>{d.number}</Text>
            <Text style={[s.muted, { fontSize: 8, marginTop: 1 }]}>Issued {dLong(d.issuedAt)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 18, backgroundColor: C.gold, borderRadius: 18, padding: 20 }}>
          <Text style={[s.eyebrow, { color: C.ink }]}>Your Egypt adventure</Text>
          <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 27, lineHeight: 1.08, marginTop: 5, letterSpacing: -0.6 }}>{settled ? "Your Egypt adventure is confirmed." : "Your Egypt adventure is almost confirmed."}</Text>
          <Text style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.45 }}>{settled ? `Thank you, ${first}. Everything is paid and organised. We can't wait to welcome you.` : `Hi ${first}, one quick step and your trip is locked in. Here's everything you need to complete your payment.`}</Text>
          <View style={{ marginTop: 14, backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: "row" }}>
            <View style={{ flex: 1.3 }}><Text style={s.th}>{settled ? "Total paid" : "Total due now"}</Text><Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 30, marginTop: 2, letterSpacing: -0.8 }}>{money(settled ? d.paid : d.dueNow, d.currency)}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.th}>{settled ? "Status" : "Pay by"}</Text><Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 17, marginTop: 8 }}>{settled ? "Paid" : dLong(d.deadline)}</Text>{!settled && d.deadlineNote ? <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>{d.deadlineNote}</Text> : null}</View>
            <View style={{ flex: 1 }}><Text style={s.th}>Booking ID</Text><Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 17, marginTop: 8 }}>{d.ref}</Text></View>
          </View>
          <Link src={cta} style={{ textDecoration: "none" }}>
            <View style={{ marginTop: 12, backgroundColor: C.ink, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.gold, fontWeight: 700, fontSize: 11, letterSpacing: 1.4, marginRight: 8 }}>{ctaText}</Text>
              <Icon name={settled || d.ctaUrl ? "arrow" : "down"} size={13} color={C.gold} />
            </View>
          </Link>
        </View>

        <View style={[s.row, { marginTop: 14, gap: 12 }]}>
          <View style={[s.card, { flex: 1.4 }]}>
            <Text style={s.eyebrow}>Your trip</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 15, marginTop: 4, lineHeight: 1.15 }}>{d.trip.title}</Text>
            <View style={{ marginTop: 6 }}>
              <Field k="Destination" v={d.trip.destination} /><Field k="Tour date" v={dLong(d.trip.date)} /><Field k="Travelers" v={d.trip.travelers} /><Field k="Style" v={d.trip.style} /><Field k="Pickup" v={d.trip.pickup} />
            </View>
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.eyebrow}>Traveler</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 15, marginTop: 4 }}>{d.customer.name}</Text>
            <View style={{ marginTop: 6 }}>
              <Field w={44} k="Email" v={d.customer.email} /><Field w={44} k="Phone" v={d.customer.phone} /><Field w={44} k="Country" v={d.customer.country} /><Field w={44} k="Booking" v={d.ref} />
            </View>
          </View>
        </View>

        <View wrap={false} style={[s.card, { marginTop: 14, padding: 0, overflow: "hidden" }]}>
          <View style={{ flexDirection: "row", backgroundColor: C.soft, paddingVertical: 8, paddingHorizontal: 14 }}><Text style={[s.th, { flex: 1 }]}>Price breakdown</Text><Text style={[s.th, { width: 90, textAlign: "right" }]}>{d.currency}</Text></View>
          {[...d.lines, ...d.extras].map((l, i) => (
            <View key={i} style={{ flexDirection: "row", paddingVertical: 6.5, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.line }}><Text style={{ flex: 1 }}>{l.label}</Text><Text style={{ width: 90, textAlign: "right" }}>{money(l.amount, d.currency)}</Text></View>))}
          {d.discount > 0 && <View style={{ flexDirection: "row", paddingVertical: 6.5, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.line }}><Text style={{ flex: 1, color: C.green }}>Discount</Text><Text style={{ width: 90, textAlign: "right", color: C.green }}>−{money(d.discount, d.currency)}</Text></View>}
          <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.ink }}><Text style={{ flex: 1, fontWeight: 700 }}>Total invoiced</Text><Text style={{ width: 90, textAlign: "right", fontWeight: 700 }}>{money(d.total, d.currency)}</Text></View>
          <View style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 14 }}><Text style={{ flex: 1, color: C.muted }}>Amount already paid</Text><Text style={{ width: 90, textAlign: "right" }}>{money(d.paid, d.currency)}</Text></View>
          <View style={{ flexDirection: "row", paddingVertical: 10, paddingHorizontal: 14, backgroundColor: C.cream }}><Text style={{ flex: 1, fontWeight: 700, fontSize: 11 }}>Remaining balance</Text><Text style={{ width: 90, textAlign: "right", fontFamily: F.head, fontWeight: 800, fontSize: 13 }}>{money(d.balance, d.currency)}</Text></View>
        </View>
        {d.notes ? <Text style={{ marginTop: 8, fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>{d.notes}</Text> : null}

        <View break id="howtopay" style={{ paddingTop: 2 }}>
          <Text style={s.eyebrow}>Next step</Text>
          <Text style={[s.h2, { marginTop: 3 }]}>How to pay</Text>
          <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
            {[["1", "Choose a method", "Pick the option below that suits you."], ["2", `Pay ${money(d.dueNow, d.currency)}`, `Use ${d.ref} as the payment reference.`], ["3", "Send us the receipt", "Reply by WhatsApp or email and we confirm right away."]].map(([n, h, p]) => (
              <View key={n} style={{ flex: 1, backgroundColor: C.cream, borderRadius: 12, padding: 12 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><Text style={{ color: C.gold, fontWeight: 700, fontSize: 10 }}>{n}</Text></View>
                <Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 11, marginTop: 7 }}>{h}</Text><Text style={{ fontSize: 8.5, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{p}</Text>
              </View>))}
          </View>
          <View style={{ marginTop: 14 }}>
            {d.methods.length ? d.methods.map((m) => <Method key={m.id} m={m} />) : <View style={[s.card, { backgroundColor: C.cream }]}><Text style={{ fontWeight: 700 }}>Payment details</Text><Text style={{ marginTop: 3, color: C.muted }}>Message us on WhatsApp{d.company.whatsapp ? ` (${d.company.whatsapp})` : ""} and we'll send your payment details right away.</Text></View>}
          </View>
          {d.terms.note ? <View style={{ flexDirection: "row", backgroundColor: C.cream, borderRadius: 10, padding: 10, marginTop: 2 }}><View style={{ marginRight: 7, marginTop: 1 }}><Icon name="info" size={12} color={C.gold700} /></View><Text style={{ flex: 1, fontSize: 8.8, lineHeight: 1.5, fontWeight: 600 }}>{d.terms.note}</Text></View> : null}
        </View>

        <View style={[s.row, { marginTop: 16, gap: 12 }]}>
          {d.terms.payment.length > 0 && <View wrap={false} style={[s.card, { flex: 1 }]}><Text style={s.eyebrow}>Payment terms</Text>{d.terms.payment.map((t, i) => <View key={i} style={{ flexDirection: "row", marginTop: 5 }}><Text style={{ color: C.gold700, marginRight: 5 }}>•</Text><Text style={{ flex: 1, fontSize: 8.8, lineHeight: 1.45 }}>{t}</Text></View>)}</View>}
          {d.terms.documents.length > 0 && <View wrap={false} style={[s.card, { flex: 1 }]}><Text style={s.eyebrow}>To finalise, please send</Text>{d.terms.documents.map((t, i) => <View key={i} style={{ flexDirection: "row", marginTop: 5 }}><View style={{ marginRight: 5, marginTop: 1 }}><Icon name="check" size={9} color={C.gold700} /></View><Text style={{ flex: 1, fontSize: 8.8, lineHeight: 1.45 }}>{t}</Text></View>)}</View>}
        </View>
        {d.terms.cancellation.length > 0 && <View wrap={false} style={[s.card, { marginTop: 12 }]}><Text style={s.eyebrow}>Cancellation policy</Text>{d.terms.cancellation.map((t, i) => <View key={i} style={{ flexDirection: "row", marginTop: 5 }}><Text style={{ color: C.gold700, marginRight: 5 }}>•</Text><Text style={{ flex: 1, fontSize: 8.8, lineHeight: 1.45 }}>{t}</Text></View>)}</View>}

        <View wrap={false} style={{ marginTop: 16, backgroundColor: C.ink, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 14, color: C.white }}>Questions? We're one message away.</Text>
            <Text style={{ fontSize: 8.8, color: "#CFC8BC", marginTop: 3 }}>{[d.company.whatsapp && `WhatsApp ${d.company.whatsapp}`, d.company.email, d.company.website].filter(Boolean).join("   ·   ")}</Text>
            {d.company.signatureName ? <Text style={{ fontSize: 8.5, color: C.gold, marginTop: 6 }}>{d.company.signatureName}{d.company.signatureTitle ? `, ${d.company.signatureTitle}` : ""}</Text> : null}
          </View>
          <Image src={LOGO} style={{ height: 34, objectFit: "contain" }} />
        </View>

        <View fixed style={s.footer}>
          <Text>{d.company.name}{d.company.licence ? `  ·  Licence ${d.company.licence}` : ""}{d.company.address ? `  ·  ${d.company.address}` : ""}</Text>
          <Text render={({ pageNumber, totalPages }) => `${d.number}  ·  Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
