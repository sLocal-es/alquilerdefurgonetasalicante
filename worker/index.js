// Security-hardened Cloudflare Worker for sLocal lead capture.
// Admin token is read from env.ADMIN_TOKEN; if unset, admin endpoints are disabled.

const RATE_LIMITS = new Map();

// ── Reglas del lead ────────────────────────────────────────────────────────
// Coinciden con `src/utils/lead-schema.ts` (cliente). El servidor manda:
// si algo pasa aquí, es un envío directo a la API.
const LEAD_SERVICES = [
  "Mudanza",
  "Transporte de mercancías",
  "Reforma / obra",
  "Viaje con pasajeros",
  "Otro",
];
const LEAD_TIME_SLOTS = ["Indiferente", "Mañana 8 a 14 h", "Tarde 14 a 20 h"];
const LEAD_DURATIONS = ["Por horas", "1 día", "Fin de semana", "1 semana", "1 mes o más"];
const LEAD_CARNET = ["Sí", "No"];
const MAX_DETAILS = 2000;
const MAX_NAME = 100;
const MAX_EMAIL = 255;
const MAX_PHONE = 30;
const CONTACT_RATE_LIMIT = 5; // envíos permitidos por IP
const CONTACT_RATE_WINDOW_MS = 60_000;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];
const CARNET_ERROR = "Indica si tienes carnet B con 2 años o más";
const CONSENT_ERROR = "Necesitamos tu consentimiento para gestionar el presupuesto";
const ADMIN_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'";

export function resetRateLimits() {
  RATE_LIMITS.clear();
}

function sanitizeText(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max).replace(/[<>]/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** Deja el teléfono solo con dígitos para poder compararlo con el patrón. */
function normalizePhone(phone) {
  return String(phone ?? "").replace(/[\s.\-]/g, "");
}

function isValidSpanishPhone(phone) {
  return /^(?:\+34|0034)?[6789]\d{8}$/.test(normalizePhone(phone));
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (Number.isNaN(Date.parse(value))) return false;
  return new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

/** La duración es obligatoria cuando el servicio es concreto. */
export function durationRequired(service) {
  return LEAD_SERVICES.includes(service) && service !== "Otro";
}

/**
 * Lead vacío: mantiene la misma forma que un lead validado para que el
 * llamante no tenga que distinguir entre ramas.
 */
function emptyLead(honeypot = false) {
  return {
    honeypot,
    nombre: "",
    telefono: "",
    email: "",
    tipo: "",
    zona: "",
    servicio: "",
    fecha: "",
    franja: "",
    duracion: "",
    carnet: "",
    detalles: "",
    consentimiento: false,
    utm: {},
    pagina: "",
  };
}

/**
 * @typedef {object} LeadPayload
 * @property {boolean} honeypot
 * @property {string} nombre
 * @property {string} telefono
 * @property {string} email
 * @property {string} tipo
 * @property {string} zona
 * @property {string} servicio
 * @property {string} fecha
 * @property {string} franja
 * @property {string} duracion
 * @property {string} carnet
 * @property {string} detalles
 * @property {boolean} consentimiento
 * @property {Record<string, string>} utm
 * @property {string} pagina
 */

/** Formulario antiguo: no manda ninguno de los campos nuevos ni consentimiento. */
function isLegacyPayload(source) {
  return (
    source.tipo === undefined &&
    source.zona === undefined &&
    source.consentimiento === undefined &&
    source.servicio === undefined
  );
}

/** Campos de texto saneados; los nombres antiguos sirven de respaldo. */
function readLeadFields(source) {
  return {
    nombre: sanitizeText(source.nombre ?? source.name, MAX_NAME),
    telefono: sanitizeText(source.telefono ?? source.phone, MAX_PHONE),
    email: sanitizeText(source.email, MAX_EMAIL).toLowerCase(),
    tipo: sanitizeText(source.tipo ?? source.vehicle, 120),
    zona: sanitizeText(source.zona ?? source.zone, 120),
    servicio: sanitizeText(source.servicio ?? source.service, 60),
    fecha: sanitizeText(source.fecha ?? source.date, 10),
    franja: sanitizeText(source.franja, 60),
    duracion: sanitizeText(source.duracion ?? source.duration, 60),
    carnet: sanitizeText(source.carnet, 4),
    detalles: sanitizeText(source.detalles ?? source.message, MAX_DETAILS),
    pagina: sanitizeText(source.pagina, 2048),
  };
}

function readUtm(utm) {
  const result = {};
  if (!utm || typeof utm !== "object") return result;
  for (const key of UTM_KEYS) {
    const value = sanitizeText(utm[key], 500);
    if (value) result[key] = value;
  }
  return result;
}

/**
 * Mensaje de la primera regla que incumple, o null si el payload es válido.
 * El orden de las reglas es el orden en que se muestran los errores. Las
 * reglas no tienen efectos, así que evaluarlas todas es seguro.
 */
function firstLeadError(source, fields, legacy) {
  const rules = [
    [!fields.nombre || !fields.telefono || !fields.email, "Nombre, teléfono y email son obligatorios"],
    [!isValidEmail(fields.email), "Email inválido"],
    [!isValidSpanishPhone(fields.telefono), "Teléfono inválido"],
    [!legacy && !fields.tipo, "Elige un tamaño de furgoneta"],
    [!legacy && !fields.zona, "Elige el municipio de recogida"],
    [fields.servicio && !LEAD_SERVICES.includes(fields.servicio), "Elige un servicio de la lista"],
    [fields.franja && !LEAD_TIME_SLOTS.includes(fields.franja), "Elige una franja de la lista"],
    [fields.duracion && !LEAD_DURATIONS.includes(fields.duracion), "Elige una duración de la lista"],
    [durationRequired(fields.servicio) && !fields.duracion, "Selecciona la duración del alquiler para este servicio"],
    [!legacy && !fields.carnet, CARNET_ERROR],
    [fields.carnet && !LEAD_CARNET.includes(fields.carnet), CARNET_ERROR],
    [fields.fecha && !isValidIsoDate(fields.fecha), "La fecha de recogida no es válida"],
    [source.consentimiento !== undefined && source.consentimiento !== true, CONSENT_ERROR],
    [!legacy && source.consentimiento !== true, CONSENT_ERROR],
    [fields.pagina && (!fields.pagina.startsWith("/") || fields.pagina.startsWith("//")), "Página no válida"],
  ];
  const failed = rules.find(([invalid]) => invalid);
  return failed ? failed[1] : null;
}

/**
 * Normaliza y valida el payload del formulario de presupuesto.
 * Acepta los nombres nuevos (nombre, telefono, tipo, zona…) y los antiguos
 * (name, phone, vehicle, message) para no romper formularios previos.
 *
 * @returns {{ ok: true, value: LeadPayload } | { ok: false, error: string }}
 */
export function validateLead(body) {
  const source = body && typeof body === "object" ? body : {};

  // Honeypot: un bot rellena el campo oculto. Se responde 200 sin enviar nada.
  if (sanitizeText(source.web, 500)) return { ok: true, value: emptyLead(true) };

  // La deteccion del dialecto va con el payload ORIGINAL: un form viejo que
  // manda el consent en ingles sigue siendo legacy aunque lo normalicemos.
  const legacy = isLegacyPayload(source);

  // El checkbox de los formularios viejos manda "consent: on" cuando esta
  // marcado y no aparece cuando no; se normaliza a consentimiento booleano.
  if (source.consentimiento === undefined && source.consent !== undefined) {
    source.consentimiento = source.consent === true || source.consent === "on";
  }

  const fields = readLeadFields(source);
  const error = firstLeadError(source, fields, legacy);
  if (error) return { ok: false, error };

  return {
    ok: true,
    value: {
      honeypot: false,
      nombre: fields.nombre,
      telefono: normalizePhone(fields.telefono),
      email: fields.email,
      tipo: fields.tipo,
      zona: fields.zona,
      servicio: fields.servicio,
      fecha: fields.fecha,
      franja: fields.franja,
      duracion: fields.duracion,
      carnet: fields.carnet,
      detalles: fields.detalles,
      consentimiento: source.consentimiento === true,
      utm: readUtm(source.utm),
      pagina: fields.pagina,
    },
  };
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
}

function checkRateLimit(request, bucket, limit, windowMs) {
  const ip = getClientIp(request);
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const entry = RATE_LIMITS.get(key);
  if (!entry || now > entry.resetAt) {
    RATE_LIMITS.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

/**
 * ¿Este request ya no puede pasar? Delega en el limitador global de
 * Cloudflare (garantizado entre isolates y datacenters) cuando el binding
 * `RATE_LIMITER` esta configurado. El Map en memoria queda para el dev
 * local y como red de seguridad si el binding falta.
 */
async function isRateLimited(request, env, bucket, limit, windowMs) {
  const limiter = env?.RATE_LIMITER;
  if (limiter && typeof limiter.limit === "function") {
    const result = await limiter.limit({
      key: `${bucket}:${getClientIp(request)}`,
      period: Math.ceil(windowMs / 1000),
    });
    return !result.success;
  }
  return !checkRateLimit(request, bucket, limit, windowMs);
}

function getAllowedOrigins(request) {
  const fromEnv = (request.env?.ALLOWED_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (fromEnv.length) return new Set(fromEnv);
  return new Set([`https://${new URL(request.url).hostname}`]);
}

function isOriginAllowed(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return getAllowedOrigins(request).has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowed = getAllowedOrigins(request);
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token, Authorization",
    "Vary": "Origin",
  };
  if (origin && allowed.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function withHeaders(response, extra) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(extra || {})) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function jsonResponse(data, status = 200, extra = {}) {
  return withHeaders(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
    { ...securityHeaders(), ...extra },
  );
}

function forbidden() {
  return jsonResponse({ error: "Forbidden" }, 403);
}

function notFound() {
  return new Response("Not Found", { status: 404, headers: securityHeaders() });
}

function hasAdminAccess(request, env) {
  const token = env?.ADMIN_TOKEN;
  if (typeof token !== "string" || token.length < 16) return false;
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerToken = request.headers.get("X-Admin-Token") || "";
  const candidate = bearer || headerToken;
  return safeEqual(candidate, token);
}

/**
 * Envío de email con Resend. Requiere el secret `RESEND_API_KEY` y un
 * dominio remitente verificado en la cuenta de Resend.
 */
async function sendMail(env, payload) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
}

function leadMail(env, lead, referer) {
  return `
NUEVO LEAD - ${env.BRAND_NAME}
=========================================

Nombre:      ${lead.nombre}
Teléfono:    ${lead.telefono}
Email:       ${lead.email}

Furgoneta:   ${lead.tipo}
Zona:        ${lead.zona}
Servicio:    ${lead.servicio || "No especificado"}
Fecha:       ${lead.fecha || "No especificada"}
Franja:      ${lead.franja || "No indicada"}
Duración:    ${lead.duracion || "No indicada"}
Carnet B:    ${lead.carnet || "No indicado"}

Mensaje:
${lead.detalles || "Sin mensaje adicional"}

-----------------------------------------
Origen: ${referer}
Página: ${lead.pagina || "—"}
Fecha:  ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
`;
}

function autoReplyMail(env, name) {
  return `
Hola ${name},

Gracias por contactar con ${env.BRAND_NAME}. Hemos recibido tu solicitud correctamente y te contactaremos en menos de 1 hora con un presupuesto personalizado.

Si necesitas algo urgente, llámanos al ${env.PHONE_DISPLAY}.

Saludos,
El equipo de ${env.BRAND_NAME}
`;
}

async function saveLead(db, lead, site) {
  if (!db) return null;

  // Columnas completas: requieren la tabla con el esquema de `worker/schema.sql`.
  try {
    const result = await db
      .prepare(
        `INSERT INTO leads
           (name, phone, email, vehicle, message, site, servicio, zona, fecha_recogida, franja, duracion, carnet_b_2_anos, consentimiento, utm, pagina)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        lead.nombre,
        lead.telefono,
        lead.email,
        lead.tipo,
        lead.detalles,
        site,
        lead.servicio,
        lead.zona,
        lead.fecha || null,
        lead.franja || null,
        lead.duracion || null,
        lead.carnet === "Sí" ? 1 : 0,
        lead.consentimiento ? 1 : 0,
        JSON.stringify(lead.utm),
        lead.pagina || null
      )
      .run();
    return result;
  } catch (e) {
    console.error("D1 save error (esquema completo):", e);
  }

  // Fallback: si la base todavía tiene el esquema antiguo, se guardan al menos
  // los campos básicos para no perder el lead.
  try {
    const result = await db
      .prepare(`INSERT INTO leads (name, phone, email, vehicle, message, site) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(lead.nombre, lead.telefono, lead.email, lead.tipo, lead.detalles, site)
      .run();
    return result;
  } catch (e) {
    console.error("D1 save error (esquema básico):", e);
    return null;
  }
}

async function getDashboardStats(db) {
  if (!db) return null;
  try {
    const total = await db.prepare("SELECT COUNT(*) as c FROM leads").first();
    const today = await db.prepare("SELECT COUNT(*) as c FROM leads WHERE date(created_at) = date('now')").first();
    const clientes = await db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'cliente'").first();
    const perdidos = await db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'perdido'").first();
    const bySite = await db.prepare("SELECT site, COUNT(*) as c FROM leads GROUP BY site ORDER BY c DESC").all();
    const byVehicle = await db.prepare("SELECT vehicle, COUNT(*) as c FROM leads WHERE vehicle != '' GROUP BY vehicle ORDER BY c DESC").all();
    const recent = await db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 20").all();
    return { total: total.c, today: today.c, clientes: clientes.c, perdidos: perdidos.c, bySite: bySite.results, byVehicle: byVehicle.results, recent: recent.results };
  } catch (e) {
    console.error("D1 query error:", e);
    return null;
  }
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard — sLocal</title>
<style>
:root{--bg:#faf9f5;--card:#fff;--fg:#1a1a24;--muted:#8e8e99;--primary:#ea580c;--warn:#fbbf24;--green:#16a34a;--red:#dc2626;--border:#e8e5da;--radius:16px;--shadow:0 1px 2px rgba(17,17,17,.04),0 8px 24px rgba(17,17,17,.05)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--fg);padding:2rem;-webkit-font-smoothing:antialiased}
h1{font-size:1.5rem;margin-bottom:1.5rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:2rem}
.stat-card{background:var(--card);padding:1.25rem;border-radius:var(--radius);box-shadow:var(--shadow)}
.stat-label{font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem}
.stat-value{font-size:2rem;font-weight:700;color:var(--fg)}
.bars{margin-bottom:2rem;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
.bar-card{background:var(--card);padding:1.25rem;border-radius:var(--radius);box-shadow:var(--shadow)}
.bar-card h3{font-size:.9rem;margin-bottom:1rem;color:var(--muted)}
.bar-row{display:flex;align-items:center;margin-bottom:.75rem;font-size:.9rem}
.bar-label{flex:1}
.bar-track{flex:2;height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin:0 .75rem}
.bar-fill{height:100%;background:var(--primary);border-radius:4px}
.bar-count{font-weight:600;min-width:40px;text-align:right}
table{width:100%;background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);border-collapse:collapse;overflow:hidden}
th{text-align:left;padding:.75rem 1rem;font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid var(--border)}
td{padding:.6rem 1rem;font-size:.85rem;border-bottom:1px solid var(--border)}
tr:hover td{background:var(--bg)}
.badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:.75rem;font-weight:600}
.badge-nuevo{background:#fef3c7;color:#92400e}
.badge-contactado{background:#dbeafe;color:#1e40af}
.badge-cliente{background:#dcfce7;color:#166534}
.badge-perdido{background:#fce4ec;color:#991b1b}
.loading{text-align:center;padding:3rem;color:var(--muted)}
.empty{text-align:center;padding:2rem;color:var(--muted);font-size:.9rem}
@media(max-width:640px){.bars{grid-template-columns:1fr}body{padding:1rem}}
</style></head>
<body>
<h1>📊 Dashboard — sLocal</h1>
<div id="app"><div class="loading">Cargando datos…</div></div>
<script>
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
async function load(){
  const token = sessionStorage.getItem('admin_token') || prompt('Token de administración:');
  if(!token){document.getElementById('app').innerHTML='<div class="empty">Token requerido</div>';return;}
  sessionStorage.setItem('admin_token', token);
  const r=await fetch("/api/leads", { headers: { 'X-Admin-Token': token } });
  if(!r.ok) return document.getElementById("app").innerHTML='<div class="empty">Error al cargar datos ('+r.status+')</div>';
  const d=await r.json();
  if(!d||!d.total){return document.getElementById("app").innerHTML='<div class="empty">No hay leads todavía</div>'}
  const b=["nuevo","contactado","cliente","perdido"];
  const max=v=>v&&v.length?Math.max(...v.map(x=>x.c)):1;
  const byS=Array.isArray(d.bySite)?d.bySite:[];
  const byV=Array.isArray(d.byVehicle)?d.byVehicle:[];
  document.getElementById("app").innerHTML=
    '<div class="stats">'+
      '<div class="stat-card"><div class="stat-label">Leads totales</div><div class="stat-value">'+esc(d.total||0)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Hoy</div><div class="stat-value">'+esc(d.today||0)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Clientes</div><div class="stat-value" style="color:var(--green)">'+esc(d.clientes||0)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Perdidos</div><div class="stat-value" style="color:var(--red)">'+esc(d.perdidos||0)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Conversión</div><div class="stat-value">'+esc((d.total?Math.round(d.clientes/d.total*100):0)+'%')+'</div></div>'+
    '</div>'+
    '<div class="bars">'+
      '<div class="bar-card"><h3>Por sitio</h3>'+(byS.length?byS.map(s=>'<div class="bar-row"><span class="bar-label">'+esc(s.site||'web')+'</span><div class="bar-track"><div class="bar-fill" style="width:'+esc(s.c/max(byS)*100)+'%"></div></div><span class="bar-count">'+esc(s.c)+'</span></div>').join(''):'<div class="empty">Sin datos</div>')+'</div>'+
      '<div class="bar-card"><h3>Por vehículo</h3>'+(byV.length?byV.map(v=>'<div class="bar-row"><span class="bar-label">'+esc(v.vehicle||'Sin especificar')+'</span><div class="bar-track"><div class="bar-fill" style="width:'+esc(v.c/max(byV)*100)+'%"></div></div><span class="bar-count">'+esc(v.c)+'</span></div>').join(''):'<div class="empty">Sin datos</div>')+'</div>'+
    '</div>'+
    '<table><thead><tr><th>Fecha</th><th>Nombre</th><th>Vehículo</th><th>Estado</th></tr></thead><tbody>'+
      (Array.isArray(d.recent)?d.recent:[]).map(l=>
        '<tr><td>'+esc(new Date(l.created_at.replace(" ","T")+"Z").toLocaleString("es-ES").slice(0,-3))+'</td><td><strong>'+esc(l.name)+'</strong><br><span style="font-size:.75rem;color:var(--muted)">'+esc(l.phone)+' · '+esc(l.email)+'</span></td><td>'+esc(l.vehicle||'—')+'</td><td><span class="badge badge-'+esc(l.status||'nuevo')+'">'+esc(l.status||'nuevo')+'</span></td></tr>'
      ).join('')+
    '</tbody></table>';
}
load();
</script>
</body></html>`;

/** Preflight CORS: sin cuerpo, con las cabeceras de seguridad y CORS. */
function preflightResponse(cors) {
  return withHeaders(new Response(null, { status: 204 }), { ...securityHeaders(), ...cors });
}

/** En producción todo va por HTTPS; en local se deja pasar HTTP. */
function isInsecureRemote(url) {
  return url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
}

function httpsRedirect(url) {
  const secure = new URL(url.toString());
  secure.protocol = "https:";
  return Response.redirect(secure.toString(), 301);
}

function handleAdminPage(request, env) {
  if (!hasAdminAccess(request, env)) return forbidden();
  return withHeaders(
    new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    { ...securityHeaders(), "Content-Security-Policy": ADMIN_CSP },
  );
}

async function handleLeadStats(request, env, cors) {
  if (request.method === "OPTIONS") return preflightResponse(cors);
  if (!hasAdminAccess(request, env)) return forbidden();
  const stats = await getDashboardStats(env.DB);
  return jsonResponse(stats || {}, 200, cors);
}

async function handleContact(request, env, url, ctx, cors) {
  if (request.method === "OPTIONS") return preflightResponse(cors);
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, cors);
  if (await isRateLimited(request, env, "contact", CONTACT_RATE_LIMIT, CONTACT_RATE_WINDOW_MS)) {
    return jsonResponse({ error: "Demasiadas solicitudes. Intenta más tarde." }, 429, cors);
  }

  try {
    return await processContact(request, env, url, ctx, cors);
  } catch (err) {
    console.error("Contact API error:", err);
    return jsonResponse({ error: "Error interno del servidor" }, 500, cors);
  }
}

async function processContact(request, env, url, ctx, cors) {
  const result = validateLead(await request.json());
  if (!result.ok) return jsonResponse({ error: result.error }, 400, cors);

  // Honeypot relleno: se responde 200 sin enviar email ni guardar nada.
  if (result.value.honeypot) return jsonResponse({ success: true }, 200, cors);

  const lead = result.value;
  // El secret se comprueba después de validar: un payload inválido es un
  // 400, no un 502 de email.
  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return jsonResponse({ error: "Error al enviar el email. Intenta de nuevo." }, 502, cors);
  }

  const referer = request.headers.get("referer") || "Directo";
  const mailRes = await sendMail(env, ownerEmailPayload(env, lead, referer));
  if (!mailRes.ok) {
    console.error("Resend error:", await mailRes.text());
    return jsonResponse({ error: "Error al enviar el email" }, 502, cors);
  }

  sendAutoReply(env, lead, ctx);
  await saveLead(env.DB, lead, siteFromHost(url));
  return jsonResponse({ success: true }, 200, cors);
}

function ownerEmailPayload(env, lead, referer) {
  return {
    from: `${env.BRAND_NAME} <noreply@${env.DOMAIN}>`,
    to: [env.TO_EMAIL],
    reply_to: lead.email,
    subject: `Nuevo lead: ${lead.nombre} - ${lead.tipo || "Sin vehículo"}`,
    text: leadMail(env, lead, referer),
  };
}

/**
 * Auto-respuesta best effort: no bloquea la respuesta, y waitUntil evita que
 * el runtime la cancele al cerrarla.
 */
function sendAutoReply(env, lead, ctx) {
  const pending = sendMail(env, {
    from: `${env.BRAND_NAME} <noreply@${env.DOMAIN}>`,
    to: [lead.email],
    reply_to: env.TO_EMAIL,
    subject: `Hemos recibido tu consulta — ${env.BRAND_NAME}`,
    text: autoReplyMail(env, lead.nombre),
  })
    .then(async (res) => {
      if (!res.ok) console.error("Auto-reply rejected:", res.status, await res.text());
    })
    .catch((err) => console.error("Auto-reply error:", err));
  ctx?.waitUntil?.(pending);
}

/** Subdominio del sitio (por ejemplo "alquilerdefurgonetassevilla" en producción). */
function siteFromHost(url) {
  return url.hostname.split(".")[0] || "";
}

export default {
  async fetch(request, env = {}, ctx) {
    const url = new URL(request.url);

    if (isInsecureRemote(url)) return httpsRedirect(url);
    if (!isOriginAllowed(request)) return jsonResponse({ error: "Origin not allowed" }, 403);

    const cors = corsHeaders(request);

    switch (url.pathname) {
      case "/admin":
        return handleAdminPage(request, env);
      case "/api/leads":
        return handleLeadStats(request, env, cors);
      case "/api/contact":
        return handleContact(request, env, url, ctx, cors);
      default:
        // El resto de rutas las sirve el servidor de assets, que es quien
        // devuelve la pagina 404 del sitio (not_found_handling: 404-page).
        return env.ASSETS ? env.ASSETS.fetch(request) : notFound();
    }
  },
};
