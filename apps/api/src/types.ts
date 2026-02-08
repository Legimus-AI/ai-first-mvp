// Type-only export for frontend consumption
// Re-export the full app type from app.ts
import { createApp } from './app'

// Create a typed instance for RPC client inference
const _app = createApp()
export type AppType = typeof _app
