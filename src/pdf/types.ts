export type Company = { name: string; email: string; phone: string; phone2: string; whatsapp: string; address: string; website: string; licence: string; signatureName: string; signatureTitle: string; builder?: string };
export type PayMethod = { id: string; kind: string; label: string; currency: string; bankName: string; accountName: string; accountNumber: string; iban: string; swift: string; branch: string; bankAddress: string; instructions: string; paymentUrl: string };
export type InvoiceData = {
  number: string; issuedAt: string; currency: string; ref: string;
  customer: { name: string; email: string; phone: string; country: string };
  trip: { title: string; destination: string; date: string; travelers: string; style: string; pickup: string; includes: string[] };
  lines: { label: string; amount: number }[]; subtotal: number; discount: number; extras: { label: string; amount: number }[];
  total: number; paid: number; balance: number; dueNow: number; deadline: string; deadlineNote: string;
  methods: PayMethod[]; ctaUrl: string; trackUrl: string;
  terms: { payment: string[]; documents: string[]; cancellation: string[]; note: string };
  company: Company; notes: string;
};

export type BlockType = "ACTIVITY" | "TOUR" | "TRANSPORT" | "TRANSFER" | "FLIGHT" | "HOTEL" | "MEAL" | "FREE_TIME" | "NOTE" | "MEETING_POINT" | "GUIDE" | "INFO";
export type Block = { id: string; type: BlockType; time: string; title: string; description: string; location: string; link: string; imageUrl: string; notes: string };
export type Day = { id: string; title: string; hook: string; location: string; date: string; imageUrl: string; hotel: { name: string; stars: string; notes: string; link: string }; blocks: Block[]; notes: string };
export type ItineraryContent = {
  title: string; subtitle: string; intro: string; coverImageUrl: string; customerName: string; travelers: string; startDate: string; endDate: string;
  destinations: string[]; highlights: string[]; days: Day[]; included: string[]; excluded: string[]; important: string[];
  priceLabel: string; paymentTerms: string; ctaUrl: string; ctaLabel: string; sceneKind: string;
};
export type ItineraryPdfData = { content: ItineraryContent; ref: string; company: Company; ctaUrl: string; generatedAt: string; images: Record<string, string> };
