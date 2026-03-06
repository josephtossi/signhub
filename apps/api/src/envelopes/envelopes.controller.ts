import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
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

  @Post(":id/send")
  send(@Param("id") id: string) {
    return this.envelopesService.send(id);
  }

  @Post("send")
  sendByBody(@Body("envelopeId") envelopeId: string) {
    return this.envelopesService.send(envelopeId);
  }

  @Get("dashboard")
  dashboard(@CurrentUser("sub") userId: string) {
    return this.envelopesService.dashboard(userId);
  }

  @Get(":id/status")
  status(@Param("id") id: string) {
    return this.envelopesService.status(id);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.envelopesService.getById(id);
  }

  @Post(":id/recipients")
  saveRecipients(@Param("id") id: string, @Body("recipients") recipients: CreateEnvelopeDto["recipients"]) {
    return this.envelopesService.upsertRecipients(id, recipients || []);
  }

  @Get(":id/fields")
  listFields(@Param("id") id: string) {
    return this.envelopesService.listFields(id);
  }

  @Post(":id/fields")
  saveFields(@Param("id") id: string, @Body() dto: SaveFieldsDto) {
    return this.envelopesService.saveFields(id, dto);
  }

}
