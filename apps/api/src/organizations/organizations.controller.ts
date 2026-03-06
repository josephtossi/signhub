import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationsService } from "./organizations.service";

@UseGuards(JwtAuthGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@CurrentUser("sub") userId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(userId, dto.name);
  }

  @Get()
  list(@CurrentUser("sub") userId: string) {
    return this.organizationsService.listForUser(userId);
  }
}
