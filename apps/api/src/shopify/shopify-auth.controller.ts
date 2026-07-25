import { Controller, Get, Query, Res, Logger, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Handles the Shopify OAuth flow to obtain a permanent access token.
 * This only needs to be done ONCE per store.
 * 
 * Flow:
 * 1. Visit /shopify/auth/install → redirects to Shopify authorization page
 * 2. User approves → Shopify redirects to /shopify/auth/callback with a code
 * 3. We exchange the code for a permanent access token
 * 4. Token is saved to .env automatically
 */
@Controller('shopify/auth')
export class ShopifyAuthController {
  private readonly logger = new Logger(ShopifyAuthController.name);
  private readonly nonce: string;

  constructor(private configService: ConfigService) {
    this.nonce = crypto.randomBytes(16).toString('hex');
  }

  /**
   * GET /shopify/auth/install
   * Redirects the user to Shopify's authorization page.
   */
  @Get('install')
  install(@Res() res: Response) {
    const shop = this.configService.get<string>('SHOPIFY_STORE_URL');
    const apiKey = this.configService.get<string>('SHOPIFY_API_KEY');
    const scopes = 'read_products,write_products,read_inventory,write_inventory,read_orders,write_orders,read_customers,write_customers';
    const redirectUri = 'http://localhost:3001/shopify/auth/callback';

    const installUrl =
      `https://${shop}/admin/oauth/authorize?` +
      `client_id=${apiKey}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${this.nonce}`;

    this.logger.log(`Redirecting to Shopify OAuth: ${installUrl}`);
    res.redirect(installUrl);
  }

  /**
   * GET /shopify/auth/callback
   * Shopify redirects here after the user approves the app.
   * We exchange the authorization code for a permanent access token.
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('shop') shop: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    this.logger.log(`OAuth callback received: shop=${shop}, code=${code ? 'present' : 'missing'}`);

    if (!code) {
      return res.status(400).send('Error: No authorization code received from Shopify.');
    }

    const apiKey = this.configService.get<string>('SHOPIFY_API_KEY');
    const apiSecret = this.configService.get<string>('SHOPIFY_API_SECRET');

    try {
      // Exchange the authorization code for a permanent access token
      const tokenResponse = await fetch(
        `https://${shop}/admin/oauth/access_token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: apiKey,
            client_secret: apiSecret,
            code: code,
          }),
        },
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        this.logger.error(`Token exchange failed: ${errorText}`);
        return res.status(500).send(`Error exchanging code for token: ${errorText}`);
      }

      const tokenData = await tokenResponse.json() as { access_token: string; scope: string };
      const accessToken = tokenData.access_token;

      this.logger.log(`✅ ACCESS TOKEN OBTAINED: ${accessToken.substring(0, 10)}...`);
      this.logger.log(`✅ Scopes granted: ${tokenData.scope}`);

      // Save the token to .env file
      const envPath = path.resolve(__dirname, '..', '.env');
      let envContent = fs.readFileSync(envPath, 'utf-8');

      // Replace or add the access token
      if (envContent.includes('SHOPIFY_ACCESS_TOKEN=')) {
        envContent = envContent.replace(
          /SHOPIFY_ACCESS_TOKEN="[^"]*"/,
          `SHOPIFY_ACCESS_TOKEN="${accessToken}"`,
        );
      } else {
        envContent += `\nSHOPIFY_ACCESS_TOKEN="${accessToken}"\n`;
      }

      fs.writeFileSync(envPath, envContent);
      this.logger.log('✅ Token saved to .env file');

      // Send a success page
      res.send(`
        <html>
        <head><title>DFYF - Shopify Conectado</title></head>
        <body style="font-family: Arial; text-align: center; padding: 60px; background: #f0fdf4;">
          <h1 style="color: #046c4e;">✅ ¡Conexión Exitosa!</h1>
          <p style="font-size: 18px; color: #333;">La app <strong>DFYF POS Sync</strong> se ha conectado correctamente a tu tienda de Shopify.</p>
          <p style="color: #666;">Token de acceso guardado. Puedes cerrar esta pestaña.</p>
          <p style="margin-top: 40px; font-size: 14px; color: #999;">Reinicia el servidor NestJS para que tome el nuevo token.</p>
        </body>
        </html>
      `);
    } catch (error) {
      this.logger.error(`OAuth error: ${error.message}`);
      res.status(500).send(`Error during OAuth: ${error.message}`);
    }
  }
}
