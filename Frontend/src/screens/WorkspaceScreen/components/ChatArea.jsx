import Avatar from './Avatar'
import {
  IconBell,
  IconGif,
  IconGift,
  IconHash,
  IconHelp,
  IconMore,
  IconPin,
  IconReply,
  IconSearch,
  IconSend,
  IconSmile,
  IconUsers
} from './Icons'
import { NAME_COLORS, getColorForSeed } from '../../../utils/avatar.util'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'

const DAY_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE
})

const TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE
})

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE
})

const GROUP_WINDOW_MS = 7 * 60 * 1000

function getDayKey(date_value) {
  return DAY_KEY_FORMATTER.format(new Date(date_value))
}

function formatDay(date_value) {
  return DAY_FORMATTER.format(new Date(date_value))
}

function formatTime(date_value) {
  return TIME_FORMATTER.format(new Date(date_value))
}

/*
Arma la secuencia de mensajes con separadores de fecha y agrupa mensajes
consecutivos del mismo autor (hasta 7 minutos), como hace Discord.
*/
function buildTimeline(messages) {
  const timeline = []
  let previous_message = null

  messages.forEach((message) => {
    const day_key = getDayKey(message.fecha_creacion)
    const author_name = message.autor?.nombre || 'Usuario'
    const message_time = new Date(message.fecha_creacion).getTime()

    if (!previous_message || previous_message.day_key !== day_key) {
      timeline.push({
        type: 'day',
        key: `day-${day_key}`,
        label: formatDay(message.fecha_creacion)
      })
    }

    const elapsed = previous_message ? message_time - previous_message.time : Infinity
    const grouped =
      Boolean(previous_message) &&
      previous_message.day_key === day_key &&
      previous_message.author_name === author_name &&
      elapsed >= 0 &&
      elapsed < GROUP_WINDOW_MS

    timeline.push({
      type: 'message',
      key: message.mensaje_id,
      message,
      grouped
    })

    previous_message = {
      day_key,
      author_name,
      time: message_time
    }
  })

  return timeline
}

function MessageActions() {
  return (
    <div className="ws-message-actions">
      <button type="button" className="ws-icon-button" title="Agregar reacción" aria-label="Agregar reacción">
        <IconSmile size={18} />
      </button>
      <button type="button" className="ws-icon-button" title="Responder" aria-label="Responder">
        <IconReply size={18} />
      </button>
      <button type="button" className="ws-icon-button" title="Más opciones" aria-label="Más opciones">
        <IconMore size={18} />
      </button>
    </div>
  )
}

function ChatArea({ channel, messages = [], members_count = 0 }) {
  const timeline = buildTimeline(messages)
  const channel_name = channel?.canal_nombre || 'canal'
  const channel_description = channel?.canal_descripcion || ''

  return (
    <section className="ws-chat" aria-label={`Canal ${channel_name}`}>

      <header className="ws-chat-header">
        <div className="ws-chat-heading">
          <IconHash size={22} className="ws-chat-hash" />
          <h1 className="ws-chat-title">{channel_name}</h1>

          {channel_description && (
            <>
              <span className="ws-chat-divider" aria-hidden="true" />
              <p className="ws-chat-topic" title={channel_description}>
                {channel_description}
              </p>
            </>
          )}
        </div>

        <div className="ws-chat-tools">
          <button type="button" className="ws-icon-button" title="Buscar en el canal" aria-label="Buscar en el canal">
            <IconSearch size={20} />
          </button>
          <button type="button" className="ws-icon-button" title="Notificaciones" aria-label="Notificaciones">
            <IconBell size={20} />
          </button>
          <button type="button" className="ws-icon-button" title="Mensajes fijados" aria-label="Mensajes fijados">
            <IconPin size={20} />
          </button>
          <button type="button" className="ws-icon-button" title={`Miembros del espacio (${members_count})`} aria-label={`Miembros del espacio (${members_count})`}>
            <IconUsers size={20} />
          </button>
          <button type="button" className="ws-icon-button" title="Ayuda" aria-label="Ayuda">
            <IconHelp size={20} />
          </button>
        </div>
      </header>

      <div className="ws-messages">
        <div className="ws-messages-inner">

          <div className="ws-chat-welcome">
            <span className="ws-chat-welcome-icon" aria-hidden="true">
              <IconHash size={36} />
            </span>
            <h2 className="ws-chat-welcome-title">
              ¡Bienvenido a #{channel_name}!
            </h2>
            <p className="ws-chat-welcome-text">
              Este es el comienzo del canal #{channel_name}.
              {channel_description ? ` ${channel_description}` : ''}
            </p>
          </div>

          {timeline.map((item) => {
            if (item.type === 'day') {
              return (
                <div className="ws-day-divider" key={item.key} role="separator">
                  <span>{item.label}</span>
                </div>
              )
            }

            const { message, grouped } = item
            const author_name = message.autor?.nombre || 'Usuario'

            return (
              <article
                className={grouped ? 'ws-message ws-message-grouped' : 'ws-message ws-message-first'}
                key={item.key}
              >
                {grouped
                  ? <span className="ws-message-avatar-slot" aria-hidden="true" />
                  : <Avatar className="ws-message-avatar" name={author_name} size="md" />
                }

                <div className="ws-message-body">
                  {!grouped && (
                    <header className="ws-message-header">
                      <span
                        className="ws-message-author"
                        style={{ color: getColorForSeed(author_name, NAME_COLORS) }}
                      >
                        {author_name}
                      </span>
                      <time className="ws-message-time" dateTime={message.fecha_creacion}>
                        {formatTime(message.fecha_creacion)}
                      </time>
                    </header>
                  )}

                  <p className="ws-message-text">{message.contenido}</p>
                </div>

                <MessageActions />
              </article>
            )
          })}

        </div>
      </div>

      <div className="ws-composer-wrap">
        <div className="ws-composer">
          <button type="button" className="ws-composer-add" title="Adjuntar archivo" aria-label="Adjuntar archivo">
            <span aria-hidden="true">+</span>
          </button>

          <input
            className="ws-composer-input"
            type="text"
            placeholder={`Enviar mensaje a #${channel_name}`}
            aria-label={`Enviar mensaje a #${channel_name}`}
          />

          <div className="ws-composer-actions">
            <button type="button" className="ws-icon-button" title="Emoji" aria-label="Emoji">
              <IconSmile size={20} />
            </button>
            <button type="button" className="ws-icon-button" title="Regalo" aria-label="Regalo">
              <IconGift size={20} />
            </button>
            <button type="button" className="ws-icon-button" title="GIF" aria-label="GIF">
              <IconGif size={20} />
            </button>
            <button type="button" className="ws-icon-button ws-composer-send" title="Enviar mensaje" aria-label="Enviar mensaje">
              <IconSend size={19} />
            </button>
          </div>
        </div>
      </div>

    </section>
  )
}

export default ChatArea
