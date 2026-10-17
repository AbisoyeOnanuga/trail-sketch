import { createRequire } from 'node:module'
import type { Integration } from '@sentry/core'
import * as Sentry from '@sentry/node'

const require = createRequire(import.meta.url)

let enabled = false

const quiet = new Set([
  'missing_gemma_key',
  'missing_elevenlabs_key',
  'missing_google_client',
  'rate_limited',
  'invalid_request',
  'query_too_short',
  'invalid_coordinates',
  'invalid_radius',
  'empty_script',
  'payload_too_large',
  'invalid_google_token',
  'voice_rejected',
])

function usableDsn(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.username.length > 8 && url.pathname.length > 1
  } catch {
    return false
  }
}

function redact(value: string): string {
  return value
    .replace(/(latitude|longitude|lat|lon)=[^&\s]+/gi, '$1=redacted')
    .replace(/-?\d{1,3}\.\d{4,}/g, 'redacted')
}

export function sentryEnabled(): boolean {
  return enabled
}

export function initSentry(): void {
  if (enabled) return
  const dsn = process.env.SENTRY_DSN?.trim() ?? ''
  if (!dsn) return
  if (!usableDsn(dsn)) {
    console.warn('sentry skipped: SENTRY_DSN is not a usable https DSN')
    return
  }
  const integrations: Integration[] = []
  try {
    const profiling = require('@sentry/profiling-node') as { nodeProfilingIntegration: () => Integration }
    integrations.push(profiling.nodeProfilingIntegration())
  } catch {
    console.warn('sentry profiling skipped')
  }
  const traceRate = process.env.NODE_ENV === 'production' ? 0.1 : 1
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    integrations,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    tracesSampler(context) {
      const name = `${context.name ?? ''} ${context.attributes?.['http.target'] ?? ''}`
      if (name.includes('/api/health')) return 0
      return traceRate
    },
    profileLifecycle: 'trace',
    profileSessionSampleRate: traceRate,
    traceLifecycle: 'static',
    beforeSend(event) {
      const request = event.request
      if (request) {
        if (request.url) request.url = redact(request.url)
        if (typeof request.query_string === 'string') request.query_string = redact(request.query_string)
        delete request.data
        delete request.cookies
        delete request.headers
      }
      for (const crumb of event.breadcrumbs ?? []) {
        if (crumb.message) crumb.message = redact(crumb.message)
        if (!crumb.data) continue
        for (const key of Object.keys(crumb.data)) {
          const value = crumb.data[key]
          if (typeof value === 'string') crumb.data[key] = redact(value)
        }
      }
      return event
    },
    beforeSendTransaction(event) {
      const request = event.request
      if (request?.url) request.url = redact(request.url)
      if (typeof request?.query_string === 'string') request.query_string = redact(request.query_string)
      return event
    },
  })
  enabled = true
}

export function reportServerError(route: string, error: unknown): void {
  if (!enabled) return
  const code = error instanceof Error ? error.message : 'request_failed'
  if (quiet.has(code)) return
  const exception = error instanceof Error ? error : new Error(code)
  Sentry.captureException(exception, { tags: { route, code } })
}
