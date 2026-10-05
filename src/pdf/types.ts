export type Company = { name: string; email: string; phone: string; phone2: string; whatsapp: string; address: string; website: string; licence: string; signatureName: string; signatureTitle: string; builder?: string };
export type PayMethod = { id: string; kind: string; label: string; currency: string; bankName: string; accountName: string; accountNumber: string; iban: string; swift: string; branch: string; bankAddress: string; instructions: string; paymentUrl: string };
export type CorporateInvoiceData = {
  ref: string; issuedAt: string; currency: string; status: string;
  company: Company; // Egypt Knight Tours's own details, for the header/footer
  bill: { name: string; contact: string; email: string; phone: string }; // the requesting company being billed
  guest: { name: string; contact: string; count: number | null }; // the end customer, if known
  serviceDate: string; location: string; notes: string; requirements: string;
  pricingMode: string; servicePercent: number | null; subtotal: number; // ITEMIZED ignores these; PERCENTAGE shows subtotal + service% = total
  services: { type: string; label: string; date: string; time: string; location: string; people: number | null; price: number }[];
  total: number; methods: PayMethod[];
};
export type InvoiceData = {
  number: string; issuedAt: string; currency: string; ref: string;
  customer: { name: string; email: string; phone: string; country: string };
  trip: { title: string; destination: string; date: string; travelers: string; style: string; pickup: string; includes: string[] };
  lines: { label: string; amount: number }[]; subtotal: number; discount: number; extras: { label: string; amount: number }[];
  total: number; paid: number; balance: number; dueNow: number; deadline: string; deadlineNote: string;
  methods: PayMethod[]; ctaUrl: string; trackUrl: string;
  terms: { payment: string[]; documents: string[]; cancellation: string[]; note: string };
  company: Company; notes: string;
  // The marketplace that collected the money ("Viator"), when there is one. A settled invoice then says so and carries no "How to pay".
  prepaidVia?: string;
};

export type BlockType = "ACTIVITY" | "TOUR" | "TRANSPORT" | "TRANSFER" | "FLIGHT" | "HOTEL" | "MEAL" | "FREE_TIME" | "NOTE" | "MEETING_POINT" | "GUIDE" | "INFO";
export type Block = { id: string; type: BlockType; time: string; title: string; description: string; location: string; link: string; imageUrl: string; notes: string };
export type Day = { id: string; title: string; hook: string; location: string; date: string; imageUrl: string; hotel: { name: string; stars: string; notes: string; link: string }; blocks: Block[]; notes: string };
export type ItineraryContent = {
  title: string; subtitle: string; intro: string; coverImageUrl: string; customerName: string; travelers: string; startDate: string; endDate: string;
  destinations: string[]; highlights: string[]; days: Day[]; included: string[]; excluded: string[]; important: string[];
  priceLabel: string; paymentTerms: string; ctaUrl: string; ctaLabel: string; sceneKind: string;
  // Explicit trip length shown on the PDF ("8 days · 7 nights"). null means: derive from the number of day blocks below (days.length, nights = days - 1) —
  // the old behavior, kept as the default so existing itineraries are unaffected. Set explicitly when the day-by-day blocks don't line up 1:1 with the
  // actual trip length (a summary itinerary with fewer detailed blocks than calendar days, a cruise leg counted in nights only, etc.).
  durationDays: number | null; durationNights: number | null;
};
// showPrice false: the customer's copy carries no price, payment terms or pay button (the order was prepaid through a marketplace
// such as Viator, or staff switched the price off for this itinerary). Absent on documents made before the switch existed: those
// are drawn exactly as they were.
export type ItineraryPdfData = { content: ItineraryContent; ref: string; company: Company; ctaUrl: string; generatedAt: string; images: Record<string, string>; showPrice?: boolean };

export type FinanceReportData = {
  label: string; from: string; to: string; currency: string; generatedAt: string; company: Company;
  revenue: number; cost: number; profit: number; margin: number | null;
  paymentCount: number; bookingCount: number; noCostCount: number; noCostRevenue: number;
  byTour: { title: string; bookings: number; revenue: number; cost: number; profit: number; margin: number | null }[];
  corporateRevenue: number; corporateCost: number; corporateProfit: number; corporatePaymentCount: number; corporateRequestCount: number;
  byCorporate: { ref: string; companyName: string; revenue: number; cost: number; profit: number; margin: number | null }[];
};
