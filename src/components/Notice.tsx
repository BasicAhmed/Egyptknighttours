export default function Notice({ n, e }: { n?: string; e?: string }) {
  if (!n && !e) return null;
  return <p role={e ? "alert" : "status"} className={`mb-4 rounded-xl p-3 text-sm font-medium ${e ? "bg-red-50 text-red-800" : "bg-[#E9F6EE] text-[#17663A]"}`}>{e ?? n}</p>;
}
