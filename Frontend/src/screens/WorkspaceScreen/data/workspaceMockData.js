/*
Datos de ejemplo mientras el backend no expone canales ni mensajes.
La estructura imita los modelos de Mongo para que reemplazarlos por los
endpoints reales sea un cambio de origen de datos, no de componentes.

TODO:
- Canales: GET /api/workspaces/:workspace_id/channels
- Mensajes: GET /api/channels/:channel_id/messages
*/

export const MOCK_CHANNEL_GROUPS = [
  {
    grupo_id: 'informacion',
    grupo_nombre: 'Información',
    canales: [
      {
        canal_id: 'bienvenida',
        canal_nombre: 'bienvenida',
        canal_descripcion: 'Empezá por acá: reglas y presentaciones del equipo.'
      },
      {
        canal_id: 'anuncios',
        canal_nombre: 'anuncios',
        canal_descripcion: 'Novedades importantes del espacio de trabajo.'
      }
    ]
  },
  {
    grupo_id: 'general',
    grupo_nombre: 'General',
    canales: [
      {
        canal_id: 'general',
        canal_nombre: 'general',
        canal_descripcion: 'Conversación general del equipo. Todo lo que no tiene un canal propio, va acá.'
      },
      {
        canal_id: 'presentaciones',
        canal_nombre: 'presentaciones',
        canal_descripcion: 'Contá quién sos y qué estás cursando.'
      },
      {
        canal_id: 'off-topic',
        canal_nombre: 'off-topic',
        canal_descripcion: 'Memes, música y charlas que no van en ningún otro lado.'
      }
    ]
  },
  {
    grupo_id: 'proyectos',
    grupo_nombre: 'Proyectos',
    canales: [
      {
        canal_id: 'desarrollo',
        canal_nombre: 'desarrollo',
        canal_descripcion: 'Código, revisiones y despliegues.'
      },
      {
        canal_id: 'diseno',
        canal_nombre: 'diseno',
        canal_descripcion: 'Mockups, componentes y guía de estilos.'
      },
      {
        canal_id: 'soporte',
        canal_nombre: 'soporte',
        canal_descripcion: 'Consultas técnicas y reportes de bugs.'
      }
    ]
  }
]

export const ACTIVE_CHANNEL_ID = 'general'

export function getActiveChannel() {
  const canales = MOCK_CHANNEL_GROUPS.flatMap((group) => group.canales)

  return canales.find((canal) => canal.canal_id === ACTIVE_CHANNEL_ID) ?? canales[0]
}

export const MOCK_MESSAGES = [
  {
    mensaje_id: 'msg_001',
    fecha_creacion: '2026-11-15T16:02:00-03:00',
    autor: { nombre: 'Valentina' },
    contenido: '¡Hola equipo! Ya está subida la nueva versión del panel de espacios de trabajo. Pásenle un ojo y me dicen qué les parece.'
  },
  {
    mensaje_id: 'msg_002',
    fecha_creacion: '2026-11-15T16:07:00-03:00',
    autor: { nombre: 'Leo' },
    contenido: 'Lo estuve viendo recién y quedó muy bien. ¿El listado de miembros lo trae el backend en el mismo request?'
  },
  {
    mensaje_id: 'msg_003',
    fecha_creacion: '2026-11-15T16:09:00-03:00',
    autor: { nombre: 'Valentina' },
    contenido: 'Sí, el endpoint del detalle ya devuelve el espacio y todos sus miembros. Los canales y mensajes todavía son datos mock hasta que cerremos esos endpoints.'
  },
  {
    mensaje_id: 'msg_004',
    fecha_creacion: '2026-11-15T16:12:00-03:00',
    autor: { nombre: 'Mica' },
    contenido: 'Me gusta la idea de mostrar los accesos directos arriba de los canales. ¿Los dejamos fijos o los armamos con los últimos canales visitados?'
  },
  {
    mensaje_id: 'msg_005',
    fecha_creacion: '2026-11-15T16:20:00-03:00',
    autor: { nombre: 'Nico' },
    contenido: 'Por ahora fijos. Cuando tengamos actividad real del usuario, vemos si conviene guardar el historial en el navegador.'
  },
  {
    mensaje_id: 'msg_006',
    fecha_creacion: '2026-11-16T09:15:00-03:00',
    autor: { nombre: 'Sofi' },
    contenido: 'Buen día. Dejé en el canal de diseño los colores definitivos para el tema oscuro. La idea es mantener el contraste que pide la referencia.'
  },
  {
    mensaje_id: 'msg_007',
    fecha_creacion: '2026-11-16T09:22:00-03:00',
    autor: { nombre: 'Sofi' },
    contenido: 'También agregué los estados del canal activo, el hover de los mensajes y el bloque de bienvenida al principio de cada canal.'
  },
  {
    mensaje_id: 'msg_008',
    fecha_creacion: '2026-11-16T10:04:00-03:00',
    autor: { nombre: 'Tomi' },
    contenido: '¿Probamos el composer con Enter para enviar y Shift + Enter para salto de línea? Es lo que hace Discord y ya lo tenemos pedido.'
  },
  {
    mensaje_id: 'msg_009',
    fecha_creacion: '2026-11-16T10:11:00-03:00',
    autor: { nombre: 'Leo' },
    contenido: 'Sí, lo dejamos anotado para la próxima iteración. En esta primera versión el composer es solo visual.'
  },
  {
    mensaje_id: 'msg_010',
    fecha_creacion: '2026-11-16T10:18:00-03:00',
    autor: { nombre: 'Tomi' },
    contenido: 'Perfecto. Entonces revisamos el layout y después conectamos todo con la API.'
  }
]
