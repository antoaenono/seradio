/**
 * @module audio
 * This module provides functions for handling audio files, including reading metadata and selecting random MP3 files.
 */

import { readdir } from 'node:fs/promises'

import { parseFile } from 'music-metadata'
import path from 'path'

import { logger } from './logger'

const AUDIO_DIR = path.join(import.meta.dirname, '../media')

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

export async function getRandomMp3(): Promise<string> {
  const files: string[] = await readdir(AUDIO_DIR)
  const mp3Files: string[] = files.filter(isMp3File)
  if (mp3Files.length === 0) throw new Error('No mp3 files found in media/')
  const randomIndex: number = Math.floor(Math.random() * mp3Files.length)
  const chosenMp3: string = path.join(AUDIO_DIR, mp3Files[randomIndex])
  logger.info({ path: chosenMp3, total: mp3Files.length }, 'selected random mp3')
  return chosenMp3
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
