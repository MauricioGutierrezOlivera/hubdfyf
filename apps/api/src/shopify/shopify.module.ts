import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyAuthController } from './shopify-auth.controller';

@Module({
  controllers: [ShopifyController, ShopifyAuthController],
  providers: [ShopifyService],
  exports: [ShopifyService],
})
export class ShopifyModule {}
