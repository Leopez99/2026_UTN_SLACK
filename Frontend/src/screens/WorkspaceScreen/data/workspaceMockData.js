/*
Mensajes de ejemplo mientras el backend no expone mensajes de canal.
La estructura imita el modelo MensajeCanal para que reemplazarlos por el
endpoint real sea un cambio de origen de datos, no de componentes.

Los canales ya son datos reales: GET /api/workspaces/:workspace_id/channels

TODO:
- Mensajes: GET /api/channels/:channel_id/messages
*/

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
