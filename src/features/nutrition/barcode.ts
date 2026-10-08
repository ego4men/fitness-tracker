// Detector de códigos de barras: nativo si el navegador lo trae; si no
// (Safari en iPhone), el polyfill con ZXing en WebAssembly. El .wasm se sirve
// desde la propia app (y queda precacheado) para funcionar sin internet.

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const

export interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}

let detector: Promise<Detector> | null = null

export function getDetector(): Promise<Detector> {
  detector ??= (async () => {
    const Native = (globalThis as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } })
      .BarcodeDetector
    if (Native) {
      const supported = await Native.getSupportedFormats().catch(() => [] as string[])
      if (supported.includes('ean_13')) return new Native({ formats: FORMATS })
    }
    const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
      import('barcode-detector/ponyfill'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ])
    prepareZXingModule({
      overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
    })
    return new BarcodeDetector({ formats: [...FORMATS] }) as Detector
  })()
  return detector
}
