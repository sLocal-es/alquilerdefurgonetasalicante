-- Esquema de la tabla de leads en D1 (Cloudflare).
-- Ejecutar en la consola de D1 del sitio:
--   npx wrangler d1 execute <DB_NAME> --file=worker/schema.sql
--
-- El worker escribe con el esquema completo. Si la tabla existe con el
-- esquema antiguo, el worker cae al INSERT de los campos básicos, así que
-- conviene aplicar este archivo al crear la base.

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  vehicle TEXT,
  message TEXT,
  site TEXT,
  servicio TEXT,
  zona TEXT,
  fecha_recogida TEXT,
  franja TEXT,
  duracion TEXT,
  carnet_b_2_anos INTEGER DEFAULT 0,
  consentimiento INTEGER DEFAULT 0,
  utm TEXT,
  pagina TEXT,
  status TEXT DEFAULT 'nuevo',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_site ON leads (site);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
