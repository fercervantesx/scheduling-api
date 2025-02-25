// Mock ioredis module
jest.mock('ioredis', () => {
  // Create redis mock instance
  const mockRedisInstance = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1)
  };
  
  // Return a mock constructor
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

// Import will be done dynamically in tests

// Mock console.log and console.warn
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
let consoleLogMock: jest.SpyInstance;
let consoleWarnMock: jest.SpyInstance;

describe('Redis Client', () => {
  beforeEach(() => {
    // Mock console methods
    consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogMock.mockRestore();
    consoleWarnMock.mockRestore();
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    
    // Reset modules to create a fresh redis client every test
    jest.resetModules();
  });

  describe('Redis Connection', () => {
    it('should connect to Redis using environment variable', () => {
      process.env.REDIS_URL = 'redis://custom-redis:6379';
      
      // Reset modules to force re-import
      jest.resetModules();
      
      // Re-mock Redis before importing the src file
      const RedisConstructor = jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(1)
      }));
      
      jest.mock('ioredis', () => RedisConstructor);
      
      // Import the redis instance
      require('../../src/lib/redis');
      
      expect(RedisConstructor).toHaveBeenCalledWith('redis://custom-redis:6379');
      expect(consoleLogMock).toHaveBeenCalledWith('Successfully connected to Redis');
    });

    it('should use default Redis URL if environment variable is not set', () => {
      delete process.env.REDIS_URL;
      
      // Reset modules to force re-import
      jest.resetModules();
      
      // Re-mock Redis before importing the src file
      const RedisConstructor = jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(1)
      }));
      
      jest.mock('ioredis', () => RedisConstructor);
      
      // Import the redis instance
      require('../../src/lib/redis');
      
      expect(RedisConstructor).toHaveBeenCalledWith('redis://127.0.0.1:6379');
    });

    it('should fall back to MockRedis if Redis connection fails', () => {
      // Reset modules to force re-import
      jest.resetModules();
      
      // Create a constructor that throws an error
      const errorMockConstructor = jest.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      // Re-mock Redis to throw error
      jest.mock('ioredis', () => errorMockConstructor);
      
      // Import the redis instance with the error-throwing mock
      const { redis } = require('../../src/lib/redis');
      
      expect(consoleWarnMock).toHaveBeenCalledWith(
        'Redis connection failed, using in-memory mock implementation'
      );
      
      // Test that redis is now a MockRedis instance with the expected methods
      expect(redis.get).toBeDefined();
      expect(redis.set).toBeDefined();
      expect(redis.del).toBeDefined();
      expect(redis.incr).toBeDefined();
    });
  });

  describe('MockRedis Implementation', () => {
    // This is a simplified test for the MockRedis implementation
    it('should create a fallback implementation when Redis fails', () => {
      // Reset modules
      jest.resetModules();
      
      // Create a constructor that throws
      const mockErrorRedis = jest.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      // Mock Redis to throw error
      jest.mock('ioredis', () => mockErrorRedis);
      
      // Import the redis module that should create a mock implementation
      const { redis } = require('../../src/lib/redis');
      
      // Check that the mock implementation has the required methods
      expect(redis.get).toBeDefined();
      expect(redis.set).toBeDefined();
      expect(redis.del).toBeDefined();
      expect(redis.incr).toBeDefined();
      
      // Check that the warning was logged
      expect(consoleWarnMock).toHaveBeenCalledWith(
        'Redis connection failed, using in-memory mock implementation'
      );
    });
  });
});