import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateEnvelopeDto } from "./dto/create-envelope.dto";
import { EnvelopesService } from "./envelopes.service";
import { SaveFieldsDto } from "./dto/save-fields.dto";

@UseGuards(JwtAuthGuard)
@Controller("envelopes")
export class EnvelopesController {
  constructor(private readonly envelopesService: EnvelopesService) {}

  @Post()
  create(@Body() dto: CreateEnvelopeDto) {
    return this.envelopesService.create(dto);
  }

  @Post(":id/send")
  send(@Param("id") id: string) {
    return this.envelopesService.send(id);
  }

  @Get(":id/status")
  status(@Param("id") id: string) {
    return this.envelopesService.status(id);
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
