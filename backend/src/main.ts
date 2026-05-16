import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET not set — using insecure default. Set this in production.');
  }

  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001);
  console.log(`Backend running on http://localhost:${process.env.PORT || 3001}`);
}
bootstrap();
