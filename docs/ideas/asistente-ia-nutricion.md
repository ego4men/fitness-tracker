# Idea: asistente de IA para la dieta (fase 6, sin implementar)

Fecha: 2026-10-07 · Estado: **investigación**. Se implementa al final, cuando el usuario lo pida.

## Qué haría
Un chat dentro de **Comida** para preguntas rápidas sobre tu propia dieta, respondidas con tus datos reales:
- "¿Cuánta proteína me falta hoy y qué podría cenar para completarla?"
- "¿Cómo voy esta semana con las calorías respecto a mi meta?"
- "Con lo que tengo en *Mis alimentos*, ¿qué desayuno de ~600 kcal y 40 g de proteína me armo?"
- "Los días que entreno Legs, ¿como más o menos?" (cruza el diario con el historial de entrenos)

## Cómo funcionaría (la pieza clave: *tool use*)
La app no envía toda tu base de datos. El modelo (Claude) recibe **herramientas** que la app ejecuta en tu iPhone y decide cuáles usar:

| Herramienta | Qué devuelve (leído de IndexedDB) |
|---|---|
| `obtener_perfil_y_metas` | Perfil, metas de kcal/macros/agua, peso más reciente |
| `obtener_diario(desde, hasta)` | Registros y totales por día y comida |
| `buscar_alimentos(texto)` | Alimentos guardados y básicos, con sus macros |
| `obtener_entrenos(desde, hasta)` | Sesiones, volumen y rutina de cada día |
| *(más adelante)* `proponer_registro(...)` | Propone añadir comida al diario. **Siempre** con confirmación tuya en pantalla. |

Primera versión: **solo lectura**. La IA nunca cambia tus metas ni tu diario por su cuenta.

## Opciones de arquitectura (la app no tiene servidor)

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| **A. Tu propia API key en el iPhone** | Creas una cuenta en console.anthropic.com, cargas saldo y pegas la clave en Ajustes. El SDK oficial (`@anthropic-ai/sdk`) llama a la API directamente desde la app (opción `dangerouslyAllowBrowser: true`). | Gratis de montar, sin servidor, pocas horas de trabajo | La clave vive en tu teléfono (solo tú usas la app). Mitigación: límite de gasto mensual en la consola y la clave excluida del respaldo JSON |
| **B. Mini-proxy gratuito** (Cloudflare Worker) | La clave vive en el Worker; la app le habla con un token propio | La clave nunca está en el dispositivo; se puede limitar el uso | Una pieza más que mantener; el plan gratuito de Cloudflare sobra para uso personal |
| C. Modelo local en el iPhone (WebLLM/WebGPU) | Descargar un modelo pequeño al teléfono | Gratis y 100 % privado | Descargas de 1–4 GB, lento, calidad pobre para razonar sobre nutrición. **No recomendado** |
| D. Sin IA en la app | Botón "Copiar resumen" para pegarlo en la app de Claude | Cero costo y cero código | No es integrado ni lee tus datos por sí sola |

**Recomendación:** empezar con **A** (lo más simple para una app personal) y pasar a **B** si algún día la usa más gente.

## Modelo y costo estimado
Precios de la API de Anthropic al 2026-10-06, por millón de tokens:

| Modelo | Entrada | Salida | Costo aprox. por pregunta* | 100 preguntas al mes |
|---|---|---|---|---|
| Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 | $0.50 | ~$0.001 | ~$0.10 |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2 | $10 | ~$0.015–0.02 | ~$1.5–2 |
| Claude Opus 5.5 (`claude-opus-5-5`) | $4 | $20 | ~$0.03–0.04 | ~$3–4 |

\*Supuesto: ~5 000 tokens de entrada (instrucciones, herramientas y datos consultados) y ~400–1 000 de salida, contando el razonamiento. Es una estimación: se mide con `usage` en las primeras pruebas.

- **Haiku 5.5** probablemente basta para preguntas de seguimiento ("¿cuánto me falta?"). **Sonnet/Opus 5.5** razonan mejor para planificar comidas. Se puede dejar un selector en Ajustes.
- **Caché de prompts:** las instrucciones y las definiciones de herramientas son fijas, así que se cachean (lecturas a ~10 % del precio). Ojo: el caché exige un prefijo mínimo de tokens; con un prompt corto puede no activarse, y aun así el costo es bajo.

## Detalles a cuidar
- **Privacidad:** al preguntar, los datos que la IA consulte (diario, peso, metas) salen del iPhone hacia Anthropic. Se avisará en pantalla.
- **Salud:** la IA no da consejos médicos. Con metas muy bajas o señales de trastorno alimentario, debe recomendar a un profesional. Va en las instrucciones del sistema, igual que el aviso de OpenNutriTracker ("no es una app médica").
- **Sin conexión:** el chat requiere internet; el resto de la app sigue funcionando offline.
- **Errores:** límite de uso (429), clave inválida (401) o saldo agotado se muestran con mensajes claros; se usan las clases de error tipadas del SDK.
- **Respuestas en streaming**, para que el texto aparezca mientras se genera.
- **Referencia:** OpenNutriTracker ya ofrece IA experimental con la clave del usuario (bring your own key). Valida el enfoque A.

## Pendiente de decidir (cuando llegue la fase)
1. ¿Opción A (tu clave en el iPhone) o B (proxy)?
2. ¿Qué modelo usar por defecto?
3. ¿Solo lectura, o también que pueda proponer registros en el diario (con confirmación)?
