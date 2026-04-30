import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_PUB, REDIS_SUB } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    @Inject(REDIS_PUB) private readonly pub: Redis,
    @Inject(REDIS_SUB) private readonly sub: Redis,
  ) {}

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

  async sadd(key: string, ...members: string[]) {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]) {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string) {
    return this.client.smembers(key);
  }

  async publish(channel: string, message: string) {
    return this.pub.publish(channel, message);
  }

  async psubscribe(...patterns: string[]) {
    return this.sub.psubscribe(...patterns);
  }

  onPMessage(
    handler: (pattern: string, channel: string, message: string) => void,
  ) {
    this.sub.on('pmessage', handler);
  }

  getClient() {
    return this.client;
  }
}
