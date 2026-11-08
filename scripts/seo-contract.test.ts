import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Contrato SEO sobre el build (npm test = astro build && vitest run).
 *
 * 1. Canonical y og:url de cada página apuntan a la propia página.
 * 2. Ningún enlace interno apunta a una ruta que no existe.
 * 3. Paridad congelada: URLs indexables, <title>, meta description y H1 deben
 *    coincidir con `seo-baseline.json` (foto de producción, 2026-11-08).
 *
 * Motivo: en el port de Getafe al engine v2 las fichas salieron con canonical
 * a /service/<slug>/ (404) y 10 enlaces internos rotos, y pasaron el CI.
 * Alicante es el sitio con más tráfico: cualquier cambio de URL o metadatos
 * debe ser deliberado. Si un cambio es intencionado, regenerar la foto con
 *   UPDATE_SEO_BASELINE=1 npm test
 * y revisar el diff de seo-baseline.json en el PR.
 */
const SITE = 'https://alquilerdefurgonetasalicante.es';
const dist = path.resolve(__dirname, '../dist');
const baselinePath = path.resolve(__dirname, 'seo-baseline.json');

type PageSeo = { title: string; description: string; h1: string };

function htmlPages(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlPages(full);
    return entry.name === 'index.html' ? [full] : [];
  });
}

/** Ruta pública (decodificada) de un index.html del build. */
function pagePath(file: string): string {
  const rel = path.relative(dist, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const text = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

function extractSeo(html: string): PageSeo {
  return {
    title: decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? ''),
    description: decodeEntities(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
    h1: text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''),
  };
}

const pages = htmlPages(dist);
const isIndexable = (html: string) => !/<meta name="robots" content="noindex/.test(html);

describe('Contrato SEO del build', () => {
  it('encuentra las páginas del build', () => {
    expect(pages.length, 'dist/ vacío — ejecutar npm test (build + vitest)').toBeGreaterThan(5);
  });

  it.each(pages.map((file) => [pagePath(file), file]))(
    'canonical y og:url de %s apuntan a la propia página',
    (route, file) => {
      const html = fs.readFileSync(file, 'utf8');
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
      expect(canonical && decodeURI(canonical)).toBe(`${SITE}${route}`);
      expect(ogUrl && decodeURI(ogUrl)).toBe(`${SITE}${route}`);
      for (const [, href] of html.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)"/g)) {
        expect(decodeURI(href)).toBe(`${SITE}${route}`);
      }
    },
  );

  it('ningún enlace interno apunta a una página que no existe', () => {
    const broken: string[] = [];
    for (const file of pages) {
      const html = fs.readFileSync(file, 'utf8');
      for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
        let target = href;
        if (target.startsWith(SITE)) target = target.slice(SITE.length) || '/';
        if (!target.startsWith('/') || target.startsWith('//')) continue;
        const pathname = decodeURI(target.split(/[?#]/)[0]);
        const exists =
          fs.existsSync(path.join(dist, pathname, 'index.html')) || fs.existsSync(path.join(dist, pathname));
        if (!exists) broken.push(`${pagePath(file)} -> ${href}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('cada página tiene exactamente un H1', () => {
    const offenders = pages
      .map((file) => [pagePath(file), (fs.readFileSync(file, 'utf8').match(/<h1\b/g) ?? []).length] as const)
      .filter(([, n]) => n !== 1);
    expect(offenders).toEqual([]);
  });

  it('URLs indexables, títulos, descriptions y H1 coinciden con la foto de producción', () => {
    const current: Record<string, PageSeo> = {};
    for (const file of pages) {
      const html = fs.readFileSync(file, 'utf8');
      if (isIndexable(html)) current[pagePath(file)] = extractSeo(html);
    }
    const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));

    if (process.env.UPDATE_SEO_BASELINE === '1') {
      fs.writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
    }
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, PageSeo>;
    expect(sorted).toEqual(baseline);
  });
});
