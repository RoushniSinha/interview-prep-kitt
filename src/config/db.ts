import mongoose, { ConnectOptions, Connection } from 'mongoose';
import { env } from './env';

export interface MongoConnectionOptions {
  uri?: string;
  dbName?: string;
}

let isShuttingDown = false;
let listenersRegistered = false;
let shutdownHooksRegistered = false;

function setupConnectionListeners(connection: Connection): void {
  if (listenersRegistered) return;

  connection.on('connected', () => {
    console.log(
      `[MongoDB] Connected successfully to host: ${connection.host}, database: ${connection.name || 'interview_prep_db'}`
    );
  });

  connection.on('disconnected', () => {
    if (!isShuttingDown) {
      console.warn('[MongoDB] Disconnected from MongoDB cluster.');
    }
  });

  connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected to MongoDB cluster.');
  });

  connection.on('error', (err: Error) => {
    console.error('[MongoDB] Connection error occurred:', err.message);
  });

  listenersRegistered = true;
}

function registerShutdownHooks(): void {
  if (shutdownHooksRegistered) return;

  const handleTermination = async (signal: NodeJS.Signals): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`[MongoDB] Received ${signal}. Initiating graceful shutdown...`);
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        console.log('[MongoDB] Connection closed successfully via graceful shutdown.');
      }
      process.exit(0);
    } catch (err) {
      console.error('[MongoDB] Error during graceful connection close:', err);
      process.exit(1);
    }
  };

  process.once('SIGINT', () => void handleTermination('SIGINT'));
  process.once('SIGTERM', () => void handleTermination('SIGTERM'));

  shutdownHooksRegistered = true;
}

/**
 * Resilient Mongoose connection establishing function
 */
export async function connectDB(options?: MongoConnectionOptions): Promise<Connection> {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = options?.uri || process.env.MONGODB_URI || env.MONGODB_URI;
  const dbName = options?.dbName || process.env.DB_NAME || env.DB_NAME || 'interview_prep_db';

  if (!uri) {
    const errorMsg = 'MONGODB_URI is not defined. Cannot establish database connection.';
    console.error(`[MongoDB] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  setupConnectionListeners(mongoose.connection);
  registerShutdownHooks();

  const connectOptions: ConnectOptions = {
    dbName,
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: (process.env.NODE_ENV || env.NODE_ENV) !== 'production',
  };

  try {
    console.log(`[MongoDB] Connecting to database "${dbName}"...`);
    const conn = await mongoose.connect(uri, connectOptions);
    return conn.connection;
  } catch (error) {
    console.error('[MongoDB] Initial connection failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Closes the active database connection
 */
export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    console.log('[MongoDB] Disconnected explicitly.');
  }
}

export default connectDB;
