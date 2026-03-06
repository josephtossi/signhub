import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AiService } from "./ai.service";

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("status")
  status() {
    return this.aiService.status();
  }

  @Post("analyze-document")
  analyze(@Body("documentId") documentId: string) {
    return this.aiService.analyzeDocument(documentId);
  }

  @Post("chat")
  chat(@Body("documentId") documentId: string, @Body("question") question: string) {
    return this.aiService.chat(documentId, question);
  }

  @Post("explain-clause")
  explain(@Body("clause") clause: string) {
    return this.aiService.explainClause(clause);
  }
}
