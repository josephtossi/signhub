import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateEnvelopeDto } from "./dto/create-envelope.dto";
import { EnvelopesService } from "./envelopes.service";

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
}
