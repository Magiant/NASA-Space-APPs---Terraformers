---
name: revision-completa
description: Corre la revisión completa de la web de TerraFarm con el equipo de agentes (7 empleados por sección, 2 jefes que los supervisan, un especialista en responsive, un investigador de usabilidad y el agente supremo). Usar cuando se pida "revisión completa", "que revisen los agentes", "auditoría de usabilidad" o antes de publicar una versión grande. Acepta una parte para revisar solo esa (por ejemplo "precios" o "mi-finca").
---

# Revisión completa con el equipo de agentes

Los subagentes no pueden llamar a otros subagentes: **la sesión principal hace de coordinadora** y les pasa a cada
nivel los informes del nivel de abajo. Ningún agente cambia archivos; los arreglos se hacen después, con permiso.

```
                              supremo  (opus)
          ┌──────────────┬───────────┴──────────┬──────────────────┐
  jefe-informacion   jefe-finca   especialista-responsive   investigador-ux
  ├ empleado-sembrar   ├ empleado-mi-finca
  ├ empleado-precios   ├ empleado-dron
  ├ empleado-tiempo    └ empleado-cuenta
  └ empleado-cursos
```

Reglas comunes: `.claude/revision/reglas-interfaz.md`. Reglas propuestas: `.claude/revision/propuestas.md`.
Herramienta de capturas: `.claude/herramientas/capturar.mjs`.

## 0. Preparar

1. Confirmar con el usuario el alcance si dio una parte (por ejemplo, solo `precios` → solo `empleado-precios`,
   su jefe y el supremo). Sin parte: todo.
2. Levantar la web en **modo demo** en el puerto 5199, en segundo plano, si no responde ya
   (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5199/`):
   `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -w web -- --port 5199 --strictPort`
3. Probar la herramienta una vez: `node .claude/herramientas/capturar.mjs --rutas=precios --anchos=390`.

## 1. Empleados, especialista e investigador (en paralelo)

Lanzar en **un solo mensaje** (corren a la vez, en segundo plano) los 7 empleados, `especialista-responsive` e
`investigador-ux`. A cada uno: "Haz tu revisión según tus instrucciones. Fecha de hoy: AAAA-MM-DD." Esperar los
avisos de que terminaron; no inventar resultados mientras tanto.

## 2. Jefes (en paralelo)

- `jefe-informacion` recibe, pegados en su mensaje, los informes completos de empleado-sembrar, -precios, -tiempo
  y -cursos.
- `jefe-finca` recibe los de empleado-mi-finca, -dron y -cuenta.

## 3. Supremo

`supremo` recibe los informes de los dos jefes, del especialista-responsive y del investigador-ux.

## 4. Entregar

1. Guardar el informe del supremo en `.claude/revision/informes/AAAA-MM-DD.md` (y, si se quiere, los informes de
   cada agente en la misma carpeta con su nombre).
2. Mostrar al usuario el resumen, la tabla "Arreglar primero" y las reglas nuevas recomendadas.
3. Preguntar qué arreglar. Las reglas nuevas se pasan a `reglas-interfaz.md` solo si el usuario las aprueba.
4. Al arreglar, seguir las instrucciones del usuario (CLAUDE.md): comentario `// Correccion - Poll: …` en cada
   función corregida, nada de commits ni push sin que lo pida, un commit por cambio lógico y sin marca de agua.

## Costo

Son 12 agentes y cada uno empieza desde cero: una revisión completa gasta bastante más que una conversación normal.
Conviene correrla antes de publicar algo grande, o por partes (una sección y su jefe) cuando solo cambió esa parte.
