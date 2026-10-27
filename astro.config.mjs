// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Paginas que no deben entrar en el sitemap ni indexarse: las legales.
 * En GSC (ultimos 3 meses) reciben 0 impresiones y el engine (el molde)
 * tambien las excluye. Si algun dia se quiere indexar una, se quita de
 * esta lista y del prop `noindex` de su pagina.
 */
const NOINDEX_PATHS = [
  '/aviso-legal/',
  '/politica-de-cookies/',
  '/politica-de-privacidad/',
  '/terminos-y-condiciones/',
];

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://alquilerdefurgonetasalicante.es',
  integrations: [
    sitemap({
      filter: (page) => !NOINDEX_PATHS.includes(new URL(page).pathname),
    }),
  ],
  vite: {
    server: {
      allowedHosts: true
    }
  }
});
