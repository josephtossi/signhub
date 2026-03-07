import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  async signup(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    this.attachCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: await this.authService.me(this.getSub(tokens.accessToken)) };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    this.attachCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: await this.authService.me(this.getSub(tokens.accessToken)) };
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokenFromCookie = req.cookies?.refresh_token as string | undefined;
    const tokens = await this.authService.refresh(dto.refreshToken || tokenFromCookie || "");
    this.attachCookies(res, tokens.accessToken, tokens.refreshToken);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser("sub") userId: string) {
    return this.authService.me(userId);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return { ok: true };
  }

  private attachCookies(res: Response, accessToken: string, refreshToken: string) {
    const secure = process.env.NODE_ENV === "production";
    const sameSite = secure ? ("none" as const) : ("lax" as const);
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 1000 * 60 * 15
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
  }

  private getSub(jwt: string): string {
    const [, payload] = jwt.split(".");
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.sub;
  }
}
