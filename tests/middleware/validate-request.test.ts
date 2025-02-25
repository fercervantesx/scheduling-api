import { Request, Response } from 'express';
import { validateRequest } from '../../src/middleware/validate-request';
import { z } from 'zod';

describe('Validate Request Middleware', () => {
  // Mock request, response and next function
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    nextFunction = jest.fn();
  });

  it('should call next() if validation passes', async () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      query: z.object({}),
      params: z.object({}),
    });
    
    mockReq.body = { name: 'Test Name' };
    
    const middleware = validateRequest(schema);
    await middleware(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 400 if body validation fails', async () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
        age: z.number(),
      }),
      query: z.object({}),
      params: z.object({}),
    });
    
    mockReq.body = { name: 'Test Name' }; // Missing age
    
    const middleware = validateRequest(schema);
    await middleware(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if query validation fails', async () => {
    const schema = z.object({
      body: z.object({}),
      query: z.object({
        page: z.string(),
      }),
      params: z.object({}),
    });
    
    mockReq.query = {}; // Missing page
    
    const middleware = validateRequest(schema);
    await middleware(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if params validation fails', async () => {
    const schema = z.object({
      body: z.object({}),
      query: z.object({}),
      params: z.object({
        id: z.string().uuid(),
      }),
    });
    
    mockReq.params = { id: 'not-a-uuid' };
    
    const middleware = validateRequest(schema);
    await middleware(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should validate complex nested data structures', async () => {
    const schema = z.object({
      body: z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
          preferences: z.array(z.string()),
        }),
      }),
      query: z.object({}),
      params: z.object({}),
    });
    
    mockReq.body = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        preferences: ['dark-mode', 'notifications'],
      },
    };
    
    const middleware = validateRequest(schema);
    await middleware(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return validation errors with details', async () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
        age: z.number().min(18),
      }),
      query: z.object({}),
      params: z.object({}),
    });
    
    mockReq.body = {
      email: 'not-an-email',
      age: 16,
    };
    
    const middleware = validateRequest(schema);
    await middleware(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalled();
    
    // The validation error should contain details about both fields
    const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.issues.length).toBe(2);
    expect(jsonCall.issues[0].path).toContain('email');
    expect(jsonCall.issues[1].path).toContain('age');
  });
});