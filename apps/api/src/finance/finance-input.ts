import { BadRequestException } from '@nestjs/common';

// Validación mínima de los formularios de Finanzas (el proyecto no usa class-validator).

type Body = Record<string, unknown>;

export function num(body: Body, key: string, opts: { required?: boolean; min?: number } = {}) {
  const v = body[key];
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw new BadRequestException(`Falta el campo ${key}`);
    return undefined;
  }
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) throw new BadRequestException(`${key} debe ser un número`);
  if (opts.min !== undefined && n < opts.min) {
    throw new BadRequestException(`${key} debe ser mayor o igual a ${opts.min}`);
  }
  return n;
}

export function int(body: Body, key: string, opts: { required?: boolean; min?: number } = {}) {
  const n = num(body, key, opts);
  if (n !== undefined && !Number.isInteger(n)) throw new BadRequestException(`${key} debe ser entero`);
  return n;
}

export function str(body: Body, key: string, opts: { required?: boolean } = {}) {
  const v = body[key];
  if (v === undefined || v === null || String(v).trim() === '') {
    if (opts.required) throw new BadRequestException(`Falta el campo ${key}`);
    return v === undefined ? undefined : null;
  }
  return String(v).trim();
}

export function date(body: Body, key: string, opts: { required?: boolean } = {}) {
  const v = body[key];
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw new BadRequestException(`Falta el campo ${key}`);
    return v === undefined ? undefined : null;
  }
  // "YYYY-MM-DD" se guarda al mediodía UTC para que no cambie de día en Chile
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00.000Z`) : new Date(s);
  if (isNaN(d.getTime())) throw new BadRequestException(`${key} no es una fecha válida`);
  return d;
}

export function oneOf<T extends string>(
  body: Body,
  key: string,
  values: readonly T[],
  opts: { required?: boolean } = {},
): T | undefined {
  const v = body[key];
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw new BadRequestException(`Falta el campo ${key}`);
    return undefined;
  }
  if (!values.includes(v as T)) {
    throw new BadRequestException(`${key} debe ser uno de: ${values.join(', ')}`);
  }
  return v as T;
}

/** Quita las claves undefined para que un update parcial no borre campos. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
