import { Pool } from "pg";
import { EventEmitter } from "events";
export class DatabaseService extends EventEmitter {
    pool = null;
    config;
    isConnected = false;
    retryCount = 0;
    constructor(config) {
        super();
        this.config = {
            retryAttempts: 5,
            retryDelay: 5000,
            ...config,
        };
    }
    async start() {
        try {
            this.pool = new Pool(this.config);
            this.pool.on("connect", (client) => {
                this.emit("connect", client);
                this.isConnected = true;
                this.retryCount = 0;
            });
            this.pool.on("error", (err, client) => {
                this.emit("error", err, client);
                this.isConnected = false;
                this.handleConnectionError(err);
            });
            this.pool.on("remove", (client) => {
                this.emit("remove", client);
            });
            await this.testConnection();
            this.emit("ready");
        }
        catch (error) {
            this.emit("error", error);
            throw error;
        }
    }
    async stop() {
        if (this.pool) {
            try {
                await this.pool.end();
                this.pool = null;
                this.isConnected = false;
                this.emit("disconnected");
            }
            catch (error) {
                this.emit("error", error);
                throw error;
            }
        }
    }
    async getClient() {
        if (!this.pool) {
            throw new Error("Database service not started");
        }
        return this.pool.connect();
    }
    async query(text, params) {
        if (!this.pool) {
            throw new Error("Database service not started");
        }
        return this.pool.query(text, params);
    }
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    getStatus() {
        return {
            connected: this.isConnected,
            poolSize: this.pool?.totalCount,
            idleCount: this.pool?.idleCount,
            waitingCount: this.pool?.waitingCount,
        };
    }
    async testConnection() {
        if (!this.pool) {
            throw new Error("Pool not initialized");
        }
        const client = await this.pool.connect();
        try {
            await client.query("SELECT NOW()");
        }
        finally {
            client.release();
        }
    }
    async handleConnectionError(error) {
        if (this.retryCount < (this.config.retryAttempts || 5)) {
            this.retryCount++;
            this.emit("reconnecting", this.retryCount);
            setTimeout(async () => {
                try {
                    await this.testConnection();
                    this.emit("reconnected");
                }
                catch (retryError) {
                    this.handleConnectionError(retryError);
                }
            }, this.config.retryDelay || 5000);
        }
        else {
            this.emit("maxRetriesReached", error);
        }
    }
}
