import { AIProvider, AiAnalysisResult } from "./ai-provider.interface";

function extractJsonObject(input: string): Record<string, unknown> {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return {};
  }
}

export class OllamaProvider implements AIProvider {
  readonly provider = "ollama" as const;
  model: string;
  private readonly baseUrl: string;
  private resolvedModelAt = 0;

  constructor(baseUrl = process.env.OLLAMA_URL || "http://localhost:11434", model = process.env.OLLAMA_MODEL || "llama3") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.model = model;
  }

  async generateText(prompt: string): Promise<string> {
    const model = await this.resolveModel();
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 404 || text.toLowerCase().includes("model")) {
        this.resolvedModelAt = 0;
        const retryModel = await this.resolveModel(true);
        const retry = await fetch(`${this.baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: retryModel,
            prompt,
            stream: false
          })
        });
        if (retry.ok) {
          const data = (await retry.json()) as { response?: string };
          return data.response || "";
        }
        const retryText = await retry.text();
        throw new Error(`Ollama retry failed (${retry.status}): ${retryText}`);
      }
      throw new Error(`Ollama request failed (${response.status}): ${text}`);
    }
    const data = (await response.json()) as { response?: string };
    return data.response || "";
  }

  async analyzeDocument(text: string): Promise<AiAnalysisResult> {
    const prompt = [
      "You are an AI contract assistant. Analyze the following document and produce a structured summary including document type, key parties, key obligations, dates, financial terms, risks, and a plain English explanation.",
      'Return strict JSON with keys: "summary", "clauses", "risks", "suggestedFields", "parties".',
      'For clauses return array items like {"type":"payment|termination|renewal|liability|other","text":"..."}',
      'For suggestedFields return array items like {"type":"SIGNATURE|INITIAL|DATE|TEXT|CHECKBOX","page":1,"label":"..."}',
      "Document text:",
      text
    ].join("\n\n");
    const output = await this.generateText(prompt);
    const parsed = extractJsonObject(output);
    return {
      summary: (parsed.summary as string) || "No summary generated.",
      clauses: (parsed.clauses as AiAnalysisResult["clauses"]) || [],
      risks: (parsed.risks as string[]) || [],
      suggestedFields:
        (parsed.suggestedFields as AiAnalysisResult["suggestedFields"]) || [{ type: "SIGNATURE", page: 1, label: "Signature" }],
      parties: (parsed.parties as string[]) || []
    };
  }

  async explainClause(text: string, clause: string): Promise<string> {
    const prompt = [
      "Explain this legal clause in plain business language with practical implications.",
      "If relevant, include risk and what to negotiate.",
      `Contract context:\n${text.slice(0, 6000)}`,
      `Clause:\n${clause}`
    ].join("\n\n");
    const output = await this.generateText(prompt);
    return output || clause;
  }

  private async resolveModel(force = false) {
    const now = Date.now();
    if (!force && now - this.resolvedModelAt < 60_000) return this.model;

    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) return this.model;
    const tags = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
    const installed = (tags.models || [])
      .map((m) => (m.name || m.model || "").trim())
      .filter(Boolean);
    if (!installed.length) return this.model;

    const exact = installed.find((name) => name.toLowerCase() === this.model.toLowerCase());
    if (exact) {
      this.model = exact;
      this.resolvedModelAt = now;
      return this.model;
    }

    const preferredOrder = ["llama3", "llama3.2", "qwen2.5", "mistral", "phi3", "deepseek-r1", "llama2"];
    const preferred = preferredOrder
      .map((base) => installed.find((name) => name.toLowerCase().startsWith(base)))
      .find(Boolean);
    this.model = preferred || installed[0];
    this.resolvedModelAt = now;
    return this.model;
  }
}
