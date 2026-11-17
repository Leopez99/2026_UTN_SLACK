/*
Datos de la sesion actual.
El backend firma el JWT con { id, name, email }. Aca solo leemos el payload
para mostrar el usuario en la UI; el token se sigue enviando intacto a la API.
*/

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function getSessionUser() {
  const auth_token = localStorage.getItem('auth_token')

  if (!auth_token) {
    return null
  }

  const payload = auth_token.split('.')[1]

  if (!payload) {
    return null
  }

  try {
    const data = JSON.parse(decodeBase64Url(payload))

    return {
      id: data.id ?? null,
      name: data.name || data.nombre || 'Mi cuenta',
      email: data.email || ''
    }
  }
  catch {
    return null
  }
}
