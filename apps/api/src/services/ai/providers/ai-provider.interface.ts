export type AiAnalysisResult = {
  summary: string;
  clauses: { type: string; text: string }[];
  risks: string[];
  suggestedFields: { type: string; page: number; label: string }[];
  parties: string[];
};

export interface AIProvider {
  readonly provider: "openai" | "ollama" | "heuristic";
  readonly model: string;
  generateText(prompt: string): Promise<string>;
  analyzeDocument(text: string): Promise<AiAnalysisResult>;
  explainClause(text: string, clause: string): Promise<string>;
}

