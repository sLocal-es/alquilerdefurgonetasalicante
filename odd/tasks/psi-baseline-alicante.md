# Retoque PSI Alicante — baseline 2026-11-17 (sesión por dominio)

Objetivo: resolver los tres hallazgos transversales del baseline PSI móvil de alicante
(contraste, errores de consola, entrega de imágenes en home) y completar el baseline
restante (10 páginas). Baseline completo del fleet: `sLocal/docs/auditoria-psi-fleet-2026-11-17.md`.
Estado del repo: **12 commits detrás de `origin/main` → `git pull` antes de tocar nada**.
Rama: `fix/psi-alicante` (desde `main` actualizado). Entrega: PR por bloque; merge solo del
dueño. Runner: `npm test`, `npm run test:unit` (sin `lint`/`astro check` — opcional instalar
`@astrojs/check`). Registro: ficha `[ALC]` en Notion al abrir PR. Doc untracked a propósito:
se commitea con el primer PR de la sesión.

## Specs

- **S1 (contraste — issue #49).** Lighthouse: *"Background and foreground colors do not have a sufficient contrast ratio"* en **4/4 páginas medidas** (home, pequeña, mediana, grande) → a11y **96** transversal. Referencia: sevilla 100 en 15/15 con el mismo motor — es estilo local de alicante. Criterio de cierre: a11y ≥ 98 en PSI móvil sin perder identidad visual.
- **S2 (errores de consola — issue #50).** *"Browser errors were logged to the console"* en **4/4 páginas medidas** → BP **96** transversal. Identificar el error real (DevTools/`npm run dev`), documento su origen, y cerrar con consola limpia → BP 100.
- **S3 (entrega de imágenes en home — issue #51).** Speed Index **6,7s** vs sevilla **3,9s** (mismo motor); insight *"Improve image delivery"*; LCP 0,9s (bien) — el problema es peso/entrega progresiva. Superficie: imágenes del hero/home + `docs/imagenes-furgonetas.md`. Criterio de cierre: SI ≤ 4s y Performance ≥ 97.
- **S4 (baseline restante).** Completar PSI móvil de las 10 páginas pendientes (lista en el doc del fleet; cuota: **20 frescas/día UTC**, reset 00:00 UTC = 01:00 CET; rondas de 2 + `sleep 50`). Auditar SIEMPRE la URL exacta del sitemap (una errata = 404 contaminado). Al auditar `/blog/`: revisar *heading order* (sevilla lo marca en su blog index — posible tema de template).
- **S5 (límites).** NO tocar el worker (byte-igual al motor) ni la CI. Superficie: estilos/scripts del dominio, imágenes, hero. Sin cambios de URL ni metadatos salvo que un fix los pida (entonces: metadatos antes de URLs, gate GSC del manual de canibalización).

## Tasks

- [x] T1 (S1) — Fix de contraste (estilos del dominio) — inline — cierro con PSI móvil ≥ 98.
  *Ruta: inline. Evidencia: audit CDP propio (algoritmo WCAG como axe) 86 fallos en home / 23 en mediana → 0 en las 8 páginas auditadas tras el fix; test `src/layouts/layout-psi.test.ts` 10/10; `npm test` 66/66.*
- [x] T2 (S2) — Identificar y eliminar el/los errores de consola — inline — cierro con consola limpia y BP 100.
  *Ruta: inline. Fix: beacon de Cloudflare Web Analytics eliminado de `Layout.astro` (token auto_install rechazado por el endpoint RUM → CORS 404 en todas las páginas). Verificación local CDP: 0 eventos de consola en home y blog. PSI post-merge.*
- [x] T3 (S3) — Optimización de entrega de imágenes en home — inline — cierro con SI ≤ 4s.
  *Ruta: inline. Diagnóstico: las imágenes NO eran el problema (4 webp = 58KB, visibles a ~1,3s); el driver del SI 6,7s era el font-swap — repintado del 99% del viewport cuando las fuentes aplican (requests empezaban a 1150ms, tras CSSOM+layout). Fix: preload de las 2 fuentes latinas (DM Sans latin variable + Plus Jakarta latin) → requests a 191ms. PSI post-merge para cerrar el criterio SI ≤ 4s.*
- [x] T4 (S4) — Completar baseline PSI (10 páginas pendientes) + actualizar `sLocal/docs/auditoria-psi-fleet-2026-11-17.md` — *ya hecho en la sesión del 18-11: ALC 14/14 completo (doc del fleet actualizado).*
- [ ] T5 — Verificación final: `npm test`, `npm run test:unit`, PSI re-corrida de las páginas tocadas, PR(s) con check verde.

Fuera de alcance: issues #42 (capacidades de flota), #43 (9 plazas), #44 (Seat Arona) — cola del dueño.

## Log

- **L1** (2026-11-17, petición del dueño, verbatim): "okay, guarda este resultado en la carpeta /dominios para arrancar una sesion desde alicante y empezar a retocar o al menos crear los issues necesarios" → este doc + issues #49/#50/#51 creados con la evidencia.
- **L2** (2026-11-17) — Evidencia del baseline (PSI móvil, Lighthouse 13.6.0, Searchata): home **94/96/96/100** (SI 6,7s, contraste, errores consola); pequeña **98/96/96/100**; mediana **99/96/96/100** (LCP 2,0s, forced reflow, TTI); grande **100/96/96/100**. Patrón transversal: a11y 96 (contraste) + BP 96 (errores consola) en 4/4. Home de alicante sin URLs de fuentes externas ni woff2 en el HTML (verificar tipografía usada). CrUX/field: sin datos aún (tráfico real insuficiente).
- **L3** (2026-11-17) — Pendiente de apertura: sesión nueva en este repo → `git pull` (12 detrás de origin/main) → leer este doc hasta `## Log` + el doc del fleet → arrancar T1.
- **L4** (2026-11-18, sesión de fixes) — Diagnóstico T1 con audit CDP propio (contraste WCAG como axe, headless chromium): 86 nodos fallando en home, 23 en mediana. Causa: 3 patrones — muted `hsl(240,8%,56%)` ≈3,1-3,6:1; naranja `hsl(18,82%,54%)` como texto (3,3:1) y como fondo de botón con texto blanco (3,3:1); `price-amount` grande 2,87:1. Fix quirúrgico: token nuevo `--color-primary-strong: hsl(18,84%,40%)` para texto/botón sobre claro (+`-strong-hover: 32%`), muted → 42%, destructive → hsl(0,80%,42%). `--color-primary` brillante se conserva para heroes oscuros (eyebrow 4,97:1) e iconos/bordes. Overrides añadidos: `.hero .eyebrow` (home, por-horas), `.mobile-nav a.btn-primary` texto blanco, `.step-number` bg strong (por-horas), `.blog-hero .eyebrow` ya existía (se revirtió mi sed equivocado). Atrapados 2 regresiones propias durante verificación (btn outline del menú móvil blanco-sobre-blanco; eyebrow de blog sobre oscuro). PSI quota agotada hoy: verificación PSI post-merge.
- **L5** (2026-11-18) — Diagnóstico T2 (consola): captura CDP de producción — alicante 2 errores (CORS bloqueado + ERR_FAILED en `cloudflareinsights.com/cdn-cgi/rum`, el beacon de Cloudflare Web Analytics); sevilla y getafe 0 errores y 0 beacons en HTML. El token del beacon manual coincide con el sitio RUM de la zona (auto_install, lite), pero el endpoint responde 404 sin ACAO → el beacon pinchado a mano no funciona. RUM no mide en ningún dominio del fleet ("RUM sin activar" en el doc del fleet). Fichas Notion creadas: contraste, consola, imágenes (En curso, Origen OpenCode).
- **L6** (2026-11-18) — Diagnóstico T3 con timeline de screenshots CDP (throttle 4G + CPU 4x): repintado del 99% del viewport en el font-swap (frames 1,99s fallback → 2,45s fuentes propias en producción). El hero de alicante NO lleva imagen (sevilla sí: `extragrande-hero.webp`) y las 4 webp de las cards pesan 58KB en total — la superficie real del SI es la entrega de fuentes, no imágenes. Evidencia de request-timing: producción arranca las fuentes a 1150-1160ms; con preload a 191ms. Los subsets latin-ext/vietnamita/cirílico no se precargan (unicode-range). Pendiente post-merge: PSI móvil (cuota agotada el 18-11) para cerrar S1/S2/S3 y actualizar el doc del fleet.
