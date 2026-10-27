# Registro SEO — alquilerdefurgonetasalicante.es

Log de cambios de metadatos por fecha. Estrategia base:
`sLocal/docs/planning/estrategia-canibalizacion-metadatos.md`.
Evidencia GSC: `sLocal/research/GSC/furgonetasalicante/` (últimos 3 meses).

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
