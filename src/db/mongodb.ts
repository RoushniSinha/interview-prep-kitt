import mongoose, { ConnectOptions, Connection } from 'mongoose';

/**
 * Production MongoDB Connection Configuration Options
 */
export interface MongoConfig {
  uri: string;
  dbName?: string;
  maxPoolSize?: number;
  minPoolSize?: number;
  serverSelectionTimeoutMS?: number;
  socketTimeoutMS?: number;
  autoIndex?: boolean;
}

/**
 * Structured Logger for Database Infrastructure Events
 */
function logDbEvent(
  level: 'INFO' | 'WARN' | 'ERROR',
  event: string,
  details?: Record<string, unknown>
): void {
  const logPayload = {
    timestamp: new Date().toISOString(),
    service: 'mongodb-connection',
    level,
    event,
    ...details,
  };
  if (level === 'ERROR') {
    console.error(JSON.stringify(logPayload));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.log(JSON.stringify(logPayload));
  }
}

/**
 * Singleton Database Manager
 * Guarantees a single pooled connection lifecycle across concurrent callers and cold starts.
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private connectionPromise: Promise<Connection> | null = null;
  private isShuttingDown = false;
  private listenersAttached = false;
  private signalHandlersRegistered = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Builds production-tuned connection options
   */
  private getOptions(customConfig?: Partial<MongoConfig>): ConnectOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      dbName: customConfig?.dbName || process.env.DB_NAME || undefined,
      maxPoolSize: customConfig?.maxPoolSize ?? 20,
      minPoolSize: customConfig?.minPoolSize ?? 5,
      serverSelectionTimeoutMS: customConfig?.serverSelectionTimeoutMS ?? 5000,
      socketTimeoutMS: customConfig?.socketTimeoutMS ?? 45000,
      // In production, build indexes via migrations/scripts, not on boot
      autoIndex: customConfig?.autoIndex ?? (!isProduction),
    };
  }

  /**
   * Registers lifecycle event listeners on the active Mongoose connection
   */
  private attachLifecycleListeners(): void {
    if (this.listenersAttached) return;

    const connection = mongoose.connection;

    connection.on('connected', () => {
      logDbEvent('INFO', 'MONGODB_CONNECTED', {
        host: connection.host,
        port: connection.port,
        dbName: connection.name,
        readyState: connection.readyState,
      });
    });

    connection.on('disconnected', () => {
      if (!this.isShuttingDown) {
        logDbEvent('WARN', 'MONGODB_DISCONNECTED', {
          message: 'MongoDB lost connection to the database cluster.',
        });
      }
    });

    connection.on('reconnected', () => {
      logDbEvent('INFO', 'MONGODB_RECONNECTED', {
        host: connection.host,
        dbName: connection.name,
      });
    });

    connection.on('error', (err: Error) => {
      logDbEvent('ERROR', 'MONGODB_ERROR', {
        errorName: err.name,
        errorMessage: err.message,
        stack: err.stack,
      });
    });

    this.listenersAttached = true;
  }

  /**
   * Registers POSIX termination signal handlers for zero-downtime, leak-free shutdowns
   */
  private registerShutdownHandlers(): void {
    if (this.signalHandlersRegistered) return;

    const handleSignal = async (signal: NodeJS.Signals): Promise<void> => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      logDbEvent('INFO', 'MONGODB_GRACEFUL_SHUTDOWN_INITIATED', { signal });

      try {
        await this.disconnect();
        logDbEvent('INFO', 'MONGODB_GRACEFUL_SHUTDOWN_COMPLETED', { signal });
        process.exit(0);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logDbEvent('ERROR', 'MONGODB_GRACEFUL_SHUTDOWN_FAILED', {
          signal,
          errorMessage: error.message,
        });
        process.exit(1);
      }
    };

    process.once('SIGINT', () => {
      void handleSignal('SIGINT');
    });

    process.once('SIGTERM', () => {
      void handleSignal('SIGTERM');
    });

    this.signalHandlersRegistered = true;
  }

  /**
   * Connects to MongoDB with connection reuse and concurrency deduplication
   */
  public async connect(customConfig?: Partial<MongoConfig>): Promise<Connection> {
    // If already connected, return the active connection
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    // If a connection attempt is in-flight, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const uri = customConfig?.uri || process.env.MONGODB_URI;
    if (!uri) {
      const errorMsg = 'MONGODB_URI environment variable is required but was not provided.';
      logDbEvent('ERROR', 'MONGODB_CONFIG_ERROR', { message: errorMsg });
      throw new Error(errorMsg);
    }

    const options = this.getOptions(customConfig);

    this.attachLifecycleListeners();
    this.registerShutdownHandlers();

    this.connectionPromise = (async () => {
      try {
        logDbEvent('INFO', 'MONGODB_CONNECTING', {
          maxPoolSize: options.maxPoolSize,
          minPoolSize: options.minPoolSize,
          serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
          socketTimeoutMS: options.socketTimeoutMS,
          autoIndex: options.autoIndex,
        });

        const conn = await mongoose.connect(uri, options);
        return conn.connection;
      } catch (err) {
        // Reset cached promise so subsequent attempts can retry
        this.connectionPromise = null;
        const error = err instanceof Error ? err : new Error(String(err));
        logDbEvent('ERROR', 'MONGODB_CONNECTION_FAILED', {
          errorMessage: error.message,
        });
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Gracefully closes all connections in the Mongoose connection pool
   */
  public async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      this.connectionPromise = null;
      logDbEvent('INFO', 'MONGODB_CONNECTION_CLOSED');
    }
  }

  /**
   * Returns current ready state: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
   */
  public getReadyState(): number {
    return mongoose.connection.readyState;
  }
}

/**
 * Canonical exportable helper function for high-concurrency Node.js / Express services.
 * Can be invoked anywhere in the request lifecycle or server boot sequence.
 */
export async function connectDB(customConfig?: Partial<MongoConfig>): Promise<Connection> {
  return DatabaseService.getInstance().connect(customConfig);
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDB(): Promise<void> {
  return DatabaseService.getInstance().disconnect();
}

/**
 * Connection health status accessor
 */
export function isDbConnected(): boolean {
  return DatabaseService.getInstance().getReadyState() === 1;
}

export default connectDB;
