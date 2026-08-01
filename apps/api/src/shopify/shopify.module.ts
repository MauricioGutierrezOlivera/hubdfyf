import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyAuthController } from './shopify-auth.controller';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShopifyController, ShopifyAuthController],
  providers: [ShopifyService],
  exports: [ShopifyService],
})
export class ShopifyModule {}
