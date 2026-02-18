import { parseFile } from 'music-metadata'

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
