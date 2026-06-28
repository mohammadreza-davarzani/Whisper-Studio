import { describe, it, expect } from 'vitest'
import {
  generate,
  generateSrt,
  generateVtt,
  generateTxt,
  generateTsv,
  type ExportFormat
} from '@/lib/export-generators'
import type { WhisperSegment } from '@shared/ipc'

const SEGMENTS: WhisperSegment[] = [
  { id: 1, start: 0, end: 2.5, text: 'Hello world' },
  { id: 2, start: 2.5, end: 5.123, text: 'This is a test' },
  { id: 3, start: 60, end: 3661.001, text: 'Long segment' }
]

describe('generateSrt()', () => {
  it('produces correct SRT header for first segment', () => {
    const out = generateSrt(SEGMENTS)
    expect(out).toContain('1\n00:00:00,000 --> 00:00:02,500\nHello world')
  })

  it('produces correct SRT header for second segment', () => {
    const out = generateSrt(SEGMENTS)
    expect(out).toContain('2\n00:00:02,500 --> 00:00:05,123\nThis is a test')
  })

  it('handles hours correctly', () => {
    const out = generateSrt(SEGMENTS)
    expect(out).toContain('3\n00:01:00,000 --> 01:01:01,001\nLong segment')
  })

  it('ends with a newline', () => {
    expect(generateSrt(SEGMENTS).endsWith('\n')).toBe(true)
  })

  it('returns empty string for empty segments (just trailing newline)', () => {
    expect(generateSrt([])).toBe('\n')
  })
})

describe('generateVtt()', () => {
  it('starts with WEBVTT header', () => {
    expect(generateVtt(SEGMENTS).startsWith('WEBVTT\n')).toBe(true)
  })

  it('uses dot millisecond separator (not comma)', () => {
    const out = generateVtt(SEGMENTS)
    expect(out).toContain('00:00:00.000 --> 00:00:02.500')
    expect(out).not.toContain('00:00:00,000')
  })

  it('does not include segment numbers', () => {
    const out = generateVtt(SEGMENTS)
    expect(out).not.toMatch(/^\d+$/m)
  })

  it('contains all segment texts', () => {
    const out = generateVtt(SEGMENTS)
    for (const seg of SEGMENTS) {
      expect(out).toContain(seg.text)
    }
  })
})

describe('generateTxt()', () => {
  it('contains only text lines, no timestamps', () => {
    const out = generateTxt(SEGMENTS)
    expect(out).not.toContain('-->')
    expect(out).not.toContain(':')
  })

  it('each segment text appears on its own line', () => {
    const out = generateTxt(SEGMENTS)
    const lines = out.split('\n').filter(Boolean)
    expect(lines).toEqual(SEGMENTS.map((s) => s.text))
  })
})

describe('generateTsv()', () => {
  it('starts with a header row', () => {
    const out = generateTsv(SEGMENTS)
    const [header] = out.split('\n')
    expect(header).toBe('start\tend\ttext')
  })

  it('produces correct data rows', () => {
    const out = generateTsv(SEGMENTS)
    const [, firstRow] = out.split('\n')
    expect(firstRow).toBe('0.000\t2.500\tHello world')
  })

  it('has the right number of rows (header + segments)', () => {
    const out = generateTsv(SEGMENTS)
    const rows = out.split('\n').filter(Boolean)
    expect(rows.length).toBe(SEGMENTS.length + 1)
  })
})

describe('generate() registry dispatch', () => {
  const FORMATS: ExportFormat[] = ['srt', 'vtt', 'txt', 'tsv']

  it.each(FORMATS)('dispatches format "%s" and returns non-empty output', (format) => {
    const out = generate(format, SEGMENTS)
    expect(out.length).toBeGreaterThan(0)
  })

  it('srt output matches generateSrt directly', () => {
    expect(generate('srt', SEGMENTS)).toBe(generateSrt(SEGMENTS))
  })

  it('vtt output matches generateVtt directly', () => {
    expect(generate('vtt', SEGMENTS)).toBe(generateVtt(SEGMENTS))
  })

  it('txt output matches generateTxt directly', () => {
    expect(generate('txt', SEGMENTS)).toBe(generateTxt(SEGMENTS))
  })

  it('tsv output matches generateTsv directly', () => {
    expect(generate('tsv', SEGMENTS)).toBe(generateTsv(SEGMENTS))
  })
})
