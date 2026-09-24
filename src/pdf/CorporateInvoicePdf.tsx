import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import { C, F, LOGO, registerFonts } from "./theme";
import { money, dLong } from "./format";
import type { CorporateInvoiceData } from "./types";

registerFonts();
const s = StyleSheet.create({
  page: { fontFamily: F.body, fontSize: 9.5, color: C.ink, paddingTop: 34, paddingBottom: 62, paddingHorizontal: 38, backgroundColor: C.white },
  row: { flexDirection: "row" },
  eyebrow: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.6, color: C.gold700, textTransform: "uppercase" },
  muted: { color: C.muted },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14 },
  th: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 22, left: 38, right: 38, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 7, paddingHorizontal: 12 },
  th2: { flexDirection: "row", backgroundColor: C.soft, paddingVertical: 8, paddingHorizontal: 12 },
});
function Field({ k, v }: { k: string; v: string }) {
  if (!v) return null;
  return <View style={{ flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.line }}><Text style={{ width: 78, color: C.muted, fontSize: 8.5 }}>{k}</Text><Text style={{ flex: 1, fontWeight: 600, fontSize: 9.5 }}>{v}</Text></View>;
}

export default function CorporateInvoicePdf({ d }: { d: CorporateInvoiceData }) {
  return (
    <Document title={`Invoice ${d.ref}`} author={d.company.name} subject={`Corporate request ${d.ref}`}>
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
          <Image src={LOGO} style={{ height: 40, objectFit: "contain" }} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.eyebrow}>Service invoice</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 15, marginTop: 3 }}>{d.ref}</Text>
            <Text style={[s.muted, { fontSize: 8, marginTop: 1 }]}>Issued {dLong(d.issuedAt)}</Text>
          </View>
        </View>

        <View style={[s.row, { marginTop: 18, gap: 12 }]}>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.eyebrow}>Bill to</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 14, marginTop: 4 }}>{d.bill.name}</Text>
            <View style={{ marginTop: 6 }}><Field k="Contact" v={d.bill.contact} /><Field k="Email" v={d.bill.email} /><Field k="Phone" v={d.bill.phone} /></View>
          </View>
          {d.guest.name ? <View style={[s.card, { flex: 1 }]}>
            <Text style={s.eyebrow}>For guest</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 14, marginTop: 4 }}>{d.guest.name}</Text>
            <View style={{ marginTop: 6 }}><Field k="Contact" v={d.guest.contact} /><Field k="Travelers" v={d.guest.count != null ? String(d.guest.count) : ""} /><Field k="Location" v={d.location} /></View>
          </View> : <View style={[s.card, { flex: 1 }]}>
            <Text style={s.eyebrow}>Request details</Text>
            <View style={{ marginTop: 6 }}><Field k="Date" v={d.serviceDate ? dLong(d.serviceDate) : ""} /><Field k="Location" v={d.location} /><Field k="Status" v={d.status} /></View>
          </View>}
        </View>

        <View wrap={false} style={[s.card, { marginTop: 14, padding: 0, overflow: "hidden" }]}>
          <View style={s.th2}>
            <Text style={[s.th, { flex: 2.2 }]}>Service</Text><Text style={[s.th, { flex: 1 }]}>Date</Text><Text style={[s.th, { flex: 1.3 }]}>Location</Text><Text style={[s.th, { flex: 0.6, textAlign: "right" }]}>Qty</Text><Text style={[s.th, { flex: 0.9, textAlign: "right" }]}>Price</Text>
          </View>
          {d.services.map((sv, i) => (
            <View key={i} style={s.tr}>
              <Text style={{ flex: 2.2, fontWeight: 700 }}>{sv.type}{sv.label ? ` — ${sv.label}` : ""}</Text>
              <Text style={{ flex: 1 }}>{sv.date ? dLong(sv.date) : "—"}{sv.time ? ` ${sv.time}` : ""}</Text>
              <Text style={{ flex: 1.3 }}>{sv.location || "—"}</Text>
              <Text style={{ flex: 0.6, textAlign: "right" }}>{sv.people ?? "—"}</Text>
              <Text style={{ flex: 0.9, textAlign: "right" }}>{money(sv.price, d.currency)}</Text>
            </View>
          ))}
          {!d.services.length && <View style={s.tr}><Text style={{ flex: 1, color: C.muted }}>No services added yet.</Text></View>}
          <View style={{ flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.cream }}>
            <Text style={{ flex: 1, fontWeight: 700, fontSize: 11 }}>Total</Text>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 13 }}>{money(d.total, d.currency)}</Text>
          </View>
        </View>

        {(d.notes || d.requirements) ? <View style={[s.row, { marginTop: 12, gap: 12 }]}>
          {d.notes && <View style={[s.card, { flex: 1 }]}><Text style={s.eyebrow}>Notes</Text><Text style={{ marginTop: 4, fontSize: 9, lineHeight: 1.5 }}>{d.notes}</Text></View>}
          {d.requirements && <View style={[s.card, { flex: 1 }]}><Text style={s.eyebrow}>Additional requirements</Text><Text style={{ marginTop: 4, fontSize: 9, lineHeight: 1.5 }}>{d.requirements}</Text></View>}
        </View> : null}

        <View style={{ marginTop: 16 }}>
          <Text style={s.eyebrow}>Payment</Text>
          {d.methods.length ? d.methods.map((m) => (
            <View key={m.id} wrap={false} style={[s.card, { marginTop: 8 }]}>
              <Text style={{ fontFamily: F.head, fontWeight: 700, fontSize: 11 }}>{m.label}{m.currency ? `  ·  ${m.currency}` : ""}</Text>
              {m.kind === "BANK" ? <View style={{ marginTop: 6 }}>
                <Field k="Account name" v={m.accountName} /><Field k="Bank" v={m.bankName} /><Field k="Account number" v={m.accountNumber} /><Field k="IBAN" v={m.iban} /><Field k="SWIFT / BIC" v={m.swift} />
              </View> : null}
              {m.paymentUrl ? <Link src={m.paymentUrl} style={{ color: C.nile, fontWeight: 700, fontSize: 9.5, marginTop: 6 }}>{m.paymentUrl}</Link> : null}
              {m.instructions ? <Text style={{ marginTop: 6, fontSize: 8.5, color: C.muted, lineHeight: 1.5 }}>{m.instructions}</Text> : null}
            </View>
          )) : <View style={[s.card, { marginTop: 8, backgroundColor: C.cream }]}><Text style={{ color: C.muted }}>Contact us directly for payment details.</Text></View>}
        </View>

        <View wrap={false} style={{ marginTop: 16, backgroundColor: C.ink, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: F.head, fontWeight: 800, fontSize: 13, color: C.white }}>Questions about this invoice?</Text>
            <Text style={{ fontSize: 8.8, color: "#CFC8BC", marginTop: 3 }}>{[d.company.whatsapp && `WhatsApp ${d.company.whatsapp}`, d.company.email].filter(Boolean).join("   ·   ")}</Text>
          </View>
          <Image src={LOGO} style={{ height: 30, objectFit: "contain" }} />
        </View>

        <View fixed style={s.footer}>
          <Text>{d.company.name}{d.company.licence ? `  ·  Licence ${d.company.licence}` : ""}</Text>
          <Text render={({ pageNumber, totalPages }) => `${d.ref}  ·  Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
