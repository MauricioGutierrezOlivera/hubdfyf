import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    let connectionString = process.env.DATABASE_URL!;
    if (connectionString && connectionString.startsWith('prisma+postgres://')) {
      try {
        const urlObj = new URL(connectionString);
        const apiKey = urlObj.searchParams.get('api_key');
        if (apiKey) {
          const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
          const config = JSON.parse(decoded);
          if (config.databaseUrl) {
            connectionString = config.databaseUrl;
          }
        }
      } catch (e) {
        console.error('Failed to parse/decode DATABASE_URL, using original:', e);
      }
    }

    const pool = new Pool({
      connectionString,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });

    pool.on('error', (err) => {
      console.error('Idle PostgreSQL pool client warning:', err.message);
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
