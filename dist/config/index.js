import dotenv from 'dotenv';
dotenv.config();
const config = {
    port: Number(process.env.PORT) || 3000,
    cors: {
        origins: [
            'http://localhost:3000',
            'http://192.168.121.139:3000',
            'http://localhost:3001',
            'https://your-frontend-domain.com',
            ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
        ],
        credentials: true,
    },
    rateLimit: {
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
    database: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
        max: Number(process.env.DB_POOL_MAX) || 20,
        min: Number(process.env.DB_POOL_MIN) || 5,
        idleTimeoutMillis: Number(process.env.DB_POOL_IDLE) || 10000,
        retryAttempts: Number(process.env.DB_RETRY_ATTEMPTS) || 5,
        retryDelay: Number(process.env.DB_RETRY_DELAY) || 5000,
    },
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        logDir: process.env.LOG_DIR || 'logs',
        maxFiles: Number(process.env.LOG_MAX_FILES) || 5,
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        format: process.env.LOG_FORMAT || 'combined',
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE !== 'false',
    },
    auth: {
        accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-jwt-access-key-change-in-production',
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-jwt-refresh-key-change-in-production',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        companyName: process.env.COMPANY_NAME || 'Ballet Studio Management',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@balletmanagement.com',
    },
    swagger: {
        enabled: process.env.SWAGGER_ENABLED !== 'false',
        path: process.env.SWAGGER_PATH || '/api-docs',
    },
};
export default config;
