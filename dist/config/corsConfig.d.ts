import { CorsOptions } from "cors";
import { LoggerService } from "../services/LoggerService.js";
export declare class CorsConfigurationService {
    private logger;
    constructor(logger: LoggerService);
    getCorsOptions(): CorsOptions;
    private getAllowedOrigins;
    validateConfiguration(): {
        isValid: boolean;
        warnings: string[];
    };
    getSecurityHeaders(): {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: string[];
                styleSrc: string[];
                scriptSrc: string[];
                imgSrc: string[];
                connectSrc: string[];
                fontSrc: string[];
                objectSrc: string[];
                mediaSrc: string[];
                frameSrc: string[];
            };
        };
        hsts: {
            maxAge: number;
            includeSubDomains: boolean;
            preload: boolean;
        };
        referrerPolicy: string;
        noSniff: boolean;
        frameguard: {
            action: string;
        };
        xssFilter: boolean;
        hidePoweredBy: boolean;
    };
    getCookieSecurityConfig(): {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "strict";
        domain: string | undefined;
        path: string;
    };
    logConfiguration(): void;
}
