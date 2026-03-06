import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateEnvelopeDto } from "./dto/create-envelope.dto";
import { EnvelopesService } from "./envelopes.service";
import { SaveFieldsDto } from "./dto/save-fields.dto";

@UseGuards(JwtAuthGuard)
@Controller("envelopes")
export class EnvelopesController {
  constructor(private readonly envelopesService: EnvelopesService) {}

  @Post()
  create(@CurrentUser("sub") userId: string, @Body() dto: CreateEnvelopeDto) {
    return this.envelopesService.create(userId, dto);
  }

  @Get()
  list(
    @CurrentUser("sub") userId: string,
    @Query("status") status?: string,
    @Query("scope") scope?: "owner" | "inbox" | "all"
  ) {
    return this.envelopesService.list(userId, status, scope);
  }

  @Post(":id/send")
  send(@CurrentUser("sub") userId: string, @Param("id") id: string) {
    return this.envelopesService.send(userId, id);
  }

  @Post("send")
  sendByBody(@CurrentUser("sub") userId: string, @Body("envelopeId") envelopeId: string) {
    return this.envelopesService.send(userId, envelopeId);
  }

  @Get("dashboard")
  dashboard(@CurrentUser("sub") userId: string) {
    return this.envelopesService.dashboard(userId);
  }

  @Get(":id/status")
  status(@CurrentUser("sub") userId: string, @Param("id") id: string) {
    return this.envelopesService.status(userId, id);
  }

  @Get(":id")
  getById(@CurrentUser("sub") userId: string, @Param("id") id: string) {
    return this.envelopesService.getById(userId, id);
  }

  @Post(":id/recipients")
  saveRecipients(
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
    @Body("recipients") recipients: CreateEnvelopeDto["recipients"]
  ) {
    return this.envelopesService.upsertRecipients(userId, id, recipients || []);
  }

  @Get(":id/fields")
  listFields(@Param("id") id: string) {
    return this.envelopesService.listFields(id);
  }

  @Post(":id/fields")
  saveFields(@CurrentUser("sub") userId: string, @Param("id") id: string, @Body() dto: SaveFieldsDto) {
    return this.envelopesService.saveFields(userId, id, dto);
  }

}
