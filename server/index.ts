import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadEnvFile } from './env.ts'

loadEnvFile()

const port = Number(process.env.PORT ?? 8787)
const app = createApp()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`trail-sketch listening on ${info.port}`)
})
