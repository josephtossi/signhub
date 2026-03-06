import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: { cookies?: Record<string, string> }) => req?.cookies?.access_token || null
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET", "dev-access-secret")
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }) {
    return payload;
  }
}
