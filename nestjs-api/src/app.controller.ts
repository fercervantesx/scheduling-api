import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiTags('system')
  @ApiOperation({ summary: 'Check API health status' })
  getHealth(@Req() req: Request) {
    return {
      status: 'ok',
      tenant: req.tenant
        ? {
            id: req.tenant.id,
            name: req.tenant.name,
            subdomain: req.tenant.subdomain,
          }
        : 'No tenant resolved',
      debug: {
        hostname: req.hostname,
        originalUrl: req.originalUrl,
        protocol: req.protocol,
        subdomains: req.subdomains,
      },
    };
  }

  @Get('raw-debug')
  @ApiTags('system')
  @ApiOperation({ summary: 'Get raw request debug information' })
  getRawDebug(@Req() req: Request) {
    return {
      headers: req.headers,
      hostname: req.hostname,
      subdomains: req.subdomains,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      query: req.query,
    };
  }
}