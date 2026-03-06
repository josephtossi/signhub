import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.WEB_APP_URL || "http://localhost:3001",
    credentials: true
  });
  app.setGlobalPrefix("v1");
  const adapter = app.getHttpAdapter();
  adapter.get("/", (_req: unknown, res: { json: (body: unknown) => void }) =>
    res.json({ service: "signhub-api", status: "ok", baseUrl: "/v1" })
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
  await app.listen(process.env.PORT || 4000);
}

bootstrap();
