import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.types';
import { users } from '../database/schema';
import { LoginDto } from './dto/login.dto';

type User = typeof users.$inferSelect;

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE_PROVIDER) private readonly db: DrizzleDB) {}

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  async findUserByUsername(username: string): Promise<User | null> {
    const result: User[] = await this.db
      .select()
      .from(users)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .where(eq(users.username, username))
      .limit(1);

    return result[0] ?? null;
  }

  async createUser(data: LoginDto): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [newUser] = await this.db
      .insert(users)
      .values({
        username: data.username,
      })
      .returning();

    return newUser;
  }
}
