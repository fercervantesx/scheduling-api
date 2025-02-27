import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User information is required');
    }
    
    // In development mode, you can bypass permissions with the dev-token
    if (this.configService.get<string>('environment') === 'development' && 
        user.sub === 'dev|123456') {
      return true;
    }
    
    // Development bypass for all APIs
    if (this.configService.get<string>('environment') === 'development') {
      console.log('Development mode: bypassing permissions check');
      
      // Log user information for debugging
      console.log('User info:', JSON.stringify(user));
      console.log('Required permissions:', requiredPermissions);
      
      return true;
    }
    
    // Check if user has any of the required permissions
    return requiredPermissions.some(permission => 
      user.permissions && Array.isArray(user.permissions) && 
      user.permissions.includes(permission)
    );
  }
}