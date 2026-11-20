// SEO — la guía informativa no debe canibalizar la home.
// La consulta genérica ("alquiler de furgonetas en Alicante") la ganó la guía
// y la portada quedó detrás; el enlace del primer párrafo devuelve la señal a
// la home y deja a la guía su rol informativo. Sin este test, el enlace se
// pierde en la próxima reescritura del contenido y nadie lo nota.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const blogData = readFileSync(join(here, '_blog-data.ts'), 'utf8');

const GUIDE_SLUG = 'alquiler-furgonetas-alicante-guia-completa';
const HOME_ANCHOR = '<a href="/">alquiler de furgonetas en Alicante</a>';

function guideEntry(): string {
  const start = blogData.indexOf(`slug: '${GUIDE_SLUG}'`);
  const nextPost = blogData.indexOf("slug: '", start + 1);
  return blogData.slice(start, nextPost === -1 ? undefined : nextPost);
}

describe('blog — la guía enlaza a la home con el anchor de la consulta genérica', () => {
  it('el primer párrafo de la guía contiene el enlace a la portada', () => {
    const firstParagraph = guideEntry().match(/<p>([\s\S]*?)<\/p>/);

    expect(firstParagraph, 'la guía no tiene primer párrafo').not.toBeNull();
    expect(firstParagraph![1]).toContain(HOME_ANCHOR);
  });
});
