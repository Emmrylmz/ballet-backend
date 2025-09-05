import { Pool, PoolConfig, PoolClient } from "pg";
import { EventEmitter } from "events";

export interface DatabaseConfig extends PoolConfig {
  retryAttempts?: number;
  retryDelay?: number;
  idle?: any;
}

export class DatabaseService extends EventEmitter {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;
  private retryCount: number = 0;

  constructor(config: DatabaseConfig) {
    super();
    this.config = {
      retryAttempts: 5,
      retryDelay: 5000,
      ...config,
    };
  }

  async start(): Promise<void> {
    try {
      this.pool = new Pool(this.config);

      // Set up event listeners
      this.pool.on("connect", (client: PoolClient) => {
        this.emit("connect", client);
        this.isConnected = true;
        this.retryCount = 0;
      });

      this.pool.on("error", (err: Error, client: PoolClient) => {
        this.emit("error", err, client);
        this.isConnected = false;
        this.handleConnectionError(err);
      });

      this.pool.on("remove", (client: PoolClient) => {
        this.emit("remove", client);
      });

      // Test connection
      await this.testConnection();

      this.emit("ready");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        this.emit("disconnected");
      } catch (error) {
        this.emit("error", error);
        throw error;
      }
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error("Database service not started");
    }
    return this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error("Database service not started");
    }
    return this.pool.query(text, params);
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  getStatus(): {
    connected: boolean;
    poolSize?: number | undefined;
    idleCount?: number | undefined;
    waitingCount?: number | undefined;
  } {
    return {
      connected: this.isConnected,
      poolSize: this.pool?.totalCount,
      idleCount: this.pool?.idleCount,
      waitingCount: this.pool?.waitingCount,
    };
  }

  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error("Pool not initialized");
    }

    const client = await this.pool.connect();
    try {
      await client.query("SELECT NOW()");
    } finally {
      client.release();
    }
  }

  private async handleConnectionError(error: Error): Promise<void> {
    if (this.retryCount < (this.config.retryAttempts || 5)) {
      this.retryCount++;
      this.emit("reconnecting", this.retryCount);

      setTimeout(async () => {
        try {
          await this.testConnection();
          this.emit("reconnected");
        } catch (retryError) {
          this.handleConnectionError(retryError as Error);
        }
      }, this.config.retryDelay || 5000);
    } else {
      this.emit("maxRetriesReached", error);
    }
  }
}
