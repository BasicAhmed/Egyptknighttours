// ---------- The agent loop ----------
// Claude answers, or asks to use one of our tools; we run the tool (our own checked code, never anything else), give it the
// result, and repeat, up to a fixed number of steps. Tool results are data, and are labelled as such.
import { callClaude, AiError, type ContentBlock, type Message, type ToolDef } from "./claude";
import { costOf, LIMITS, type ModelKey } from "./rules";
import { underCap, recordUsage } from "./budget";

export type Tool<C> = ToolDef & { run: (input: Record<string, unknown>, ctx: C) => Promise<unknown> };
export type AgentResult = { reply: string; messages: Message[]; cost: number };

export async function runAgent<C>(o: { scope: "CUSTOMER" | "STAFF"; model: ModelKey; system: string; history: Message[]; tools: Tool<C>[]; ctx: C; capUsd: number; fetchImpl?: typeof fetch }): Promise<AgentResult> {
  const messages = [...o.history]; let cost = 0;
  const defs: ToolDef[] = o.tools.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
  for (let step = 0; step < LIMITS.maxSteps; step++) {
    if (!(await underCap(o.capUsd))) throw new AiError("The AI assistant has reached today's limit. Please try again tomorrow, or message us on WhatsApp.", 503);
    const r = await callClaude({ model: o.model, system: o.system, messages, tools: defs, maxTokens: LIMITS.maxOutputTokens, fetchImpl: o.fetchImpl });
    const c = costOf(o.model, r.usage); cost += c;
    await recordUsage(o.scope, { input: r.usage.input_tokens + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0), output: r.usage.output_tokens, cost: c });
    messages.push({ role: "assistant", content: r.content });
    const calls = r.content.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");
    if (r.stopReason !== "tool_use" || !calls.length) return { reply: r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim(), messages, cost };
    const results: ContentBlock[] = [];
    for (const call of calls) {
      const tool = o.tools.find((t) => t.name === call.name);
      try {
        if (!tool) throw new Error(`Unknown tool ${call.name}`);
        const out = await tool.run(call.input ?? {}, o.ctx);
        results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(out).slice(0, 12_000) });
      } catch (e) { results.push({ type: "tool_result", tool_use_id: call.id, content: e instanceof Error ? e.message : "That didn't work.", is_error: true }); }
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: "I need a moment to think this through. Could you ask that again in a simpler way?", messages, cost };
}

// Keeps a stored conversation small (cheap): the latest turns only, never starting with a dangling tool result.
export function trimHistory(messages: Message[], keep: number): Message[] {
  if (messages.length <= keep) return messages;
  let out = messages.slice(-keep);
  while (out.length && (out[0].role !== "user" || (Array.isArray(out[0].content) && out[0].content.some((b) => b.type === "tool_result")))) out = out.slice(1);
  return out;
}
