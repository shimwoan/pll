import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GraphService } from '../graph/graph.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthController {
    private readonly authService;
    private readonly graphService;
    private readonly prisma;
    private readonly logger;
    constructor(authService: AuthService, graphService: GraphService, prisma: PrismaService);
    login(res: Response): Promise<void>;
    callback(code: string, error: string, req: Request, res: Response): Promise<void>;
    me(req: Request): {
        authenticated: boolean;
        email?: undefined;
        name?: undefined;
    } | {
        authenticated: boolean;
        email: any;
        name: any;
    };
    logout(req: Request, res: Response): void;
}
