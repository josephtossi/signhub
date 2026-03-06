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
      return { answer: `AI key not configured. Question received: "${question}".` };
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
}

