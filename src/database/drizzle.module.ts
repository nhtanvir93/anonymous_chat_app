import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import type { DrizzleDB } from './drizzle.types';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_PROVIDER,
      useFactory: (): DrizzleDB => {
        const {
          POSTGRES_HOST,
          POSTGRES_PORT,
          POSTGRES_USER,
          POSTGRES_PASSWORD,
          POSTGRES_DB,
        } = process.env;

        if (
          !POSTGRES_HOST ||
          !POSTGRES_PORT ||
          !POSTGRES_USER ||
          !POSTGRES_PASSWORD ||
          !POSTGRES_DB
        ) {
          throw new Error('Missing required database environment variables');
        }

        const connectionString = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
        console.log(connectionString);
        const pool = new Pool({ connectionString });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_PROVIDER],
})
export class DrizzleModule {}
