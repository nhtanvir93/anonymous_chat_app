import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlInSec?: number) {
    if (ttlInSec) {
      return this.client.set(key, value, 'EX', ttlInSec);
    }

    return this.client.set(key, value);
  }

  async remove(key: string) {
    return this.client.del(key);
  }

  getClient() {
    return this.client;
  }
}
