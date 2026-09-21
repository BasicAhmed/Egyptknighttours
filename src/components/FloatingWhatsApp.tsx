"use client";
import { usePathname } from "next/navigation";
import { waLink } from "@/lib/format";
import { track } from "./Tracker";
// A help button that follows the visitor. Hidden where a page already has its own bottom booking bar.
export default function FloatingWhatsApp() {
  const p = usePathname() ?? "";
  if (p.startsWith("/book") || /^\/tours\/[^/]+$/.test(p)) return null;
  return (
    <aside aria-label="Quick help" className="fixed right-4 z-40 print:hidden" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
    <a href={waLink("Hi! I have a question about a tour in Egypt.")} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
      onClick={() => track("whatsapp_click", {})} className="btn btn-wa !min-h-[54px] !rounded-full !px-5">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5.1-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-1.5-.7-2.5-1.3-3.4-2.9-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.7.7-1 1.500-1 2.400 0 .3.100.600.200.900.4.900 1.600 2.600 3.700 3.500 1.300.600 1.800.600 2.400.500.400-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.1-1.200-.1-.100-.2-.2-.5-.3z"/></svg>
      <span className="hidden sm:inline">Chat with us</span>
    </a>
    </aside>
  );
}
