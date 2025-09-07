import { Response, Request } from "express";
import { LoggerService } from "../../../services/LoggerService.js";
export interface CookieConfig {
    domain?: string;
    secure: boolean;
    sameSite: "strict" | "lax" | "none";
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
}
export declare class CookieService {
    private logger;
    private readonly config;
    constructor(logger: LoggerService, config: {
        domain?: string;
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
        accessTokenExpiry: number;
        refreshTokenExpiry: number;
    });
    setAccessTokenCookie(res: Response, token: string): void;
    setRefreshTokenCookie(res: Response, token: string): void;
    setTokenCookies(res: Response, accessToken: string, refreshToken: string): void;
    getAccessTokenFromCookies(req: Request): string | undefined;
    getRefreshTokenFromCookies(req: Request): string | undefined;
    clearAccessTokenCookie(res: Response): void;
    clearRefreshTokenCookie(res: Response): void;
    clearAllAuthCookies(res: Response): void;
    hasValidCookieStructure(req: Request): boolean;
    getConfig(): CookieConfig;
    setSecureFlags(secure: boolean): void;
    validateSecurityConfig(): {
        isValid: boolean;
        warnings: string[];
    };
}
