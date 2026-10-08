# ADR 0001: PWA en vez de app nativa o Expo

- Estado: aceptada
- Fecha: 2026-10-07

## Contexto
La app debe usarse a diario en un iPhone 15 Pro Max. El desarrollo es en Windows (sin Mac) y el usuario no pagará la cuenta de Apple Developer (99 USD/año).

## Opciones consideradas
1. **Swift nativo:** requiere Xcode, que solo existe en Mac. Descartado.
2. **Expo Go con servidor local:** la PC tiene que estar encendida y en la misma WiFi. Descartado.
3. **Expo Go con EAS Update:** Expo Go solo soporta el SDK más reciente, así que la app deja de abrir cada vez que Expo Go se actualiza. Frágil.
4. **Sideload con Apple ID gratis (AltStore/SideStore):** hay que volver a firmar cada 7 días y generar el .ipa sin Mac es complejo. Descartado.
5. **PWA instalada desde Safari:** gratis, funciona offline, se actualiza sola con cada push y no depende de la PC.

## Decisión
PWA con Vite, React y TypeScript, alojada en GitHub Pages. Los datos se guardan localmente en IndexedDB (Dexie), con respaldo JSON manual a iCloud Drive, Google Drive u OneDrive.

## Consecuencias
- Sin HealthKit, widgets ni Live Activities.
- iOS podría desalojar los datos tras semanas sin uso. Se mitiga con `navigator.storage.persist()` y con respaldos; un respaldo automático a Google Drive queda planificado para la fase 5.
- El escáner de códigos de barras usa la cámara vía web (BarcodeDetector o zxing-wasm).
- Si en el futuro se paga la cuenta de Apple, el mismo código se empaqueta con Capacitor para obtener una app nativa.
