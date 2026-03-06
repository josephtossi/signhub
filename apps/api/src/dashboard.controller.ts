import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./auth/current-user.decorator";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { EnvelopesService } from "./envelopes/envelopes.service";

@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly envelopesService: EnvelopesService) {}

  @Get()
  summary(@CurrentUser("sub") userId: string) {
    return this.envelopesService.dashboard(userId);
  }
}

