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
});
