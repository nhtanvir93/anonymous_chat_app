import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_CLIENT, REDIS_PUB, REDIS_SUB } from './redis.constants';

function createRedisClient() {
  return new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  });
}

@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT, useFactory: createRedisClient },
    { provide: REDIS_PUB, useFactory: createRedisClient },
    { provide: REDIS_SUB, useFactory: createRedisClient },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_PUB, REDIS_SUB, RedisService],
})
export class RedisModule {}
