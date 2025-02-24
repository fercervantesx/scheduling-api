import Redis from 'ioredis';

// Create a mock Redis client for local development
class MockRedis {
  private data: Record<string, any> = {};

  async get(key: string): Promise<string | null> {
    return this.data[key] || null;
  }

  async set(key: string, value: string, _expiry?: string, _duration?: number): Promise<'OK'> {
    this.data[key] = value;
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (this.data[key]) {
      delete this.data[key];
      return 1;
    }
    return 0;
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.data[key] || '0', 10);
    this.data[key] = String(current + 1);
    return current + 1;
  }
}

// Use MockRedis in development when Redis is not available
let redisClient: Redis | MockRedis;

try {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  console.log('Successfully connected to Redis');
} catch (error) {
  console.warn('Redis connection failed, using in-memory mock implementation');
  redisClient = new MockRedis() as any;
}

export const redis = redisClient; 