import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.types';
import { users } from '../database/schema';
import { LoginDto } from './dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { randomBytes } from 'crypto';
import { redisKeys } from 'src/redis/redis.keys';

type User = typeof users.$inferSelect;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_PROVIDER) private readonly db: DrizzleDB,
    private readonly redis: RedisService,
  ) {}

  async findUserByUsername(username: string): Promise<User | null> {
    const result: User[] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return result[0] ?? null;
  }

  async createDBUser(data: LoginDto) {
    const [newUser] = await this.db
      .insert(users)
      .values({
        username: data.username,
      })
      .returning();

    return newUser;
  }

  async createUser(
    data: LoginDto,
  ): Promise<{ sessionToken: string; user: User }> {
    const DAY_IN_SEC = 24 * 60 * 60;

    const user =
      (await this.findUserByUsername(data.username)) ??
      (await this.createDBUser(data));

    const existingToken = await this.redis.get(redisKeys.user(user.id));
    if (existingToken) {
      await Promise.all([
        this.redis.remove(redisKeys.session(existingToken)),
        this.redis.remove(redisKeys.user(user.id)),
      ]);
    }

    const sessionToken = randomBytes(32).toString('hex');
    await Promise.all([
      this.redis.set(redisKeys.session(sessionToken), user.id, DAY_IN_SEC),
      this.redis.set(redisKeys.user(user.id), sessionToken, DAY_IN_SEC),
    ]);

    return { sessionToken, user };
  }
}
