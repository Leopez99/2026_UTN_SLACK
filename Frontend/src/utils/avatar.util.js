/*
Utilidades para dibujar avatares sin imagen:
- Iniciales a partir del nombre
- Color estable a partir de un texto (mismo nombre => mismo color)
*/

export const AVATAR_COLORS = [
  '#5865f2',
  '#23a55a',
  '#f0b232',
  '#eb459e',
  '#00a8fc',
  '#ed4245',
  '#9b59b6',
  '#e67e22'
]

export const NAME_COLORS = [
  '#f78fb3',
  '#7bd88f',
  '#f7c948',
  '#7cc4ff',
  '#c792ea',
  '#ff9f7f',
  '#5cdbd3',
  '#f2a5a9'
]

export function getInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

/* Hash simple para que cada nombre caiga siempre en el mismo color */
export function getColorForSeed(seed = '', palette = AVATAR_COLORS) {
  let hash = 0

  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000
  }

  return palette[hash % palette.length]
}
