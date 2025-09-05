import winston from "winston";
import path from "path";
import { promises as fs } from "fs";

export interface LoggerConfig {
  level?: string;
  logDir?: string;
  maxFiles?: number;
  maxSize?: string;
  format?: "json" | "simple" | "combined";
  enableConsole?: boolean;
  enableFile?: boolean;
}

export class LoggerService {
  private logger: winston.Logger;
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: "info",
      logDir: "logs",
      maxFiles: 5,
      maxSize: "10m",
      format: "combined",
      enableConsole: true,
      enableFile: true,
      ...config,
    };

    this.logger = this.createLogger();
  }

  async start(): Promise<void> {
    if (this.config.enableFile) {
      await this.ensureLogDirectory();
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end(() => resolve());
    });
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaString = Object.keys(meta).length
                ? JSON.stringify(meta, null, 2)
                : "";
              return `${timestamp} [${level}]: ${message} ${metaString}`;
            })
          ),
        })
      );
    }

    if (this.config.enableFile) {
      // Combined log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.config.logDir, "combined.log"),
          maxsize: this.parseSize(this.config.maxSize),
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.config.logDir, "error.log"),
          level: "error",
          maxsize: this.parseSize(this.config.maxSize),
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      transports,
      exceptionHandlers: this.config.enableFile
        ? [
            new winston.transports.File({
              filename: path.join(this.config.logDir, "exceptions.log"),
            }),
          ]
        : undefined,
      rejectionHandlers: this.config.enableFile
        ? [
            new winston.transports.File({
              filename: path.join(this.config.logDir, "rejections.log"),
            }),
          ]
        : undefined,
    });
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.access(this.config.logDir);
    } catch {
      await fs.mkdir(this.config.logDir, { recursive: true });
    }
  }

  private parseSize(size: string): number {
    const match = size.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const [, num, unit] = match;
    const baseSize = parseInt(num || "", 10);

    switch (unit?.toLowerCase()) {
      case "k":
        return baseSize * 1024;
      case "m":
        return baseSize * 1024 * 1024;
      case "g":
        return baseSize * 1024 * 1024 * 1024;
      default:
        return baseSize;
    }
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  silly(message: string, meta?: any): void {
    this.logger.silly(message, meta);
  }

  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }

  child(meta: any): winston.Logger {
    return this.logger.child(meta);
  }

  getLogger(): winston.Logger {
    return this.logger;
  }

  createRequestLogger() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get("user-agent"),
          ip: req.ip,
        };

        if (res.statusCode >= 400) {
          this.warn("HTTP Request", logData);
        } else {
          this.info("HTTP Request", logData);
        }
      });

      next();
    };
  }
}
