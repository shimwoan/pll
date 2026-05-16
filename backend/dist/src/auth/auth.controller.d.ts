import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(res: Response): Promise<void>;
    callback(code: string, req: Request, res: Response): Promise<void>;
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
