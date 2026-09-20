import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

// AES-256-GCM. Passport scans and numbers are encrypted before they reach the database.
// Set FILE_ENCRYPTION_KEY (any long random string) to use a dedicated key. Otherwise the key is derived from AUTH_SECRET,
// which means changing AUTH_SECRET would make existing files unreadable.
function key(): Buffer {
  const k = (process.env.FILE_ENCRYPTION_KEY ?? "").trim();
  if (k) return createHash("sha256").update(k).digest();
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET (or FILE_ENCRYPTION_KEY) must be set to store passport files");
  return Buffer.from(hkdfSync("sha256", s, "egk-files-salt", "egk-file-encryption", 32));
}
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([Buffer.from([1]), iv, c.getAuthTag(), ct]); // version, iv, tag, ciphertext
}
export function decryptBuffer(blob: Buffer): Buffer {
  if (blob[0] !== 1) throw new Error("Unknown file format");
  const iv = blob.subarray(1, 13), tag = blob.subarray(13, 29), ct = blob.subarray(29);
  const d = createDecipheriv("aes-256-gcm", key(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]);
}
export const encryptText = (t: string) => (t ? "enc1:" + encryptBuffer(Buffer.from(t, "utf8")).toString("base64") : "");
export function decryptText(v: string | null | undefined): string {
  if (!v) return ""; if (!v.startsWith("enc1:")) return v;
  try { return decryptBuffer(Buffer.from(v.slice(5), "base64")).toString("utf8"); } catch { return ""; }
}
