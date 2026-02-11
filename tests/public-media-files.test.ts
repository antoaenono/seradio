import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, test } from 'bun:test'

const PUBLIC_MEDIA_DIR = path.resolve(import.meta.dirname, '../public/media')
const ALLOWED_EXTENSIONS = new Set(['mp3', 'wav', 'ogg'])

describe('public/media audio file formats', () => {
  test('contains at least one supported audio file and only supported formats', async () => {
    const entries = await readdir(PUBLIC_MEDIA_DIR, { withFileTypes: true })
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)

    const extensions = files
      .map((filename) => path.extname(filename).toLowerCase().replace(/^\./, ''))
      .filter((ext) => ext.length > 0)

    expect(extensions.length).toBeGreaterThan(0)

    for (const ext of extensions) {
      expect(ALLOWED_EXTENSIONS.has(ext)).toBe(true)
    }
  })
})
