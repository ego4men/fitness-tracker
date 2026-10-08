# Fitness Tracker: investigación y plan (v2)

Fecha: 2026-10-07 · Dispositivo objetivo: iPhone 15 Pro Max · Equipo de desarrollo: Windows, sin Mac ni cuenta de Apple Developer.

## 1. Qué tomamos de cada repositorio

Tomamos ideas, flujos y fórmulas. El código copyleft (AGPL/GPL) no se copia.

### Entrenamiento

| Repo | Licencia | Qué tomamos |
|---|---|---|
| workout-cool | MIT | Ejercicios con atributos flexibles (tipo, músculo primario) para filtrar. Nombres e instrucciones bilingües (ES/EN). Arquitectura por "features" (Feature-Sliced Design). Al ser MIT, también se pueden reutilizar fragmentos de código. |
| wger | AGPL (código), Creative Commons (datos) | Jerarquía Rutina → Día → Ejercicio → Series. "Gym Mode" (pantalla guiada durante el entreno). Peso corporal y medidas personalizadas. Galería de fotos de progreso. Reglas de progresión de peso por rutina. |
| Liftosaur | AGPL | Es una PWA, prueba de que este enfoque funciona en iPhone. Programas predefinidos (5/3/1, GZCLP, Starting Strength, 5x5). Progresión y descarga automáticas: si cumples las repeticiones, sube el peso; si fallas N veces, baja un 10 %. Pistas con "la última vez hiciste…". Calculadora de discos y redondeo al equipo disponible. Series de calentamiento en %. Temporizador de descanso por ejercicio. Mapa muscular y sustitución de ejercicios. Gráficas de cada levantamiento cruzadas con el peso corporal. App ligera (~200 KB). |
| free-exercise-db (yuhonas) | Unlicense (dominio público) | **Base de datos inicial de ejercicios**: más de 800 ejercicios en JSON con músculos, equipo, nivel, instrucciones e imágenes. Uso libre. |

### Comida y hábitos

| Repo | Licencia | Qué tomamos |
|---|---|---|
| OpenNutriTracker | GPL v3 | Diario por comidas (desayuno, almuerzo, cena, snacks), con reparto de calorías por comida. "Quick add" (solo kcal y macros). Código de barras. Recetas propias. Agua con incrementos rápidos y deshacer. Ayuno intermitente opcional. Rachas de días registrados. Tendencias a 7, 30 y 90 días. Estimación de semanas hasta tu peso meta. Exportación a JSON/CSV. Datos solo en el dispositivo, sin cuenta. Metodología: metas IOM 2005, IMC según la OMS, macros según la OMS (TRS 916) y gasto por actividad con METs (Compendium 2024). |
| Open Food Facts | ODbL (datos) | Búsqueda y código de barras de productos envasados. Gratis y sin clave. |
| USDA FoodData Central | CC0 | Alimentos genéricos (pollo, arroz, huevo…). API gratuita con clave. |

### Nuestro diferenciador

Una sola app que une **entreno + nutrición + hábitos**, con un "Hoy" unificado: entreno del día, calorías y macros, agua, peso y racha.

## 2. Cómo llevar la app al iPhone sin pagar a Apple

| Opción | ¿Necesita PC encendida? | Problemas |
|---|---|---|
| Expo Go + servidor local | **Sí.** Expo Go carga la app desde tu PC por WiFi. | No sirve para el uso diario. |
| Expo Go + EAS Update | No | Exige iniciar sesión y Expo Go solo soporta **la última versión del SDK**. Cuando Expo Go se actualiza (unas tres veces al año), tu app deja de abrir hasta que la migres. Es frágil. |
| Sideload (AltStore/SideStore) con Apple ID gratis | — | La firma caduca cada 7 días, tiene un límite de 3 apps y generar el .ipa sin Mac es complicado. |
| **PWA instalada desde Safari** ✅ | **No** | Sin HealthKit ni widgets nativos. Las notificaciones push funcionan desde iOS 16.4 en apps instaladas. |

**Recomendación: PWA.** Es la vía que usa Liftosaur.
- Se aloja gratis en GitHub Pages o Cloudflare Pages.
- En Safari tocas "Compartir → Agregar a pantalla de inicio". Aparece un ícono propio y la app se abre a pantalla completa, sin barra de Safari.
- Funciona **offline**: el service worker guarda la app en el iPhone.
- Las actualizaciones llegan solas cuando hacemos push a GitHub, sin reinstalar nada.
- **Plan de escape:** si algún día pagas la cuenta de Apple, el mismo código se empaqueta con Capacitor como app nativa (con HealthKit y widgets) sin reescribirla.

## 3. Dónde viven los datos (y el papel de Google Drive y OneDrive)

1. **Base de datos principal: el propio iPhone** (IndexedDB con Dexie). Es instantánea, funciona offline, es privada y no cuesta nada.
2. **Riesgo:** iOS puede borrar datos de webs no usadas en 7 días. Las apps instaladas en la pantalla de inicio tienen su propio contador, y usarlas lo reinicia, así que con uso semanal no hay problema. Aun así, no confiamos solo en eso.
3. **Respaldo** (aquí entran Drive y OneDrive como almacenamiento de copias, no como base de datos en vivo):
   - **Nivel 1 (fase 1):** botón "Exportar respaldo" que genera un archivo .json y lo comparte por la hoja de iOS, para guardarlo en iCloud Drive, Google Drive u OneDrive. "Importar" lo restaura. Sin cuentas ni configuración.
   - **Nivel 2 (opcional):** respaldo automático en la carpeta oculta de la app en Google Drive (appDataFolder), iniciando sesión con Google una vez. Gratis.
   - **Nivel 3 (solo si quieres usarla en varios dispositivos o desde la PC):** Supabase gratis como base de datos en la nube. Su plan gratuito pausa los proyectos inactivos, así que no es prioridad.

## 4. Stack

- Vite + React + TypeScript, PWA con vite-plugin-pwa (Workbox).
- Dexie (IndexedDB) para los datos locales y Zustand para el estado.
- Tailwind CSS con diseño mobile-first y medidas seguras para la Dynamic Island del iPhone 15 Pro Max.
- Escáner: BarcodeDetector nativo si existe; si no, zxing-wasm precacheado.
- Gráficas: uPlot (la que usa Liftosaur, ligera).
- Vitest para pruebas y `npm run deploy` para publicar en GitHub Pages (rama `gh-pages`).

## 5. Fases

| Fase | Entregable usable en el iPhone |
|---|---|
| 0 ✅ | Esqueleto PWA desplegado y "Agregar a inicio" funcionando, con exportar/importar respaldo. |
| 1 ✅ | Entreno: catálogo (free-exercise-db), rutinas, sesión en vivo (series, repeticiones, peso, RPE), temporizador de descanso, "la última vez…" e historial. |
| 2 ✅ | Nutrición: diario por comidas, búsqueda en Open Food Facts y USDA, código de barras, quick add, recetas, agua, metas (IOM/OMS). |
| 3 ✅ | Progreso: récords personales, 1RM estimado, gráficas, peso y medidas, fotos, rachas y pantalla "Hoy" unificada. |
| 4 ✅ | Programas con progresión automática (5x5, GZCLP, 5/3/1), calculadora de discos, calentamientos, ayuno y notificaciones. |
| 5 | Respaldo automático en Google Drive y, opcionalmente, sincronización en la nube. |
| 6 | Asistente de IA para la dieta (chat con acceso de solo lectura a tus datos). Investigación en `docs/ideas/asistente-ia-nutricion.md`. |
