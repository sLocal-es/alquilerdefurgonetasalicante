import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Build-output SEO contract: legal pages must stay out of the sitemap and
 * carry a noindex robots meta (engine mold, GSC evidence: 0 impressions),
 * while content pages remain indexable.
 */
const dist = path.resolve(__dirname, '../dist');
const read = (rel: string) => fs.readFileSync(path.join(dist, rel), 'utf8');

const LEGAL_PATHS = [
  '/aviso-legal/',
  '/politica-de-cookies/',
  '/politica-de-privacidad/',
  '/terminos-y-condiciones/',
];

describe('SEO output of the build', () => {
  it('has a build to check (run `npm test`, which builds first)', () => {
    expect(fs.existsSync(path.join(dist, 'sitemap-0.xml')), 'dist/ missing — run npm test (astro build && vitest run)').toBe(true);
  });

  it('keeps legal pages out of the sitemap, content pages in', () => {
    const sitemap = read('sitemap-0.xml');
    for (const legal of LEGAL_PATHS) {
      expect(sitemap).not.toContain(`<loc>https://alquilerdefurgonetasalicante.es${legal}</loc>`);
    }
    expect(sitemap).toContain('<loc>https://alquilerdefurgonetasalicante.es/</loc>');
  });

  it('marks legal pages noindex,follow and keeps the home indexable', () => {
    for (const legal of LEGAL_PATHS) {
      const html = read(`${legal}index.html`);
      expect(html).toContain('<meta name="robots" content="noindex, follow"');
    }
    const home = read('index.html');
    expect(home).toContain('content="index, follow, max-snippet:-1, max-image-preview:large"');
  });

  it('gives every JSON-LD Product an Offer, Review or an aggregateRating', () => {
    // GSC product snippet critical rule ("Debe especificarse \"offers\",
    // \"review\" o \"aggregateRating\""): Google evaluates every Product node
    // on its own, even when it sits inside offer wraps like
    // OfferCatalog.itemOffered, so each one needs its own anchor.
    const walk = (dir: string): string[] =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((entry) => {
          const entryPath = path.join(dir, entry.name);
          return entry.isDirectory() ? walk(entryPath) : entry.name.endsWith('.html') ? [entryPath] : [];
        });

    const offenders: string[] = [];
    const findProducts = (node: unknown, file: string): void => {
      if (Array.isArray(node)) {
        node.forEach((child) => findProducts(child, file));
        return;
      }
      if (typeof node !== 'object' || node === null) return;
      const record = node as Record<string, unknown>;
      if (record['@type'] === 'Product') {
        const hasAnchor = ['offers', 'review', 'aggregateRating'].some((k) => record[k] != null);
        if (!hasAnchor) offenders.push(`${file}: ${String(record.name)}`);
      }
      Object.values(record).forEach((child) => findProducts(child, file));
    };

    for (const htmlPath of walk(dist)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      const blocks = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? [];
      for (const block of blocks) {
        let data: unknown;
        try {
          data = JSON.parse(block.replace(/<\/?script[^>]*>/g, ''));
        } catch {
          continue;
        }
        findProducts(data, path.relative(dist, htmlPath));
      }
    }

    expect(offenders).toEqual([]);
  });
});
