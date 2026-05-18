"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseClients = void 0;
exports.broadcastSse = broadcastSse;
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express_session_1 = __importDefault(require("express-session"));
exports.sseClients = new Set();
function broadcastSse(payload) {
    const data = JSON.stringify({ type: 'new_email', email: payload });
    for (const res of exports.sseClients) {
        res.write(`data: ${data}\n\n`);
    }
}
async function bootstrap() {
    if (!process.env.SESSION_SECRET) {
        console.warn('⚠️  SESSION_SECRET not set — using insecure default. Set this in production.');
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, express_session_1.default)({
        secret: process.env.SESSION_SECRET || 'dev-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
    }));
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    });
    app.use('/emails/events', (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        res.write(':ok\n\n');
        exports.sseClients.add(res);
        req.on('close', () => exports.sseClients.delete(res));
    });
    await app.listen(process.env.PORT || 3001);
    console.log(`Backend running on http://localhost:${process.env.PORT || 3001}`);
}
bootstrap();
//# sourceMappingURL=main.js.map