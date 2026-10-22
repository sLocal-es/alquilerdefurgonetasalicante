import { z } from 'zod';

/** Servicios ofrecidos en el paso 1 del formulario. */
export const SERVICES = [
  'Mudanza',
  'Transporte de mercancías',
  'Reforma / obra',
  'Viaje con pasajeros',
  'Otro',
] as const;

/** Franjas horarias de recogida. */
export const TIME_SLOTS = ['Indiferente', 'Mañana 8 a 14 h', 'Tarde 14 a 20 h'] as const;

/** Duraciones de alquiler. */
export const DURATIONS = ['Por horas', '1 día', 'Fin de semana', '1 semana', '1 mes o más'] as const;

/** Opción de zona para municipios que no están en la lista. */
export const OTHER_ZONE = 'Otro municipio (indícalo en los detalles)';

/** Opciones de la pregunta sobre el carnet de conducir. */
export const CARNET_OPTIONS = ['Sí', 'No'] as const;

export const MAX_DETAILS = 2000;
export const MAX_NAME = 100;
export const MAX_EMAIL = 255;
export const MAX_PHONE = 30;

/** Campos del paso 1, los únicos que se validan al pulsar "Continuar". */
export const STEP_ONE_FIELDS = ['servicio', 'tipo', 'zona', 'fecha', 'franja'] as const;

export type StepOneField = (typeof STEP_ONE_FIELDS)[number];

/**
 * Fecha de hoy en formato ISO, en la zona horaria del negocio.
 * Se usa como `min` del input de fecha y para validar que no se pidan
 * recogidas en pasado.
 */
export function todayIso(timeZone = 'Europe/Madrid'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Deja el teléfono solo con dígitos para poder compararlo con el patrón. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s.\-]/g, '');
}

/** La duración es obligatoria cuando el servicio es concreto. */
export function durationRequired(service: string): boolean {
  return (SERVICES as readonly string[]).includes(service) && service !== 'Otro';
}

function isValidPickupDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (Number.isNaN(Date.parse(value))) return false;
  // Rechaza fechas imposibles (2026-02-31) que `Date.parse` deja pasar.
  if (new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) return false;
  return value >= today;
}

/**
 * Schema del lead. Se construye con los tipos y zonas del sitio porque
 * cambian por ciudad; el worker aplica las mismas reglas en servidor.
 */
export function buildLeadSchema(options: { types: string[]; zones: string[] }) {
  const today = todayIso();

  const fields = z.object({
    servicio: z
      .string()
      .refine((value) => value === '' || (SERVICES as readonly string[]).includes(value), {
        message: 'Elige un servicio de la lista.',
      }),
    tipo: z
      .string()
      .refine((value) => options.types.includes(value), { message: 'Elige un tamaño de furgoneta.' }),
    zona: z
      .string()
      .refine((value) => [...options.zones, OTHER_ZONE].includes(value), {
        message: 'Elige el municipio de recogida.',
      }),
    fecha: z
      .string()
      .refine(
        (value) => value === '' || isValidPickupDate(value, today),
        'La fecha de recogida debe ser hoy o posterior.',
      ),
    franja: z
      .string()
      .refine((value) => value === '' || (TIME_SLOTS as readonly string[]).includes(value), {
        message: 'Elige una franja de la lista.',
      }),
    duracion: z
      .string()
      .refine((value) => value === '' || (DURATIONS as readonly string[]).includes(value), {
        message: 'Elige una duración de la lista.',
      }),
    nombre: z
      .string()
      .trim()
      .min(1, 'Escribe tu nombre.')
      .max(MAX_NAME, 'El nombre no puede superar 100 caracteres.'),
    telefono: z
      .string()
      .max(MAX_PHONE, 'Revisa el teléfono.')
      .refine((value) => /^(?:\+34|0034)?[6789]\d{8}$/.test(normalizePhone(value)), {
        message: 'Escribe un teléfono español válido de 9 cifras.',
      }),
    email: z
      .string()
      .trim()
      .min(1, 'Escribe tu email.')
      .email('Escribe un email válido.')
      .max(MAX_EMAIL, 'El email es demasiado largo.'),
    carnet: z
      .enum(['', 'Sí', 'No'])
      .refine((value) => value !== '', { message: 'Indica si tienes carnet B con 2 años o más.' }),
    detalles: z
      .string()
      .trim()
      .max(MAX_DETAILS, 'Los detalles no pueden superar 2.000 caracteres.'),
    consentimiento: z.boolean().refine((value) => value, {
      message: 'Necesitamos tu consentimiento para gestionar el presupuesto.',
    }),
    // Honeypot: un bot lo rellena, una persona no.
    web: z.string().max(500),
  });

  return fields.superRefine((data, ctx) => {
    if (durationRequired(data.servicio) && !data.duracion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duracion'],
        message: 'Selecciona la duración del alquiler para este servicio.',
      });
    }
  });
}

export type LeadSchema = ReturnType<typeof buildLeadSchema>;
export type LeadValues = z.infer<LeadSchema>;
