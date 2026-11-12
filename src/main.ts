import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  app.use(helmet());

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173/'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });



  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
