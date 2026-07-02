import { WHISPER_LANGUAGE_CODES } from '../../shared/constants'

export function getPythonEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1',
    PYTHONUTF8: '1'
  }
}

export function normalizeLanguage(language: string): string | null {
  const normalized = language.trim().toLowerCase()
  if (!normalized || normalized === 'auto') return null
  if (/^[a-z]{2,3}$/.test(normalized)) return normalized
  return WHISPER_LANGUAGE_CODES[normalized] ?? null
}

export function sanitizeFileName(value: string): string {
  return value
    .split('')
    .map((character) => {
      if (character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)) {
        return '-'
      }
      return character
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
}
