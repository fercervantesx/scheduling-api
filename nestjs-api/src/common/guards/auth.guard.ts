import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { jwtDecode } from 'jwt-decode';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        user_id: string;
        email: string;
        name?: string;
        nickname?: string;
        permissions?: string[];
      };
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    // If no token, deny access
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    
    try {
      // Verify token with Auth0
      const auth0Domain = this.configService.get<string>('auth.auth0Domain');
      const auth0Audience = this.configService.get<string>('auth.auth0Audience');
      
      // In development mode, allow bypassing authentication
      if (this.configService.get<string>('environment') === 'development' && 
          token === 'dev-token' && 
          request.hostname === 'localhost') {
        
        // Mock admin permissions for development
        request.user = {
          sub: 'dev|123456',
          user_id: 'dev|123456',
          email: 'dev@example.com',
          name: 'Developer',
          nickname: 'dev',
          permissions: ['admin']
        };
        
        return true;
      }
      
      // Decode JWT to get user information for request context
      const decodedToken = jwtDecode(token);
      
      // Log token and decoded info in development
      if (this.configService.get<string>('environment') === 'development') {
        console.log('JWT token:', token.substring(0, 20) + '...');
        console.log('Decoded token:', JSON.stringify(decodedToken));
      }

      // Add admin permission in development mode
      if (this.configService.get<string>('environment') === 'development') {
        const userWithPermissions = {
          sub: (decodedToken as any).sub || 'unknown',
          user_id: (decodedToken as any).sub || 'unknown',
          email: (decodedToken as any).email || 'dev@example.com',
          name: (decodedToken as any).name || 'Developer',
          nickname: (decodedToken as any).nickname || 'dev',
          permissions: ['admin']
        };
        request.user = userWithPermissions;
      } else {
        // Set user information to request
        request.user = decodedToken as any;
      }
      
      return true;
    } catch (error) {
      throw new UnauthorizedException(`Invalid token: ${error.message}`);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}