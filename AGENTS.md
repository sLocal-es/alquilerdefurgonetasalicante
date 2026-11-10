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

   El PR dispara automáticamente el **check de la suite** (`npm test`: build + tests),
   que no usa ningún secret del repo: el código que ejecuta un PR no puede tocar
   credenciales (contrato de CI del engine, sLocal-toolbox @121a573).

4. **Revisar el check del PR y la vista previa local.** La vista visual se hace en
   local (`npm run dev`); el check del PR garantiza build + tests en verde.
   **No afecta a la web en producción.**

5. **Mergear el PR** solo cuando el check esté en verde.
   El merge a `main` dispara el **deploy a producción** (suite → credenciales → build → deploy → smoke).

## Convención de commits

Usar [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
No añadir atribución de IA ni `Co-Authored-By`.

## Despliegue

| Flujo | Workflow | Qué hace |
| --- | --- | --- |
| Producción (merge a `main`) | `.github/workflows/deploy.yml` | suite (`npm test`) → `wrangler whoami` → build → `wrangler deploy` → smoke test |
| Check de PR | `.github/workflows/preview.yml` | suite (`npm test`) sin ningún secret — no toca producción |

## Notas para agentes de IA

- Trabajar **siempre** en una rama; nunca commitear ni pushear directo a `main`.
- Antes de proponer un merge: verificar el check del PR en verde y la vista previa en local (`npm run dev`).
- No hacer merge a `main` sin confirmación explícita del dueño.

## Registro en Notion (obligatorio)

Todo cambio en este repo queda registrado en Notion, en **sLocal — Centro de operaciones → Registro de cambios**.
Es lo que ven el dueño y su socio: si no está en Notion, no existe. Vale igual para personas, Claude y OpenCode.

| Dato | Valor |
| --- | --- |
| Dominio | Alicante (`alquilerdefurgonetasalicante.es`) |
| Prefijo de las fichas | `[ALC]` |
| Ficha del dominio en Notion | https://app.notion.com/p/4122e8335cb881a1ac74e8501199fe9e |
| Registro de cambios (data source) | `collection://5dc5b95e-940b-47f5-b633-13c4707c2fe1` |
| Stack | Astro · OpenCode — nunca mezclar con webs de Lovable |

### Flujo

1. **Antes de tocar código**, buscar la ficha del cambio en el Registro (título empieza por `[ALC]`).
   Si no existe, crearla con:
   - **Cambio**: `[ALC] Qué se hace`, en una frase.
   - **Ciudad**: relación con la ficha del dominio de arriba.
   - **Tipo**, **Prioridad** y **Estado** = `En curso`.
   - **Origen** = `Claude` u `OpenCode` (quien hace el cambio).
2. **Un cambio = una ficha = un PR.** Si salen varios cambios distintos, varias fichas.
3. **En la descripción del PR**, enlazar la ficha de Notion y añadir `Closes #N` si cierra un issue.
4. **Al abrir el PR**, rellenar en la ficha **Rama / enlace** (URL del PR) y **URLs afectadas**.
5. **Tras el merge y el deploy**: **Estado** = `Publicado` y **Fecha publicación**.
   Solo pasa a `Verificado` cuando se comprueba en Search Console; anotar lo observado en **Resultado**.
6. **Auditorías y brainstorming**: cada acción que se decida hacer se crea como ficha `Pendiente`.
   Lo descartado no se registra.

Si el agente no tiene Notion conectado, termina su respuesta con un bloque **Registro Notion**
con estos campos rellenos, para que el dueño lo copie.
