import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './services/supabase.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secretOrPrivateKey: configService.get<string>('auth.auth0ClientSecret'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SupabaseService],
  exports: [SupabaseService, JwtModule],
})
export class CommonModule {}