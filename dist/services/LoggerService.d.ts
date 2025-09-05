import winston from "winston";
export interface LoggerConfig {
    level?: string;
    logDir?: string;
    maxFiles?: number;
    maxSize?: string;
    format?: "json" | "simple" | "combined";
    enableConsole?: boolean;
    enableFile?: boolean;
}
export declare class LoggerService {
    private logger;
    private config;
    constructor(config?: LoggerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private createLogger;
    private ensureLogDirectory;
    private parseSize;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    verbose(message: string, meta?: any): void;
    silly(message: string, meta?: any): void;
    log(level: string, message: string, meta?: any): void;
    child(meta: any): winston.Logger;
    getLogger(): winston.Logger;
    createRequestLogger(): (req: any, res: any, next: any) => void;
}
