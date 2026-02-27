import { readdir } from 'node:fs/promises'

import { parseFile } from 'music-metadata'
import path from 'path'

const AUDIO_DIR = path.join(import.meta.dirname, '../audio')

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
  const files = await readdir(AUDIO_DIR)
  const mp3 = files.find(isMp3File)
  if (!mp3) throw new Error('No mp3 files found in audio/')
  return path.join(AUDIO_DIR, mp3)
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
