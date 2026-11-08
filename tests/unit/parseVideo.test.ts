import { describe, expect, it } from 'vitest'
import {
  buildVideoEmbedUrl,
  defaultVideoAttrs,
  formatStartTime,
  parseStartTime,
  parseVideoUrl,
} from '../../src/editor/video/parseVideo'

describe('parseVideoUrl', () => {
  it('parses common YouTube URL forms', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(parseVideoUrl(url)).toMatchObject({
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
      })
    }
  })

  it('parses Vimeo, Loom and direct files', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789')).toMatchObject({
      provider: 'vimeo',
      videoId: '123456789',
    })
    expect(parseVideoUrl('https://www.loom.com/share/abcdef123')).toMatchObject({
      provider: 'loom',
      videoId: 'abcdef123',
    })
    expect(parseVideoUrl('https://cdn.example.com/video.mp4')).toMatchObject({
      provider: 'file',
    })
  })

  it('rejects unsupported URLs', () => {
    expect(parseVideoUrl('https://example.com/article')).toBeNull()
    expect(parseVideoUrl('not a url')).toBeNull()
  })
})

describe('video attributes and time helpers', () => {
  it('uses safe defaults and respects overrides', () => {
    const parsed = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(parsed).not.toBeNull()
    const attrs = defaultVideoAttrs(parsed!, { start: 30, autoplay: true })
    expect(attrs).toMatchObject({
      aspect: '16:9',
      privacy: true,
      start: 30,
      autoplay: true,
      provider: 'youtube',
    })
  })

  it('builds a privacy-enhanced YouTube embed', () => {
    const parsed = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')!
    const url = buildVideoEmbedUrl(defaultVideoAttrs(parsed, { start: 30 }))
    expect(url).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(url).toContain('start=30')
  })

  it('parses and formats start times', () => {
    expect(parseStartTime('90')).toBe(90)
    expect(parseStartTime('1:30')).toBe(90)
    expect(parseStartTime('1:02:03')).toBe(3723)
    expect(parseStartTime('bad')).toBeNull()
    expect(formatStartTime(90)).toBe('1:30')
    expect(formatStartTime(3723)).toBe('1:02:03')
  })
})
