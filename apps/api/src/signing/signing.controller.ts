import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { SubmitSignatureDto } from "./dto/submit-signature.dto";
import { SigningService } from "./signing.service";

@Controller("sign")
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Get(":token/session")
  getSession(@Param("token") token: string) {
    return this.signingService.getSession(token);
  }

  @Post(":token/submit")
  submit(@Param("token") token: string, @Body() dto: SubmitSignatureDto, @Req() req: Request) {
    return this.signingService.submit(token, dto, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });
  }

  @Post(":token/complete")
  complete(@Param("token") token: string, @Req() req: Request) {
    return this.signingService.complete(token, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });
  }
}

