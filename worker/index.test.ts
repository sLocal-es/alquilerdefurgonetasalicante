import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';

vi.stubGlobal('fetch', vi.fn());

const { default: worker, resetRateLimits, validateLead } = await import('./index.js');

/** Entorno del worker con el secret de email y los vars del sitio. */
const env = {
  RESEND_API_KEY: 're_test_key',
  BRAND_NAME: 'Test Brand',
  DOMAIN: 'test.es',
  TO_EMAIL: 'leads@test.es',
  PHONE_DISPLAY: '600 00 00 00',
} as any;

const validLead = {
  nombre: 'Test',
  telefono: '600123456',
  email: 't@t.com',
  tipo: 'furgoneta-pequeña-alicante',
  zona: 'Alicante capital',
  servicio: 'Mudanza',
  fecha: '',
  franja: '',
  duracion: '1 día',
  carnet: 'Sí',
  detalles: 'Mudanza pequeña',
  consentimiento: true,
  utm: {},
  pagina: '/',
};

function contactRequest(body: unknown) {
  return new Request('https://test.com/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Worker contact API', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    resetRateLimits();
  });

  it('returns 400 when name is missing', async () => {
    const req = contactRequest({ ...validLead, nombre: '' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Nombre');
  });

  it('returns 400 when phone is missing', async () => {
    const req = contactRequest({ ...validLead, telefono: '' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const req = contactRequest({ ...validLead, email: '' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('returns 400 when the phone is not a Spanish number', async () => {
    const req = contactRequest({ ...validLead, telefono: '12345' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Teléfono');
  });

  it('returns 400 when the vehicle type is missing', async () => {
    const req = contactRequest({ ...validLead, tipo: '' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('returns 400 when the pickup zone is missing', async () => {
    const req = contactRequest({ ...validLead, zona: '' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('returns 400 when the consent is not given', async () => {
    const req = contactRequest({ ...validLead, consentimiento: false });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('consentimiento');
  });

  it('returns 400 when a concrete service has no duration', async () => {
    const req = contactRequest({ ...validLead, duracion: '' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('duración');
  });

  it('sends email via Resend and returns 200 on success', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));

    const res = await worker.fetch(contactRequest(validLead), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object));

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse((options as RequestInit).body as string);
    expect(payload.text).toContain('Test');
    expect(payload.text).toContain('Alicante capital');
    // El destino y el remitente salen de los vars del sitio, no del código.
    expect(payload.to).toEqual(['leads@test.es']);
    expect(payload.from).toBe('Test Brand <noreply@test.es>');
    expect(payload.reply_to).toBe('t@t.com');
  });

  it('accepts the legacy field names', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));

    // Payload exacto del formulario antiguo: sin campos nuevos ni consentimiento.
    const res = await worker.fetch(
      contactRequest({
        name: 'Test',
        phone: '600123456',
        email: 't@t.com',
        vehicle: 'pequeña',
        message: 'hola',
      }),
      env,
    );
    expect(res.status).toBe(200);
  });

  it('does not send anything when the honeypot is filled', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));

    const res = await worker.fetch(contactRequest({ ...validLead, web: 'http://spam.example' }), env);
    expect(res.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 502 when RESEND_API_KEY is not configured', async () => {
    const req = contactRequest(validLead);
    const res = await worker.fetch(req, {} as any);
    expect(res.status).toBe(502);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('validates the payload before checking the email secret', async () => {
    const req = contactRequest({ ...validLead, consentimiento: false });
    const res = await worker.fetch(req, {} as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('consentimiento');
  });

  it('returns 502 when Resend fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Bad', { status: 400 }));

    const res = await worker.fetch(contactRequest(validLead), env);
    expect(res.status).toBe(502);
  });

  it('returns 204 for OPTIONS preflight', async () => {
    const req = new Request('https://test.com/api/contact', { method: 'OPTIONS' });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns 500 on JSON parse error', async () => {
    const req = new Request('https://test.com/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    });
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(500);
  });

  it('returns 404 for non-API paths', async () => {
    const req = new Request('https://test.com/');
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(404);
  });

  it('keeps the auto-reply alive after the response through ctx.waitUntil', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));
    const ctx = { waitUntil: vi.fn() } as any;

    const res = await worker.fetch(contactRequest(validLead), env, ctx);
    expect(res.status).toBe(200);

    // Sin waitUntil el runtime puede cancelar el auto-reply al cerrar la respuesta.
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    await ctx.waitUntil.mock.calls[0][0];
    const [, autoReply] = vi.mocked(fetch).mock.calls;
    const payload = JSON.parse((autoReply[1] as RequestInit).body as string);
    expect(payload.to).toEqual(['t@t.com']);
  });

  it('stores the consent as received: a legacy lead without consent is saved with consentimiento 0', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));
    const run = vi.fn(async () => ({ success: true }));
    const bind = vi.fn((..._values: unknown[]) => ({ run }));
    const db = { prepare: vi.fn(() => ({ bind })) } as any;

    const res = await worker.fetch(
      contactRequest({ name: 'Test', phone: '600123456', email: 't@t.com', vehicle: 'pequeña', message: 'hola' }),
      { ...env, DB: db },
    );
    expect(res.status).toBe(200);

    // Columnas: nombre, telefono, email, tipo, detalles, site, servicio, zona,
    // fecha, franja, duracion, carnet, consentimiento (índice 12).
    expect(bind).toHaveBeenCalledTimes(1);
    expect(bind.mock.calls[0][12]).toBe(0);
  });

  it('serves non-API paths from ASSETS when the binding exists', async () => {
    const assetResponse = new Response('<html>asset</html>', { status: 200 });
    const envWithAssets = { ...env, ASSETS: { fetch: vi.fn(async () => assetResponse) } as any };

    const res = await worker.fetch(new Request('https://test.com/'), envWithAssets);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<html>asset</html>');
  });

  it('maps the legacy English field names of the Alicante form', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));

    // Payload exacto del formulario viejo de Alicante: names en inglés.
    const res = await worker.fetch(
      contactRequest({
        name: 'Jorge',
        phone: '600123456',
        email: 't@t.com',
        vehicle: 'mediana',
        service: 'Mudanza',
        date: '2026-10-25',
        duration: '1 día',
        consent: 'on',
        message: 'hola',
      }),
      env,
    );
    expect(res.status).toBe(200);

    // El lead llega completo: el mapeo EN→ES pierde nada.
    const [ownerMail] = vi.mocked(fetch).mock.calls;
    const payload = JSON.parse((ownerMail[1] as RequestInit).body as string);
    expect(payload.text).toContain('Servicio:    Mudanza');
    expect(payload.text).toContain('Fecha:       2026-10-25');
    expect(payload.text).toContain('Duración:    1 día');
    // El form viejo no pregunta el carnet: el campo queda vacío, no inventado.
    expect(payload.text).toContain('Carnet B:    No indicado');
  });

  it('keeps the consent as sent when the old form sends it in English', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));
    const run = vi.fn(async () => ({ success: true }));
    const bind = vi.fn((..._values: unknown[]) => ({ run }));
    const db = { prepare: vi.fn(() => ({ bind })) } as any;

    // El checkbox del form viejo manda "on" cuando está marcado y no aparece
    // cuando no lo está: ambos casos guardan lo que llegó.
    const checked = await worker.fetch(
      contactRequest({ name: 'T', phone: '600123456', email: 't@t.com', consent: 'on' }),
      { ...env, DB: db },
    );
    expect(checked.status).toBe(200);
    expect(bind.mock.calls[0][12]).toBe(1);

    resetRateLimits();

    const unchecked = await worker.fetch(
      contactRequest({ name: 'T', phone: '600123456', email: 't@t.com' }),
      { ...env, DB: db },
    );
    expect(unchecked.status).toBe(200);
    expect(bind.mock.calls[1][12]).toBe(0);
  });

  it('rate limits globally when the Cloudflare RATE_LIMITER binding exists', async () => {
    // El limitador global de Cloudflare: garantizado entre isolates y
    // datacenters, a diferencia del Map en memoria del proceso.
    let calls = 0;
    const limiter = {
      limit: vi.fn(async () => ({ success: ++calls <= 5 })),
    };
    const envWithLimiter = { ...env, RATE_LIMITER: limiter } as any;
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));

    let last = null;
    for (let i = 1; i <= 6; i++) {
      last = await worker.fetch(contactRequest({ ...validLead }), envWithLimiter);
      if (i <= 5) expect(last.status, `envío ${i}`).toBe(200);
      else expect(last.status, `envío ${i}`).toBe(429);
    }
    // El worker delega en el binding global, no en el Map local.
    expect(limiter.limit).toHaveBeenCalledTimes(6);
  });

  it('falls back to the in-memory Map when the RATE_LIMITER binding is absent', async () => {
    // El dev local y el wrangler sin el binding: el Map del proceso manda.
    resetRateLimits();
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 202 }));
    let last = null;
    for (let i = 1; i <= 6; i++) {
      last = await worker.fetch(contactRequest({ ...validLead }), env);
      if (i <= 5) expect(last.status, `envío ${i}`).toBe(200);
      else expect(last.status, `envío ${i}`).toBe(429);
    }
  });
});

describe('Worker source', () => {
  it('has no site data hardcoded in the source', () => {
    // Los datos del sitio viajan en los vars de wrangler.jsonc. Si se
    // colaran placeholders o nombres en el fuente, el worker desplegaría
    // con datos de otro sitio.
    const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf-8');
    const placeholders = source.match(/\{\{[A-Z_]+\}\}/g) ?? [];
    expect(placeholders).toEqual([]);
    expect(source).toContain('env.BRAND_NAME');
    expect(source).toContain('env.TO_EMAIL');
  });
});

describe('Lead validation', () => {
  it('normalizes the phone and keeps the utm parameters', () => {
    const result = validateLead({ ...validLead, telefono: '+34 600-12-34-56', utm: { utm_source: 'test', basura: 'x' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.telefono).toBe('+34600123456');
    expect(result.value.utm).toEqual({ utm_source: 'test' });
  });

  it('rejects an invalid pickup date', () => {
    const result = validateLead({ ...validLead, fecha: '2026-02-31' });
    expect(result.ok).toBe(false);
  });

  it('rejects a service outside the list', () => {
    const result = validateLead({ ...validLead, servicio: 'Alquiler de un avión' });
    expect(result.ok).toBe(false);
  });

  it('allows an empty duration when the service is not concrete', () => {
    const result = validateLead({ ...validLead, servicio: 'Otro', duracion: '' });
    expect(result.ok).toBe(true);
  });
});
