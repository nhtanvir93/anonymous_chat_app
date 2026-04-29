// messages.ts
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { rooms } from './rooms';
import { users } from './users';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),

    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, {
        onDelete: 'cascade',
      }),

    message: varchar('message', { length: 1000 }).notNull(),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    roomIdIndex: index('messages_room_id_idx').on(table.roomId),
    createdAtIndex: index('messages_created_at_idx').on(table.createdAt),
    roomCreatedAtIndex: index('messages_room_created_at_idx').on(
      table.roomId,
      table.createdAt,
    ),
  }),
);
