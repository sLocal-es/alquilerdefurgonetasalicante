# Alquiler Furgonetas Alicante

Sitio web profesional para el alquiler de furgonetas en Alicante. Optimizado para SEO y captación de leads.

## Stack Tecnológico

- **Framework:** [Astro](https://astro.build/) v7
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com/)
- **Lenguaje:** TypeScript
- **Estilos:** CSS con variables CSS

## Características

- Landing page optimizada para SEO
- Páginas individuales por tipo de furgoneta
- Tabla de precios por horas con diseño responsive
- Formulario de captación de leads
- Structured Data (Schema.org)
- Responsive design
- Deploy automático via GitHub

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## Estructura del Proyecto

```
/
├── public/              # Assets estáticos
├── src/
│   ├── components/      # Componentes Astro
│   ├── layouts/         # Layouts
│   └── pages/           # Páginas (rutas)
├── astro.config.mjs     # Configuración de Astro
└── package.json         # Dependencias
```

## Páginas

- `/` - Landing page principal
- `/alquiler-furgonetas-por-horas-alicante/` - Alquiler por horas
- `/furgoneta-pequeña-alicante/` - Furgoneta pequeña (3-4m³)
- `/furgoneta-mediana-alicante/` - Furgoneta mediana (6-7m³)
- `/furgoneta-grande-alicante/` - Furgoneta grande (8-10m³)
- `/furgoneta-extra-grande-alicante/` - Furgoneta extra grande (12-15m³)
- `/furgonetas-mudanzas-alicante/` - Furgonetas para mudanzas
- `/furgonetas-reformas-construccion-alicante/` - Furgonetas para reformas y construcción
- `/alquiler-furgonetas-san-vicente/` - Alquiler en San Vicente del Raspeig
- `/blog/` - Blog con guías y consejos

## Deploy

El deploy se realiza automáticamente a Cloudflare Pages al hacer push a la rama `main`.

## Licencia

© 2026 sLocal. Todos los derechos reservados.
