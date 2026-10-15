# odd/tasks/mejoras-web-alicante.md

## Feature

`mejoras-web-alicante` — mejoras SEO on-page, conversión y contenidos para `alquilerdefurgonetasalicante.es`, derivadas del análisis de Google/Gemini, ajustadas a las políticas anti-doorway y E-E-A-T.

## Objective

Aplicar solo los cambios autorizados por el dueño del sitio, evitando páginas puerta y manteniendo contenido único, útil y trazable. Cada bloque se entregará en una PR independiente sobre `main`.

## Product decisions (user confirmed)

- Barrios: crear solo `/alquiler-furgonetas-san-vicente/`, enfocada en estudiantes/universitarios (zona de residencia y mudanzas).
- Transparencia: añadir sección consolidada de tarifas/condiciones. Precios TBD hasta recibir tabla real.
- Archivos IA: crear `/public/llms.txt` y `/public/llms-full.txt` (obligatorio).
- Nano-nichos: crear `/furgonetas-mudanzas-alicante/` y `/furgonetas-reformas-construccion-alicante/`; mejorar `/alquiler-furgonetas-por-horas-alicante/` (ya existente). `/furgonetas-pasajeros-alicante/` descartado.
- H2: reescribir encabezados genéricos a `servicio + Alicante`.
- CTAs: sustituir enlaces `#contacto` por enlaces directos de WhatsApp (teléfono `34645818944`) o contacto adecuado.
- Footer, enlaces legales y canonical actuales: OK, no requieren cambios en este plan.
- Schema estructurado actual (`AutoRental`) se mantiene; mejora a `LocalBusiness` queda fuera de este alcance salvo nueva decisión.

## Current evidence (repo snapshot)

- Branch: `fix/home-grande-image`; no se trabaja ni hace push sobre `main`.
- Contacto: `Layout.astro:177-181`, teléfono WhatsApp `34645818944`, email `alquilerfurgonetasalicante@proton.me`.
- Precios actuales: `PricingTable.astro:2-7`, `index.astro` cards, `VehicleCard` genérico.
- CTAs `#contacto`: `PricingTable.astro:31`, `ServiceDetailLayout.astro:112`, `index.astro:95`, `alquiler-furgonetas-por-horas-alicante.astro:175,262`, `blog/index.astro:45`, `blog/[slug].astro:93`.
- Nano-nicho existente: `src/pages/alquiler-furgonetas-por-horas-alicante.astro`.
- Barrio landings: no existen.
- `llms*.txt`: no existen en `public/`.

## Tasks

### PR 1 — Conversión y H2 (bajo riesgo)

- [x] T1: Reescribir H2 de `src/components/PricingTable.astro` con variantes `servicio + ciudad` (sin perder grupos AM/B/C/D).
- [x] T2: Ajustar naming de tarjetas en `src/components/VehicleCard.astro` cuando se use en contextos SEO, manteniendo el componente reutilizable.
- [x] T3: Sustituir todos los enlaces `#contacto` detectados por enlace directo de WhatsApp con mensaje preconfigurado o página de contacto/reserva.
- [x] T4: Ejecutar `npm run build` y smoke local; documentar resultado.
- Evidence: commit `ca69a33` on branch `feat/pr1-conversion-h2-whatsapp` (`npm run build` OK, 15 páginas).
- Acceptance: sin enlaces `#contacto` en CTA comerciales; H2 incluyen ciudad; build en verde.

### PR 2 — Archivos para rastreadores de IA

- [x] T5: Crear `/public/llms.txt` con resumen técnico: flota, precios base vigentes, zonas de cobertura, condiciones básicas y contacto.
- [x] T6: Crear `/public/llms-full.txt` ampliado con preguntas frecuentes, flota detallada, políticas y URLs principales.
- [x] T7: Verificar que los archivos se sirven en raíz y no rompen headers/robots.
- Evidence: commit `068f16e` on branch `feat/pr2-llms-txt` (`npm run build` OK; `/llms.txt` y `/llms-full.txt` presentes en dist).
- Acceptance: archivos accesibles en preview/producción; no datos inconsistentes con la web.

### PR 3 — Transparencia total (depende de T1 precios)

- [ ] T8: Recibir y registrar tabla de precios reales (pendiente del usuario).
- [ ] T9: Crear sección “Transparencia Total” en página principal o página dedicada, con tarifas, km incluidos, seguro/franquicia, requisitos, cancelación.
- [ ] T10: Sincronizar precios en `PricingTable`, cards del home y landings.
- Acceptance: una única fuente de verdad para precios o sincronización explícita documentada.

### PR 4 — Landing barrio San Vicente (estudiantes)

- [x] T11: Crear `src/pages/alquiler-furgonetas-san-vicente.astro` con contexto real: universidad, residencias, zonas de carga/descarga, accesos, aparcamiento.
- [x] T12: Incluir recomendación de vehículo por uso (mudanza de habitación/residencia).
- [x] T13: Añadir FAQ localizada única (aparcamiento/carga, tiempo al punto de recogida, furgoneta para pisos sin ascensor).
- [x] T14: Canonical apuntando a sí misma; meta title/description únicas.
- Evidence: commit `cd21bff` on branch `feat/pr4-san-vicente-landing` (`npm run build` OK; landing `/alquiler-furgonetas-san-vicente/` generada + sitemap).
- Acceptance: contenido específico y útil, sin boilerplate intercambiable con otros barrios.

### PR 5 — Nano-nichos

- [ ] T15: Crear `src/pages/furgonetas-mudanzas-alicante.astro` (mudanzas): grupos recomendados, consejos de carga, precios, CTA WhatsApp.
- [ ] T16: Crear `src/pages/furgonetas-reformas-construccion-alicante.astro` (obra/materiales): vehículos de carga, accesos a polígonos, requisitos.
- [ ] T17: Mejorar `src/pages/alquiler-furgonetas-por-horas-alicante.astro` reutilizando contenido y evitando duplicación.
- [ ] T18: Enlazar landings entre sí y desde home de forma no spammy.
- Acceptance: cada página aporta intención de búsqueda diferenciada; no thin content.

### PR 6 — Verificación final y limpieza

- [ ] T19: Build final y smoke test en preview.
- [ ] T20: Revisar consistencia de metadatos, canonicals y enlaces.
- [ ] T21: Borrar carpeta temporal `mejoras-web/` (incluye Zone.Identifier) para dejar el repo limpio.

## Delivery strategy

- Una PR por bloque funcional; ramas `feat/...` o `fix/...` desde `main` actualizado.
- Commits convencionales, sin atribución de IA.
- No merge a `main` sin check verde y preview revisada.

## Notes

- Precios pendientes de tabla real del usuario; no publicar cambios de precio hasta confirmarlos.
- `furgonetas-pasajeros-alicante` descartado deliberadamente.
- Solo un barrio (San Vicente) para evitar doorway.
- La carpeta `mejoras-web/` queda temporal y se borra al cerrar el plan o antes de la primera implementación.
