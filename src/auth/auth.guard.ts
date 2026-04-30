import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { redisKeys } from 'src/redis/redis.keys';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'ws') return true;

    const request = context.switchToHttp().getRequest<Request>();

    if (request.path?.includes('/socket.io')) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or expired session token');
    }

    const token = authHeader.slice(7);

    const userId = await this.redis.get(redisKeys.session(token));

    if (!userId) {
      throw new UnauthorizedException('Missing or expired session token');
    }

    request.userId = userId;

    return true;
  }
}
