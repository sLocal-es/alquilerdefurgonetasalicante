# Registro SEO — alquilerdefurgonetasalicante.es

Log de cambios de metadatos por fecha. Estrategia base:
`sLocal/docs/planning/estrategia-canibalizacion-metadatos.md`.
Evidencia GSC: `sLocal/research/GSC/furgonetasalicante/` (últimos 3 meses).

## 2026-11-08 — Schema: imagen en los productos del catálogo

Rama: `fix/schema-imagen-catalogo` — GSC (inspección 5 nov, por horas y reformas): "Fichas de comerciantes: falta el campo image" (error) en los 4 Product del OfferCatalog que imprime `Layout.astro` en todas las páginas; apareció al añadir `offers` (PR #37). Se añade `image` (card webp) y `url` (ficha) a cada uno, y el Product de cada ficha usa su imagen hero en vez del favicon SVG. Test en `scripts/build-seo.test.ts`: todo Product con imagen raster existente. Sin cambios de URL, títulos, descriptions ni H1 (foto de paridad intacta). Tras deploy: GSC → Fichas de comerciantes → Validar corrección.

## 2026-11-08 — Contrato SEO y foto de paridad (sin cambios en la web)

Rama: `test/contrato-seo-paridad` — solo tests. `scripts/seo-contract.test.ts` comprueba en cada build: canonical/og:url propios, 0 enlaces internos rotos, 1 H1 por página y que las 13 URLs indexables mantienen título, description y H1 de `scripts/seo-baseline.json` (foto de producción). Motivo: el port de Getafe al engine v2 llegó a producción con canonical a `/service/…` (404) en las fichas; Alicante es el sitio con más tráfico. La foto es además la guardia de paridad para un futuro port. Cambio intencionado de metadatos → `UPDATE_SEO_BASELINE=1 npm test` y revisar el diff en el PR.

Auditoría técnica del build actual (18 páginas): canonicals, sitemap, noindex de legales, JSON-LD válido, títulos/descriptions únicos y enlaces internos — sin incidencias.

## 2026-10-27 — Higiene: card falsa "De pasajeros" fuera del home

Rama: `fix/home-card-pasajeros-falsa` — el home prometía vans 7-9 plazas que la flota no tiene (form: solo 4 de carga, 2-3/3 plazas); ~59 imp de queries "9 plazas" a pos 61-72 con 0 clicks. Reemplazada por card "Por horas" (oferta real, mejores posiciones GSC del sitio) con anchor a `/alquiler-furgonetas-por-horas-alicante/`. Confirmado por el dueño: flota solo carga.

## 2026-10-27 — Higiene: legales fuera del sitemap y con `noindex`

Rama: `fix/noindex-legales-sitemap` — molde del engine (`NOINDEX_PATHS` + filtro) y prop `noindex` en las 4 legales. Motivo: 0 impresiones en GSC (3 meses), alineado al molde del motor. Test de contrato en `scripts/build-seo.test.ts` (sitemap sin legales + meta robots + controles positivos). Sin cambios de URL.

## 2026-10-27 — Anti-canibalización (metadatos, sin cambios de URL)

Rama: `feat/canibalizacion-metadata-alicante`

| Página | Cambio | Motivo (evidencia GSC) |
|---|---|---|
| `/` | description sin "Por horas" | Colisión con la intención de por-horas |
| `/furgoneta-pequeña-alicante/` | title con (3-4m³), sin precio duplicado | Título casi gemelo del home (mismo 35€/día) |
| `/furgoneta-mediana-alicante/` | title con (6-7m³) | Consistencia de capacidad entre fichas |
| `/furgoneta-grande-alicante/` | title con (8-10m³) | Colisión substring con extra-grande |
| `/furgoneta-extra-grande-alicante/` | title con (12-15m³) | Colisión substring con grande |
| `/alquiler-furgonetas-por-horas-alicante/` | desc sin "mudanzas puntuales" | Colisión con la ficha de mudanzas |
| `/furgonetas-mudanzas-alicante/` | desc con "reserva online" | Señal transaccional (queries pos 10-12 capturadas por el blog) |
| `/blog/alquiler-furgonetas-alicante-guia-completa/` | title re-anclado: "Cómo alquilar…" | Clonaba el head del home (74 imp a pos 81.8) |
| `/blog/mudanzas-alicante-guia-barrios/` | title re-anclado: "Cómo organizar…" | Capturaba queries transaccionales de mudanza |

Sin cambios: `/alquiler-furgonetas-san-vicente/` (pos 4.8 en su query, top-10 estable)
y `/furgonetas-reformas-construccion-alicante/` (pos 9). Canonicals, sitemap y URLs intactos.

Re-medición GSC: 14-30 días después del merge.
