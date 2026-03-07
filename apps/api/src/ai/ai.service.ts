import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import pdfParse from "pdf-parse";
import { DocumentsService } from "../documents/documents.service";
import { AIProvider, AiAnalysisResult } from "../services/ai/providers/ai-provider.interface";
import { HeuristicProvider } from "../services/ai/providers/heuristic.provider";
import { OllamaProvider } from "../services/ai/providers/ollama.provider";
import { OpenAIProvider } from "../services/ai/providers/openai.provider";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly docTextCache = new Map<string, string>();
  private readonly heuristicProvider = new HeuristicProvider();
  private readonly openAiProvider = process.env.OPENAI_API_KEY ? new OpenAIProvider(process.env.OPENAI_API_KEY) : null;
  private readonly ollamaProvider = new OllamaProvider();

  constructor(private readonly documentsService: DocumentsService) {}

  async status() {
    const provider = await this.resolveProvider();
    return { enabled: true, provider: provider.provider, model: provider.model };
  }

  async analyzeDocument(documentId: string): Promise<AiAnalysisResult> {
    if (!documentId?.trim()) {
      throw new BadRequestException("documentId is required");
    }
    const text = await this.getDocumentText(documentId);
    const provider = await this.resolveProvider();
    const condensed = await this.prepareLargeDocumentContext(text, provider);
    try {
      const primary = await provider.analyzeDocument(condensed);
      return await this.enrichAnalysis(primary, condensed);
    } catch (error) {
      this.logger.warn(`Provider ${provider.provider} analyze failed, falling back to heuristic: ${(error as Error).message}`);
      const fallbackContext = condensed.slice(0, 18000);
      return this.heuristicProvider.analyzeDocument(fallbackContext);
    }
  }

  async chat(documentId: string, question: string) {
    if (!documentId?.trim()) {
      throw new BadRequestException("documentId is required");
    }
    if (!question?.trim()) {
      throw new BadRequestException("question is required");
    }
    const text = await this.getDocumentText(documentId);
    const provider = await this.resolveProvider();
    const condensed = await this.prepareLargeDocumentContext(text, provider);
    const prompt = [
      "You are a contract assistant. Answer only from the provided contract text.",
      "If the answer is uncertain, state that clearly.",
      `Contract text:\n${condensed}`,
      `Question: ${question}`
    ].join("\n\n");
    try {
      const answer = await provider.generateText(prompt);
      return { answer: answer || "No answer generated." };
    } catch (error) {
      this.logger.warn(`Provider ${provider.provider} chat failed, using heuristic: ${(error as Error).message}`);
      return { answer: this.heuristicAnswer(condensed, question) };
    }
  }

  async explainClause(clause: string) {
    if (!clause?.trim()) {
      throw new BadRequestException("clause is required");
    }
    const provider = await this.resolveProvider();
    try {
      const explanation = await provider.explainClause("", clause);
      return { explanation: explanation || clause };
    } catch (error) {
      this.logger.warn(`Provider ${provider.provider} explain failed, using heuristic: ${(error as Error).message}`);
      return { explanation: `Plain-language explanation: ${clause}` };
    }
  }

  private async getDocumentText(documentId: string) {
    const cached = this.docTextCache.get(documentId);
    if (cached) return cached;
    try {
      const latest = await this.documentsService.getLatestFile(documentId);
      if (!latest?.file) throw new NotFoundException("Document file not found");
      if (latest.file.length < 5) {
        throw new BadRequestException("Document file is empty or corrupted");
      }
      const pdfHeader = latest.file.subarray(0, 5).toString("utf8");
      if (!pdfHeader.startsWith("%PDF-")) {
        throw new BadRequestException("Stored file is not a valid PDF");
      }
      const parsed = await pdfParse(latest.file);
      const text = (parsed.text || "").trim();
      if (!text) {
        throw new BadRequestException("No extractable text found in this PDF. Try a text-based PDF file.");
      }
      this.docTextCache.set(documentId, text);
      return text;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { message?: string; code?: string; name?: string };
      const msg = (err.message || "").toLowerCase();
      const code = (err.code || "").toLowerCase();
      if (code.includes("enoent") || msg.includes("nosuchkey") || msg.includes("not found")) {
        throw new NotFoundException("Document binary not found in storage. Please re-upload the document.");
      }
      if (msg.includes("invalid pdf") || msg.includes("xref") || msg.includes("formaterror") || msg.includes("bad xref")) {
        throw new BadRequestException("PDF parsing failed. Please upload a standard text-based PDF.");
      }
      this.logger.error(`Failed to extract document text for ${documentId}: ${err.message || "unknown error"}`);
      throw new InternalServerErrorException(
        `Failed to read document text for AI analysis: ${err.message || "unknown error"}`
      );
    }
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

  private splitText(text: string, size = 12000) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  private async prepareLargeDocumentContext(text: string, provider: AIProvider) {
    const maxInput = 18000;
    if (text.length <= maxInput) return text;

    const chunks = this.splitText(text, 10000);
    const chunkSummaries: string[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const prompt = [
        `You are summarizing chunk ${i + 1} of ${chunks.length} from a legal contract.`,
        "Capture: parties, obligations, dates, money terms, liabilities, termination, renewals, and signature requirements.",
        "Keep output concise and factual.",
        chunks[i]
      ].join("\n\n");
      try {
        const summary = await provider.generateText(prompt);
        chunkSummaries.push(summary || chunks[i].slice(0, 800));
      } catch {
        chunkSummaries.push(chunks[i].slice(0, 800));
      }
    }

    const combined = chunkSummaries.join("\n\n");
    if (combined.length <= maxInput) return combined;
    return combined.slice(0, maxInput);
  }

  private async resolveProvider(): Promise<AIProvider> {
    const forced = (process.env.AI_PROVIDER || "auto").trim().toLowerCase();

    if (forced === "openai" && this.openAiProvider) return this.openAiProvider;
    if (forced === "ollama") {
      if (await this.isOllamaReachable()) return this.ollamaProvider;
      return this.heuristicProvider;
    }
    if (forced === "heuristic") return this.heuristicProvider;

    if (this.openAiProvider) return this.openAiProvider;
    if (await this.isOllamaReachable()) return this.ollamaProvider;
    return this.heuristicProvider;
  }

  private async enrichAnalysis(primary: AiAnalysisResult, text: string): Promise<AiAnalysisResult> {
    const fallback = await this.heuristicProvider.analyzeDocument(text);
    const clauses = primary.clauses?.length ? primary.clauses : fallback.clauses;
    const risks = primary.risks?.length ? primary.risks : fallback.risks;
    const parties = primary.parties?.length ? primary.parties : fallback.parties;
    const suggestedFields = primary.suggestedFields?.length ? primary.suggestedFields : fallback.suggestedFields;
    const summary = primary.summary?.trim() ? primary.summary : fallback.summary;
    return { summary, clauses, risks, parties, suggestedFields };
  }

  private async isOllamaReachable() {
    const base = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(`${base}/api/tags`, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
