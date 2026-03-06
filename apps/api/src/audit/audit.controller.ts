import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuditService } from "./audit.service";

@UseGuards(JwtAuthGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("envelope/:envelopeId")
  list(@Param("envelopeId") envelopeId: string) {
    return this.auditService.list(envelopeId);
  }
}
