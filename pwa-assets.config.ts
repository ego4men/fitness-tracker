import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // iOS no respeta transparencias en el ícono de inicio: fondo sólido.
    apple: { sizes: [180], padding: 0.2, resizeOptions: { background: '#0b0f0e' } },
    maskable: { sizes: [512], padding: 0.2, resizeOptions: { background: '#0b0f0e' } },
  },
  images: ['public/logo.svg'],
})
