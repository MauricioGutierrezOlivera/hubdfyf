import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export const FINANCE_BUCKET = 'finanzas-documentos';
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

export interface UploadedDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Documentos de Finanzas en el bucket PRIVADO de Supabase Storage.
 * Se guarda solo la ruta interna; para verlos se genera un link firmado que expira.
 * Usa la API REST de Supabase directamente (sin SDK) con la service role key,
 * que vive solo en el servidor (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).
 */
@Injectable()
export class FinanceStorageService {
  private readonly logger = new Logger(FinanceStorageService.name);

  private config() {
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new ServiceUnavailableException(
        'Subida de documentos no configurada (faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
      );
    }
    return { url, key };
  }

  async upload(folder: 'costos' | 'gastos', file: UploadedDocument): Promise<string> {
    if (!file?.buffer?.length) throw new BadRequestException('Archivo vacío');
    if (file.size > MAX_DOCUMENT_BYTES) throw new BadRequestException('El archivo supera 15 MB');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido (solo PDF, imagen o Excel)');
    }
    const { url, key } = this.config();
    const safeName = file.originalname
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .slice(-80);
    const path = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${safeName}`;

    const res = await fetch(`${url}/storage/v1/object/${FINANCE_BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': file.mimetype,
        'x-upsert': 'false',
      },
      body: new Uint8Array(file.buffer),
    });
    if (!res.ok) {
      this.logger.error(`Error subiendo documento: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException('No se pudo subir el documento');
    }
    return path;
  }

  /** Link temporal (10 minutos) para ver un documento privado. */
  async signedUrl(path: string): Promise<string> {
    const { url, key } = this.config();
    const res = await fetch(`${url}/storage/v1/object/sign/${FINANCE_BUCKET}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!res.ok) {
      this.logger.error(`Error firmando documento: ${res.status} ${await res.text()}`);
      throw new ServiceUnavailableException('No se pudo abrir el documento');
    }
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    return `${url}/storage/v1${data.signedURL || data.signedUrl}`;
  }

  async remove(path: string): Promise<void> {
    try {
      const { url, key } = this.config();
      await fetch(`${url}/storage/v1/object/${FINANCE_BUCKET}/${path}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}`, apikey: key },
      });
    } catch (e) {
      // Si falla el borrado del archivo no bloqueamos la operación principal
      this.logger.warn(`No se pudo borrar ${path}: ${(e as Error).message}`);
    }
  }
}
