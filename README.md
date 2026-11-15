# 🚀 NASA Space Apps Challenge 2025
# Terraformers

> Leveraging open data, science, and technology to build solutions for challenges that impact our world.

---

## 📖 About the Project

**Project Name:** 

This repository contains the work developed by **Terraformers** as part of the **NASA Space Apps Challenge**.

Our project aims to address a real-world challenge through the analysis, interpretation, and application of open data provided by NASA and other scientific sources. The solution combines technology, innovation, and data-driven decision-making to generate a positive and measurable impact.

---

## 👥 Team

### Terraformers

| Member |
|----------|
| Poll Garro Vargas | 
| Angelo Castro Piedra | 
| Hector Leiva Gamboa | 
| Brandon Rivera Hidalgo | 
| Santiago Portuguez Henández |
| Kenni González Blandón |

---

# 📜 Project History

Every project begins with a question.

> 

During the NASA Space Apps Challenge, we identified the opportunity to leverage publicly available datasets to create a solution capable of generating meaningful insights, supporting decision-making, and increasing accessibility to scientific information.

Our development process has focused on combining technology, collaboration, and research to build a practical solution that can evolve beyond the scope of the competition.

This repository documents that journey, from the initial concept and validation process to implementation, testing, and future improvements.

---

# 💡 Project Idea

## Challenge

_[Challenge]_

## Proposed Solution

_[Describe the idea behind the project, how it works, and the value it provides.]_

---

# 🏗️ Development Status

## Overall Progress

| Phase | Status |
|---------|---------|
| Research & Discovery | ⚪ Pending |
| Problem Analysis | ⚪ Pending |
| Solution Design | ⚪ Pending |
| Development | ⚪ Pending |
| Testing | ⚪ Pending |
| Documentation | ⚪ Pending |
| Final Presentation | ⚪ Pending |

---

# 🌎 Impact Assessment

## 1. Influence

_[Describe the project's influence and expected impact.]_

## 2. Magnitude of the Problem

_[Explain the scale and importance of the problem.]_

## 3. Population Benefited

_[Describe who benefits from the solution and how.]_

## 4. Innovation

_[Describe the innovative aspects of the project.]_

## 5. Use facility

_[Describe the innovative aspects of the project.]_

---

# 📄 AI declaration

# 📄 Sources consulted

---

# 🛠️ Desarrollo (React + Vite)

```bash
npm install
cp .env.example .env   # llenar credenciales (opcional)
npm run dev            # http://localhost:5173/NASA-Space-APPs---Terraformers/
npm run build          # genera dist/
```

## Despliegue en GitHub Pages

1. En GitHub: **Settings > Pages > Source: GitHub Actions**.
2. Cada push a `main` ejecuta [.github/workflows/deploy.yml](.github/workflows/deploy.yml) y publica en
   `https://magiant.github.io/NASA-Space-APPs---Terraformers/`.
3. Si se renombra el repo, actualizar `base` en [vite.config.js](vite.config.js).

## Supabase y Algolia

| Archivo | Uso |
|---|---|
| `src/lib/supabase.js` | Cliente del navegador (anon key) + `getMissions()` / `addMission()` |
| `src/lib/algolia.js` | Cliente de búsqueda (search-only key) + `searchMissions()` |
| `supabase/schema.sql` | Tabla `missions` con RLS; correr en el SQL Editor de Supabase |
| `npm run supabase:seed` | Carga `data/missions.json` en Supabase (service role key) |
| `npm run algolia:seed` | Indexa `data/missions.json` en Algolia (admin key) |
| `npm run sync:supabase-algolia` | Copia la tabla de Supabase al índice de Algolia |

Las variables `VITE_*` se incrustan en el sitio público: solo claves públicas (anon key, search-only key).
`ALGOLIA_ADMIN_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son solo para los scripts locales y nunca deben llevar prefijo `VITE_`.
Para el despliegue, agregar las `VITE_*` en **Settings > Secrets and variables > Actions**.
