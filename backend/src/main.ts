import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import type { Request, Response } from 'express';

// SSE clients registry — shared with EmailService via module ref
export const sseClients = new Set<Response>();

export interface SseEmailPayload {
  id: string;
  actionCategory: string;
  aiSummary: string;
  subject: string;
  fromName: string;
  receivedAt: string;
}

export function broadcastSse(payload: SseEmailPayload) {
  const data = JSON.stringify({ type: 'new_email', email: payload });
  for (const res of sseClients) {
    res.write(`data: ${data}\n\n`);
  }
}

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
      cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // SSE endpoint — registered before NestJS router to bypass interceptors
  app.use('/emails/events', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(':ok\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
  });

  await app.listen(process.env.PORT || 3001);
  console.log(`Backend running on http://localhost:${process.env.PORT || 3001}`);
}
bootstrap();
