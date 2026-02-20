import { readdir } from 'node:fs/promises'

import { parseFile } from 'music-metadata'
import path from 'path'

const MEDIA_DIR = path.join(import.meta.dirname, '../media')

export type Mp3MetadataJson = {
  title?: string
  artist?: string
  album?: string
  year?: number
  track?: number
  genre?: string
}

export function isMp3File(fileName: string): boolean {
  return /\.mp3$/i.test(fileName.trim())
}

export async function firstMp3(): Promise<string> {
  const files = await readdir(MEDIA_DIR)
  const mp3 = files.find(isMp3File)
  if (!mp3) throw new Error('No mp3 files found in media/')
  return path.join(MEDIA_DIR, mp3)
}

export async function parseMp3MetadataToJson(filePath: string): Promise<Mp3MetadataJson> {
  const metadata = await parseFile(filePath, { duration: false })

  return {
    title: metadata.common.title,
    artist: metadata.common.artist,
    album: metadata.common.album,
    year: metadata.common.year,
    track: metadata.common.track.no ?? undefined, // track.no returns as number | null
    genre: metadata.common.genre?.[0],
  }
}
