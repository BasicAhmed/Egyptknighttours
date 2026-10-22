// ---------- Calling Claude (Anthropic Messages API) ----------
// Plain fetch, no extra package. The key is read on the server only (ANTHROPIC_API_KEY) and never reaches a browser.
import { MODELS, type ModelKey, type Usage } from "./rules";

export type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export type Message = { role: "user" | "assistant"; content: string | ContentBlock[] };
export type ClaudeReply = { content: ContentBlock[]; stopReason: string; usage: Usage };

export const aiConfigured = () => !!(process.env.ANTHROPIC_API_KEY ?? "").trim();

export class AiError extends Error { constructor(message: string, public readonly status = 500) { super(message); } }

// The fixed parts (instructions and tool list) are marked for caching, so each next turn reads them at a fraction of the price.
export async function callClaude(o: { model: ModelKey; system: string; messages: Message[]; tools: ToolDef[]; maxTokens: number; fetchImpl?: typeof fetch }): Promise<ClaudeReply> {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!key) throw new AiError("The AI assistant isn't set up yet (ANTHROPIC_API_KEY is missing).", 503);
  const tools = o.tools.map((t, i) => (i === o.tools.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t));
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const r = await (o.fetchImpl ?? fetch)(process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODELS[o.model], max_tokens: o.maxTokens, system: [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }], tools, messages: o.messages }),
    });
    const j = (await r.json().catch(() => ({}))) as { content?: ContentBlock[]; stop_reason?: string; usage?: Usage; error?: { message?: string } };
    if (!r.ok) throw new AiError(r.status === 429 || r.status === 529 ? "The AI is busy right now. Please try again in a minute." : `The AI couldn't answer (${j.error?.message ?? r.status}).`, r.status === 429 || r.status === 529 ? 503 : 502);
    return { content: j.content ?? [], stopReason: j.stop_reason ?? "end_turn", usage: j.usage ?? { input_tokens: 0, output_tokens: 0 } };
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError((e as Error).name === "AbortError" ? "The AI took too long to answer. Please try again." : "The AI couldn't be reached. Please try again.", 503);
  } finally { clearTimeout(timer); }
}
