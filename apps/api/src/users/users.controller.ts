import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Get("me/profile")
  me(@CurrentUser("sub") userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch("me/profile")
  updateMe(@CurrentUser("sub") userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(userId, dto);
  }

  @Patch("me/password")
  changePassword(@CurrentUser("sub") userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.usersService.getById(id);
  }
}
