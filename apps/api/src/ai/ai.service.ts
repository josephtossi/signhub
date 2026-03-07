import { Injectable, NotFoundException } from "@nestjs/common";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { DocumentsService } from "../documents/documents.service";

type AnalysisResult = {
  summary: string;
  clauses: { type: string; text: string }[];
  risks: string[];
  suggestedFields: { type: string; page: number; label: string }[];
  parties: string[];
};

@Injectable()
export class AiService {
  private readonly openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  private readonly docTextCache = new Map<string, string>();

  constructor(private readonly documentsService: DocumentsService) {}

  status() {
    return { enabled: true, provider: this.openai ? "openai" : "heuristic" };
  }

  async analyzeDocument(documentId: string): Promise<AnalysisResult> {
    const text = await this.getDocumentText(documentId);

    if (this.openai) {
      const prompt = [
        "Analyze the contract and return JSON with keys:",
        "summary, clauses (payment,termination,renewal,liability), risks, suggestedFields, parties.",
        "Keep results concise and practical."
      ].join(" ");
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text.slice(0, 12000) }
        ]
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return {
        summary: parsed.summary || "No summary generated.",
        clauses: parsed.clauses || [],
        risks: parsed.risks || [],
        suggestedFields: parsed.suggestedFields || [{ type: "SIGNATURE", page: 1, label: "Signature" }],
        parties: parsed.parties || []
      };
    }

    return this.heuristicAnalysis(text);
  }

  async chat(documentId: string, question: string) {
    const text = await this.getDocumentText(documentId);
    if (!this.openai) {
      return { answer: this.heuristicAnswer(text, question) };
    }

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are a contract assistant. Answer only from the provided contract text." },
        { role: "user", content: `Contract text:\n${text.slice(0, 12000)}\n\nQuestion: ${question}` }
      ]
    });
    return { answer: completion.choices[0]?.message?.content || "No answer generated." };
  }

  async explainClause(clause: string) {
    if (!this.openai) {
      return { explanation: `Plain-language explanation: ${clause}` };
    }
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Explain legal text in plain business language." },
        { role: "user", content: clause }
      ]
    });
    return { explanation: completion.choices[0]?.message?.content || clause };
  }

  private async getDocumentText(documentId: string) {
    const cached = this.docTextCache.get(documentId);
    if (cached) return cached;

    const latest = await this.documentsService.getLatestFile(documentId);
    if (!latest?.file) throw new NotFoundException("Document file not found");
    const parsed = await pdfParse(latest.file);
    const text = parsed.text || "";
    this.docTextCache.set(documentId, text);
    return text;
  }

  private heuristicAnalysis(text: string): AnalysisResult {
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
      summary: text.slice(0, 600).trim() || "No text extracted.",
      clauses,
      risks,
      suggestedFields: [{ type: "SIGNATURE", page: 1, label: "Signature" }],
      parties
    };
  }

  private heuristicAnswer(text: string, question: string) {
    const q = question.trim().toLowerCase();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 20);
    if (!lines.length) return "No extractable text found in this document.";

    const keywords = q.split(/\s+/).filter((k) => k.length > 3);
    const ranked = lines
      .map((line) => ({
        line,
        score: keywords.reduce((acc, key) => (line.toLowerCase().includes(key) ? acc + 1 : acc), 0)
      }))
      .sort((a, b) => b.score - a.score);

    const top = ranked.filter((r) => r.score > 0).slice(0, 3).map((r) => r.line);
    if (!top.length) {
      return "No direct matching clause found. Try asking about payment, termination, renewal, or liability.";
    }
    return top.join(" ");
  }
}
