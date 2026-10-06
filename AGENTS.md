# AGENTS.md — Convenciones de trabajo

Reglas obligatorias para cualquier persona o agente que modifique este repositorio.
El objetivo es simple: **que ningún error llegue a la web en producción**.

## Regla de oro

`main` es **producción**. Es la rama que se publica en https://alquilerdefurgonetasalicante.es.
**Nunca** se trabaja ni se hace `git push` directamente sobre `main`: está protegida por *branch protection*.

## Flujo obligatorio para cualquier cambio

1. **Crear una rama** descriptiva a partir de `main` actualizado:

   | Prefijo | Cuándo |
   | --- | --- |
   | `feat/...` | Funcionalidad nueva |
   | `fix/...` | Corrección de errores |
   | `chore/...` | Mantenimiento, configuración, dependencias |
   | `docs/...` | Documentación |

   ```bash
   git checkout main && git pull
   git checkout -b feat/mi-cambio
   ```

2. **Hacer los cambios y probar en local**:

   ```bash
   npm run dev      # navegar y revisar el resultado
   npm run build    # verificar que compila sin errores
   ```

3. **Subir la rama y abrir un Pull Request (PR)** hacia `main`:

   ```bash
   git push -u origin feat/mi-cambio
   gh pr create --fill
   ```

   El PR dispara automáticamente dos cosas: un **check de build** y una **URL de vista previa**
   (que se comenta sola en el PR).

4. **Revisar la vista previa.** Es una versión de prueba: **no afecta a la web en producción**.

5. **Mergear el PR** solo cuando el check esté en verde y la preview se vea bien.
   El merge a `main` dispara el **deploy a producción** y el smoke test automático.

## Convención de commits

Usar [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
No añadir atribución de IA ni `Co-Authored-By`.

## Despliegue

| Flujo | Workflow | Qué hace |
| --- | --- | --- |
| Producción (merge a `main`) | `.github/workflows/deploy.yml` | `npm run build` + `wrangler deploy` + smoke test |
| Preview de PR | `.github/workflows/preview.yml` | `wrangler versions upload` → Version URL (no toca producción) |

## Notas para agentes de IA

- Trabajar **siempre** en una rama; nunca commitear ni pushear directo a `main`.
- Antes de proponer un merge: verificar el check de build en verde y que la preview se vea bien.
- No hacer merge a `main` sin confirmación explícita del dueño.
