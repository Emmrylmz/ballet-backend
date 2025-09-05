import { PoolConfig, PoolClient } from "pg";
import { EventEmitter } from "events";
export interface DatabaseConfig extends PoolConfig {
    retryAttempts?: number;
    retryDelay?: number;
    idle?: any;
}
export declare class DatabaseService extends EventEmitter {
    private pool;
    private config;
    private isConnected;
    private retryCount;
    constructor(config: DatabaseConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    getClient(): Promise<PoolClient>;
    query(text: string, params?: any[]): Promise<any>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    getStatus(): {
        connected: boolean;
        poolSize?: number | undefined;
        idleCount?: number | undefined;
        waitingCount?: number | undefined;
    };
    private testConnection;
    private handleConnectionError;
}
