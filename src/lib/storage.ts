// iOS puede desalojar datos de sitios web poco usados. Pedir almacenamiento
// persistente reduce el riesgo; el respaldo JSON es la red de seguridad real.

export async function isPersisted(): Promise<boolean> {
  return (await navigator.storage?.persisted?.()) ?? false
}

/** Llamar desde un gesto del usuario (Safari lo exige). */
export async function requestPersist(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false
}

export async function estimateUsageMB(): Promise<number | null> {
  const est = await navigator.storage?.estimate?.()
  return est?.usage != null ? est.usage / 1024 / 1024 : null
}
