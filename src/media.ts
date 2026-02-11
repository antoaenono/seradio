import { parseFile } from 'music-metadata'

export type Mp3MetadataJson = {
  title?: string
  artist?: string
  album?: string
  year?: string
  comment?: string
  track?: number
  genre?: string
}

export function isMp3File(fileName: string): boolean {
  return /\.mp3$/i.test(fileName.trim())
}

export async function parseMp3MetadataToJson(filePath: string): Promise<Mp3MetadataJson> {
  const metadata = await parseFile(filePath, { duration: false })

  return {
    title: metadata.common.title ?? undefined,
    artist: metadata.common.artist ?? undefined,
    album: metadata.common.album ?? undefined,
    year: metadata.common.year ? String(metadata.common.year) : undefined,
    comment: undefined,
    track: metadata.common.track.no || undefined,
    genre: metadata.common.genre?.[0] ?? undefined,
  }
}
