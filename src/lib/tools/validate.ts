import type { JSONSchema, JSONSchemaProperty } from './types'

function validateProperty(
  value: unknown,
  schema: JSONSchemaProperty,
  path: string,
): string | null {
  if (value === undefined || value === null) {
    return `${path} is required`
  }

  if (schema.enum && !schema.enum.includes(String(value))) {
    return `${path} must be one of: ${schema.enum.join(', ')}`
  }

  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') return `${path} must be a string`
      return null
    case 'number':
    case 'integer':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return `${path} must be a number`
      }
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        return `${path} must be an integer`
      }
      return null
    case 'boolean':
      if (typeof value !== 'boolean') return `${path} must be a boolean`
      return null
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `${path} must be an object`
      }
      return null
    default:
      return null
  }
}

export function validateToolInput(
  input: unknown,
  schema: JSONSchema,
): { valid: true; value: Record<string, unknown> } | { valid: false; error: string } {
  if (schema.type !== 'object') {
    return { valid: false, error: 'Tool schema must be an object type' }
  }

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, error: 'Tool arguments must be a JSON object' }
  }

  const record = input as Record<string, unknown>
  const properties = schema.properties ?? {}
  const required = schema.required ?? []

  for (const key of required) {
    if (!(key in record)) {
      return { valid: false, error: `Missing required field: ${key}` }
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(record)) {
      if (!(key in properties)) {
        return { valid: false, error: `Unknown field: ${key}` }
      }
    }
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    if (!(key in record)) continue
    const error = validateProperty(record[key], propSchema, key)
    if (error) return { valid: false, error }
  }

  return { valid: true, value: record }
}
