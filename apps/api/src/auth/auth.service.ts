import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { compare, hash } from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash
      }
    });
    return this.issueTokens(user.id, user.email, ["sender"]);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.issueTokens(user.id, user.email, ["sender"]);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret"
      });
      return this.issueTokens(payload.sub, payload.email, payload.roles);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private async issueTokens(userId: string, email: string, roles: string[]) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, roles },
      { secret: process.env.JWT_ACCESS_SECRET || "dev-access-secret", expiresIn: "15m" }
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, roles },
      { secret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret", expiresIn: "7d" }
    );
    return { accessToken, refreshToken };
  }
}
