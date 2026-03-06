import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./common/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { DocumentsModule } from "./documents/documents.module";
import { EnvelopesModule } from "./envelopes/envelopes.module";
import { SigningModule } from "./signing/signing.module";
import { AuditModule } from "./audit/audit.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { DashboardController } from "./dashboard.controller";
import { AiModule } from "./ai/ai.module";

@Module({
  controllers: [DashboardController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DocumentsModule,
    EnvelopesModule,
    SigningModule,
    AuditModule,
    NotificationsModule,
    AiModule
  ]
})
export class AppModule {}
