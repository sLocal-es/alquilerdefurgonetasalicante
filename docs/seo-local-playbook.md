# SEO Local Playbook (Plantilla reutilizable)

Guía única y reutilizable para nuevos dominios locales (Alicante, Getafe, etc.).
Añadir solo lo que añada valor; evitar inflar el número de archivos.

## Principios

- Contenido único por intención de búsqueda; nada de repetir plantilla cambiando solo el nombre de zona (anti-doorway).
- Transparencia real: precios, condiciones, kilometraje, seguro, requisitos, cancelación.
- Datos NAP consistentes: teléfono, email, dirección/ciudad y schema (`AutoRental`/`LocalBusiness`) + `areaServed`.

## Checklist por página o landings

- Title y meta description con servicio + ciudad.
- H1 único y H2 por intención (`servicio + ciudad`).
- Contexto local verificable: accesos, zonas de carga/descarga, parkings, restricciones.
- Recomendación de vehículo según tipo de uso y zona.
- FAQ local con preguntas reales (aparcamiento, tiempos, tipo de furgoneta).
- Canonical apuntando a sí misma.
- CTAs comerciales directos (WhatsApp con mensaje preconfigurado o página de reserva), no solo `#contacto`.
- Enlaces internos relevantes entre landings y páginas de servicio, sin spam.
- **Precios reales visibles**: tablas de precios con tarifas, límites de kilometraje, fianza y extras. Nunca dejar precios como "consultar" o "desde X€" sin desglose.

## Archivos para crawlers de IA

Crear y mantener `/public/llms.txt` y `/public/llms-full.txt`:
- flota y precios base,
- zonas de cobertura,
- condiciones principales,
- URLs de páginas y legales,
- contacto y reserva.
Si se publica una página nueva, añadir su URL en el mismo PR.

## Anti-estafa / credibilidad

- No incluir reseñas o testimonios inventados.
- Pedir reseñas reales tras la entrega.
- Mantener consistencia con Google Business Profile (teléfono, nombre, web).

## Entrega

- Rama por bloque, commits convencionales, PR hacia `main`.
- Build (`npm run build`) y revisión de preview antes de merge.
- No merge a `main` sin check verde y confirmación del dueño.

## Reutilización entre dominios

- Clonar esta guía como base y adaptar solo el contexto local real.
- Mantener una única fuente de verdad para precios/condiciones cuando cambien.
