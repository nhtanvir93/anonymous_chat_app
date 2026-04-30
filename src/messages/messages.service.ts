import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.types';
import { messages, rooms, users } from '../database/schema';
import { AppException } from 'src/app-exception/app-exception';
import { GetMessagesDto } from './dto/get-messages.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { RedisService } from 'src/redis/redis.service';
import { redisKeys } from 'src/redis/redis.keys';

const ROOM_NOT_FOUND = 'ROOM_NOT_FOUND';
const MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DRIZZLE_PROVIDER) private readonly db: DrizzleDB,
    private readonly redis: RedisService,
  ) {}

  async getMessages(roomId: string, query: GetMessagesDto) {
    const room = await this.db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
      .then((res) => res[0] ?? null);

    if (!room) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ROOM_NOT_FOUND,
        `Room with id ${roomId} does not exist`,
      );
    }

    let cursorCondition;

    const { limit, before } = query;

    if (before) {
      const cursorMessage = await this.db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.id, before))
        .limit(1)
        .then((res) => res[0] ?? null);

      if (!cursorMessage) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          MESSAGE_NOT_FOUND,
          `Cursor message with id ${before} does not exist`,
        );
      }

      cursorCondition = lt(messages.createdAt, cursorMessage.createdAt);
    }

    const whereClause = cursorCondition
      ? and(eq(messages.roomId, roomId), cursorCondition)
      : eq(messages.roomId, roomId);

    const rows = await this.db
      .select({
        id: messages.id,
        content: messages.message,
        createdAt: messages.createdAt,
        username: users.username,
        roomId: messages.roomId,
      })
      .from(messages)
      .leftJoin(users, eq(messages.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(messages.createdAt))

      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    items.reverse();

    return {
      messages: items,
      hasMore,
      nextCursor: hasMore ? items[0].id : null,
    };
  }

  async createMessage(roomId: string, userId: string, data: CreateMessageDto) {
    const room = await this.db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
      .then((res) => res[0] ?? null);

    if (!room) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ROOM_NOT_FOUND,
        `Room with id ${roomId} does not exist`,
      );
    }

    const [inserted] = await this.db
      .insert(messages)
      .values({
        roomId,
        message: data.content,
        createdBy: userId,
      })
      .returning({ id: messages.id });

    const message = await this.db
      .select({
        id: messages.id,
        content: messages.message,
        createdAt: messages.createdAt,
        username: users.username,
        roomId: messages.roomId,
      })
      .from(messages)
      .leftJoin(users, eq(messages.createdBy, users.id))
      .where(eq(messages.id, inserted.id))
      .limit(1)
      .then((res) => res[0]);

    await this.redis.publish(
      redisKeys.channels.messageNew(roomId),
      JSON.stringify(message),
    );

    return message;
  }
}
