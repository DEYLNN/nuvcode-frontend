export interface ImportField {
  key: string
  label: string
  required: boolean
  allowed?: string[]
  minLength?: number
  note?: string
}

export type SchemaKey = string // "${provider_id}:${key_type}"

const SCHEMAS: Record<SchemaKey, ImportField[] | string> = {
  // ── API Key providers (simple Bearer token) ──
  'ocf:apikey': [
    { key: 'provider_id', label: 'Provider ID', required: true },
    { key: 'key_type', label: 'Key Type', required: true, allowed: ['apikey'] },
    { key: 'key_value', label: 'API Key', required: true, minLength: 1 },
    { key: 'label', label: 'Label', required: false },
  ],
  'sfp:apikey': 'ocf:apikey',
  'mmx:apikey': 'ocf:apikey',
  'cl:apikey': 'ocf:apikey',
  'infx:apikey': 'ocf:apikey',
  'fsn:apikey': 'ocf:apikey',
  'bb:apikey': 'ocf:apikey',
  'orc:ocf': 'ocf:apikey',

  // ── Remaining API-key providers (simple Bearer token, same shape) ──
  'agr:apikey': 'ocf:apikey',
  'ags:apikey': 'ocf:apikey',
  'ant:apikey': 'ocf:apikey',
  'bai:apikey': 'ocf:apikey',
  'hcn:apikey': 'ocf:apikey',
  'inf:apikey': 'ocf:apikey',
  'kio:apikey': 'ocf:apikey',
  'nos:apikey': 'ocf:apikey',
  'nut:apikey': 'ocf:apikey',
  'sono:apikey': 'ocf:apikey',
  'sop:apikey': 'ocf:apikey',
  'three:apikey': 'ocf:apikey',
  'verb:apikey': 'ocf:apikey',
  'zb:apikey': 'ocf:apikey',

  // ── Manual providers (structured JSON key) ──
  'cf:apikey': [
    { key: 'provider_id', label: 'Provider ID', required: true },
    { key: 'key_type', label: 'Key Type', required: true, allowed: ['apikey'] },
    { key: 'apiKey', label: 'API Key', required: true, minLength: 1 },
    { key: 'accountId', label: 'Account ID', required: true, minLength: 1 },
    { key: 'label', label: 'Label', required: false },
  ],

  // ── OAuth providers ──
  'gb:oauth': [
    { key: 'provider_id', label: 'Provider ID', required: true },
    { key: 'key_type', label: 'Key Type', required: true, allowed: ['oauth'] },
    { key: 'access_token', label: 'Access Token', required: true, minLength: 1 },
    { key: 'email', label: 'Email', required: false },
    { key: 'refresh_token', label: 'Refresh Token', required: false },
    { key: 'expires_at', label: 'Expires At (epoch)', required: false },
  ],
  'kc:oauth': [
    { key: 'provider_id', label: 'Provider ID', required: true },
    { key: 'key_type', label: 'Key Type', required: true, allowed: ['oauth'] },
    { key: 'email', label: 'Email', required: true },
    { key: 'access_token', label: 'Access Token', required: true, minLength: 1 },
    { key: 'orgId', label: 'Org ID', required: false },
  ],
  'cbai:oauth': [
    { key: 'provider_id', label: 'Provider ID', required: true },
    { key: 'key_type', label: 'Key Type', required: true, allowed: ['oauth'] },
    { key: 'access_token', label: 'Access Token', required: true, minLength: 1 },
    { key: 'email', label: 'Email', required: false },
    { key: 'refresh_token', label: 'Refresh Token', required: false },
    { key: 'expires_at', label: 'Expires At (epoch)', required: false },
  ],
  // Codex (auth.openai.com) — access_token + refresh_token (offline_access scope)
  'cx:oauth': 'gb:oauth',
}

/** Resolve schema: follow alias strings, return ImportField[] or null if unknown */
export function getSchema(providerId: string, keyType: string): ImportField[] | null {
  let key = `${providerId}:${keyType}`
  let val = SCHEMAS[key]
  if (!val) {
    // fallback: try generic keyType-only lookup (e.g. ":apikey")
    key = `:${keyType}`
    val = SCHEMAS[key]
    if (!val) return null
  }
  // Follow alias chain
  while (typeof val === 'string') {
    if (!SCHEMAS[val]) return null
    val = SCHEMAS[val]
  }
  return val as ImportField[]
}

/** Validate item against schema. Returns error array (empty = valid). */
export function validateImportItem(
  item: Record<string, any>,
  schema: ImportField[],
  validProviderIds: Set<string>,
): string[] {
  const errors: string[] = []
  const missing: string[] = []

  for (const field of schema) {
    const val = item[field.key]
    const exists = val !== undefined && val !== null

    if (field.required && field.allowed) {
      // Check allowed values
      if (exists && !field.allowed.includes(String(val))) {
        errors.push(`'${field.key}' must be one of: ${field.allowed.join(', ')}`)
        continue
      }
    }

    if (field.required && field.minLength !== undefined) {
      // String field with minimum length
      const str = String(val || '')
      if (!exists || str.length < field.minLength) {
        missing.push(`'${field.label || field.key}' (min ${field.minLength} char)`)
        continue
      }
    }

    if (field.required && field.minLength === undefined && field.allowed === undefined) {
      // Simple required field
      if (!exists || String(val).trim() === '') {
        missing.push(`'${field.label || field.key}'`)
      }
    }
  }

  // Special: validate provider_id exists in BE
  const pid = item.provider_id
  if (pid && !validProviderIds.has(pid)) {
    errors.push(`Provider '${pid}' not found in system`)
  }

  const result = [...missing.map(m => `Missing: ${m}`), ...errors]
  return result
}
