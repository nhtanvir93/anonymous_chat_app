import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.types';
import { users } from '../database/schema';
import { LoginDto } from './dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { randomBytes } from 'crypto';

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

  async createUser(data: LoginDto): Promise<{
    sessionToken: string;
    user: User;
  }> {
    const oldUser = await this.findUserByUsername(data.username);
    const dayToSec = 24 * 60 * 60;

    const sessionToken = randomBytes(32).toString('hex');

    if (oldUser) {
      const oldSessionToken = await this.redis.get(oldUser.id);

      if (oldSessionToken) {
        await this.redis.remove(`session:${oldSessionToken}`);
        await this.redis.remove(`user:${oldUser.id}`);
      }

      await this.redis.set(`session:${oldSessionToken}`, oldUser.id, dayToSec);
      await this.redis.set(`user:${oldUser.id}`, sessionToken, dayToSec);

      return {
        sessionToken,
        user: oldUser,
      };
    }

    const newUser = await this.createDBUser(data);
    await this.redis.set(`session:${sessionToken}`, newUser.id, dayToSec);
    await this.redis.set(`user:${newUser.id}`, sessionToken, dayToSec);

    return {
      sessionToken,
      user: newUser,
    };
  }
}
