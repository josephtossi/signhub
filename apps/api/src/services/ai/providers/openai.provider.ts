import OpenAI from "openai";
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

export class OpenAIProvider implements AIProvider {
  readonly provider = "openai" as const;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(apiKey: string, model = process.env.OPENAI_MODEL || "gpt-4o-mini") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateText(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });
    return completion.choices[0]?.message?.content || "";
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
}

