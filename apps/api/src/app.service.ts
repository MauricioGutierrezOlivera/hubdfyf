import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    return 'DFYF POS API is Running!';
  }

  onModuleInit() {
    this.logger.log('Initializing Keep-Alive pinger service...');

    // Self-ping every 10 minutes (600,000 ms) to keep Render instance warm
    setInterval(async () => {
      try {
        const pingUrl = process.env.RENDER_EXTERNAL_URL || 'https://hubdfyf-api.onrender.com';
        this.logger.log(`[Keep-Alive] Self-pinging ${pingUrl}/auth/users to keep server active...`);
        const res = await fetch(`${pingUrl}/auth/users`);
        if (res.ok) {
          this.logger.log(`[Keep-Alive] Ping successful (HTTP ${res.status})`);
        }
      } catch (error: any) {
        this.logger.warn(`[Keep-Alive] Ping warning: ${error.message}`);
      }
    }, 10 * 60 * 1000);
  }
}
