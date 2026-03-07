import { AIProvider, AiAnalysisResult } from "./ai-provider.interface";

export class HeuristicProvider implements AIProvider {
  readonly provider = "heuristic" as const;
  readonly model = "heuristic";

  async generateText(prompt: string): Promise<string> {
    return `Heuristic response (limited mode): ${prompt.slice(0, 500)}`;
  }

  async analyzeDocument(text: string): Promise<AiAnalysisResult> {
    const lower = text.toLowerCase();
    const clauses: { type: string; text: string }[] = [];
    if (lower.includes("payment")) clauses.push({ type: "payment", text: "Payment-related terms detected." });
    if (lower.includes("termination")) clauses.push({ type: "termination", text: "Termination terms detected." });
    if (lower.includes("renewal")) clauses.push({ type: "renewal", text: "Renewal terms detected." });
    if (lower.includes("liability")) clauses.push({ type: "liability", text: "Liability terms detected." });

    const parties = Array.from(new Set((text.match(/[A-Z][A-Za-z0-9&., ]+(LLC|Inc|Ltd|Corporation)/g) || []).slice(0, 6)));
    const risks = [];
    if (!lower.includes("termination")) risks.push("No explicit termination clause detected.");
    if (!lower.includes("liability")) risks.push("Liability language may be missing.");

    return {
      summary: text.slice(0, 800).trim() || "No text extracted.",
      clauses,
      risks,
      suggestedFields: [{ type: "SIGNATURE", page: 1, label: "Signature" }],
      parties
    };
  }

  async explainClause(_text: string, clause: string): Promise<string> {
    return `Plain-language explanation: ${clause}`;
  }
}

