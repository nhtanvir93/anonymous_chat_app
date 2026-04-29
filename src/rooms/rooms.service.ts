import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../database/drizzle.module';
import type { DrizzleDB } from '../database/drizzle.types';
import { rooms, users } from '../database/schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { AppException } from 'src/app-exception/app-exception';
import { DatabaseError } from 'pg';

const DUPLICATE_NAME_ERROR = '23505';
const DUPLICATE_NAME_CODE = 'ROOM_NAME_TAKEN';

@Injectable()
export class RoomsService {
  constructor(@Inject(DRIZZLE_PROVIDER) private readonly db: DrizzleDB) {}

  async findAllRooms() {
    const result = await this.db
      .select({
        id: rooms.id,
        name: rooms.name,
        createdBy: users.username,
        createdAt: rooms.createdAt,
      })
      .from(rooms)
      .leftJoin(users, eq(rooms.createdBy, users.id));

    return result;
  }

  async findRoomById(id: string) {
    const result = await this.db
      .select({
        id: rooms.id,
        name: rooms.name,
        createdBy: users.username,
        createdAt: rooms.createdAt,
      })
      .from(rooms)
      .leftJoin(users, eq(rooms.createdBy, users.id))
      .where(eq(rooms.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async createRoom(data: CreateRoomDto, createdBy: string) {
    try {
      const [newRoom] = await this.db
        .insert(rooms)
        .values({
          name: data.name,
          createdBy,
        })
        .returning();

      return this.findRoomById(newRoom.id);
    } catch (error: unknown) {
      if (error instanceof DrizzleQueryError) {
        if (error.cause instanceof DatabaseError) {
          if (error.cause.code === DUPLICATE_NAME_ERROR) {
            throw new AppException(
              HttpStatus.CONFLICT,
              DUPLICATE_NAME_CODE,
              'A room with this name already exists',
            );
          }
        }
      }

      throw error;
    }
  }
}
