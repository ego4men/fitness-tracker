# Fitness Tracker

PWA personal de entrenamiento + nutrición + hábitos, instalada en un iPhone 15 Pro Max desde Safari ("Agregar a pantalla de inicio"). Se desarrolla en Windows, sin Mac ni cuenta de Apple Developer. Plan completo: `docs/01-investigacion-y-plan.md`. Decisiones: `docs/adr/`.

## Stack
- Vite 8 + React 19 + TypeScript 7, Tailwind CSS 4 (tokens en `src/index.css` → `@theme`).
- vite-plugin-pwa (generateSW, `registerType: 'prompt'`); íconos generados desde `public/logo.svg` (`pwa-assets.config.ts`).
- Dexie (IndexedDB) es la base de datos: `src/db/db.ts`. Cambiar el esquema = nueva `this.version(n)` con migración; nunca editar la versión 1.
- HashRouter (GitHub Pages no reescribe rutas).

## Comandos
- `npm run dev` (con `--host`, accesible desde el iPhone en la misma WiFi) · `npm test` · `npm run build` · `npm run typecheck`
- En Windows, Node está en `C:\Program Files\nodejs`; si `node` no se encuentra, añádelo al PATH de la shell.

## Entreno (fase 1)
- Catálogo: `scripts/data/free-exercise-db.json` (fuente fijada) + `scripts/data/nombres-es.txt` (una traducción por línea, mismo orden) → `node scripts/build-exercises.mjs` → `public/data/exercises.json`. Si cambia, sube `CATALOG_VERSION` en `src/features/exercises/catalog.ts`. Los datos guardan músculos y equipo con sus claves en inglés; se traducen al mostrarse (`exercises/labels.ts`). Las instrucciones siguen en inglés.
- Imágenes de ejercicios: raw.githubusercontent.com con caché CacheFirst del service worker (quedan offline una vez vistas).
- Sesión activa: `settings.activeSessionId`. Al terminar se guardan solo las series marcadas (`done`). "Última vez" = series hechas del último entreno con ese ejercicio.
- Unidades: kg. El usuario entrena Push/Pull/Legs; las rutinas tienen `order` y la app sugiere la siguiente de la rotación.

## Nutrición (fase 2)
- Perfil y metas en `settings` (`profile`, `nutritionGoals`). BMR Mifflin-St Jeor × actividad; proteína g/kg según objetivo; grasa 25 %; carbohidratos el resto (`nutrition/goals.ts`). `custom: true` = metas fijadas a mano: no se recalculan.
- Alimentos: básicos en español (`nutrition/basics.ts`, valores de USDA, offline) + Open Food Facts (`nutrition/off.ts`: `cgi/search.pl` porque la API nueva no permite CORS; límite de 10 búsquedas/min → solo se busca al enviar). Al usarse, el alimento se guarda en `foods` y queda offline.
- Las entradas del diario guardan una copia de los macros (snapshot); editar un alimento no cambia el pasado.
- Escáner: `BarcodeDetector` nativo o el ponyfill `barcode-detector` (ZXing wasm, servido localmente y precacheado). La cámara solo funciona en HTTPS o localhost.
- Diálogos: usar `confirmDialog()` (`components/dialog.tsx`), nunca `window.confirm` (en las PWA de iOS puede no mostrarse).
- Para probar cambios en el navegador, `vite build` + `vite preview` es más fiable que `vite dev` (el watcher de Windows a veces pierde ediciones). Desregistra el service worker si ves una versión vieja.

## Convenciones
- Código organizado por feature: `src/features/<feature>/`. UI compartida en `src/components/ui.tsx`.
- UI en español. Mobile-first, objetivos táctiles ≥ 44px, respetar safe areas (`.pt-safe` / `.pb-safe`), inputs ≥ 16px (evita zoom en iOS).
- Offline-first: ninguna función esencial puede depender de la red. APIs externas (Open Food Facts, USDA) solo para buscar, y lo encontrado se guarda localmente.
- Todo dato nuevo debe entrar en el respaldo: las tablas de Dexie se exportan automáticamente en `features/backup`.
- Licencias: wger, Liftosaur y OpenNutriTracker son AGPL/GPL → solo inspiración, nunca copiar código. workout-cool (MIT) y free-exercise-db (Unlicense) sí son reutilizables.

## Deploy
`npm run deploy` (`scripts/deploy.mjs`) ejecuta los tests y el typecheck, compila con `BASE_PATH=/<repo>/` y fuerza el push de `dist/` a la rama `gh-pages`. GitHub Pages sirve esa rama en https://ego4men.github.io/fitness-tracker/. El iPhone recibe la actualización y muestra "Hay una versión nueva". Haz commit y push de `main` antes de publicar.
(No se usa GitHub Actions porque el token de `gh` no tiene el scope `workflow`. Para activarlo: `gh auth refresh -s workflow`.)
