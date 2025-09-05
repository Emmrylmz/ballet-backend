import winston from "winston";
import path from "path";
import { promises as fs } from "fs";
export class LoggerService {
    logger;
    config;
    constructor(config = {}) {
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
    async start() {
        if (this.config.enableFile) {
            await this.ensureLogDirectory();
        }
    }
    async stop() {
        return new Promise((resolve) => {
            this.logger.end(() => resolve());
        });
    }
    createLogger() {
        const transports = [];
        if (this.config.enableConsole) {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaString = Object.keys(meta).length
                        ? JSON.stringify(meta, null, 2)
                        : "";
                    return `${timestamp} [${level}]: ${message} ${metaString}`;
                })),
            }));
        }
        if (this.config.enableFile) {
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, "combined.log"),
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }));
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDir, "error.log"),
                level: "error",
                maxsize: this.parseSize(this.config.maxSize),
                maxFiles: this.config.maxFiles,
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }));
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
    async ensureLogDirectory() {
        try {
            await fs.access(this.config.logDir);
        }
        catch {
            await fs.mkdir(this.config.logDir, { recursive: true });
        }
    }
    parseSize(size) {
        const match = size.match(/^(\d+)([kmg]?)$/i);
        if (!match)
            return 10 * 1024 * 1024;
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
    error(message, meta) {
        this.logger.error(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    verbose(message, meta) {
        this.logger.verbose(message, meta);
    }
    silly(message, meta) {
        this.logger.silly(message, meta);
    }
    log(level, message, meta) {
        this.logger.log(level, message, meta);
    }
    child(meta) {
        return this.logger.child(meta);
    }
    getLogger() {
        return this.logger;
    }
    createRequestLogger() {
        return (req, res, next) => {
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
                }
                else {
                    this.info("HTTP Request", logData);
                }
            });
            next();
        };
    }
}
