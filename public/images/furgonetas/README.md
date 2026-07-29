# Imágenes de Furgonetas

## Estructura esperada

```
furgonetas/
├── pequena-card.webp          # 400x250px — para VehicleCard
├── pequena-hero.webp          # 600x400px — para página detalle
├── mediana-card.webp          # 400x250px
├── mediana-hero.webp          # 600x400px
├── grande-card.webp           # 400x250px
├── grande-hero.webp           # 600x400px
├── extragrande-card.webp      # 400x250px
└── extragrande-hero.webp      # 600x400px
```

## Esíficaciones SEO

| Propiedad | Valor |
|-----------|-------|
| Formato | WebP (preferred) o JPEG |
| Tamaño card | < 50KB |
| Tamaño hero | < 100KB |
| Ratio card | 16:10 (400x250) |
| Ratio hero | 3:2 (600x400) |
| Nombre archivo | descriptivo, sin espacios, sin caracteres especiales |

## Optimización

Convertir a WebP:
```bash
cwebp -q 80 input.jpg -o output.webp
```

Verificar tamaño:
```bash
ls -lh public/images/furgonetas/
```
