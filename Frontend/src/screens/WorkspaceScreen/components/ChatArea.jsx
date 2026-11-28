import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import {
  IconGif,
  IconHash,
  IconMenu,
  IconMore,
  IconReply,
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
    // Identificador único del autor: member_id (nombre solo como fallback).
    // Evita agrupar mensajes de usuarios distintos que comparten el mismo nombre.
    const author_id = message.autor?.member_id ?? author_name
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
      previous_message.author_id === author_id &&
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
      author_id,
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

function ChatArea({
  channel,
  messages = [],
  messages_loading = false,
  messages_error = null,
  new_messages_notice = null,
  members_count = 0,
  channels_open = false,
  members_open = false,
  on_toggle_channels,
  on_toggle_members,
  on_reload_messages,
  on_show_new_messages,
  on_send_message
}) {
  const timeline = buildTimeline(messages)
  const channel_name = channel?.canal_nombre || 'canal'
  const channel_description = channel?.canal_descripcion || ''

  const [message_text, set_message_text] = useState('')
  const [sending_message, set_sending_message] = useState(false)
  const [send_message_error, set_send_message_error] = useState(null)

  const messages_ref = useRef(null)

  /*
  Acompaña la conversacion: si el usuario ya estaba abajo, los mensajes
  nuevos (o la recarga manual) lo dejan al final. Si estaba leyendo mas
  arriba no se le mueve el scroll.
  */
  useEffect(() => {
    const messages_element = messages_ref.current

    if (!messages_element || messages_loading) {
      return
    }

    const distance_to_bottom =
      messages_element.scrollHeight - messages_element.scrollTop - messages_element.clientHeight

    if (distance_to_bottom < 160) {
      messages_element.scrollTop = messages_element.scrollHeight
    }
  }, [messages.length, messages_loading])

  async function handleSendMessage(event) {
    event.preventDefault()

    const content = message_text.trim()

    if (!content || sending_message) {
      return
    }

    set_sending_message(true)
    set_send_message_error(null)

    try {
      await on_send_message(content)
      set_message_text('')
    }
    catch (error) {
      set_send_message_error(error.message)
    }
    finally {
      set_sending_message(false)
    }
  }

  if (!channel) {
    return (
      <section className="ws-chat" aria-label="Espacio sin canales">
        <div className="ws-chat-placeholder">
          <h2 className="ws-chat-placeholder-title">Este espacio todavía no tiene canales</h2>
          <p className="ws-chat-placeholder-text">
            Cuando se cree un canal va a aparecer acá.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="ws-chat" aria-label={`Canal ${channel_name}`}>

      <header className="ws-chat-header">
        <div className="ws-chat-heading">
          <button
            type="button"
            className="ws-icon-button ws-header-menu"
            title="Ver canales"
            aria-label="Ver canales"
            aria-controls="ws-channel-sidebar"
            aria-expanded={channels_open}
            onClick={on_toggle_channels}
          >
            <IconMenu size={22} />
          </button>

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

        <button
          type="button"
          className="ws-icon-button ws-members-toggle"
          title={`Miembros del espacio (${members_count})`}
          aria-label={`Miembros del espacio (${members_count})`}
          aria-controls="ws-members-panel"
          aria-expanded={members_open}
          onClick={on_toggle_members}
        >
          <IconUsers size={20} />
        </button>
      </header>

      <div className="ws-messages" ref={messages_ref}>
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

          {messages_loading && (
            <p className="ws-chat-empty">Cargando mensajes...</p>
          )}

          {!messages_loading && messages_error && (
            <div className="ws-chat-error">
              <p className="ws-chat-error-text">{messages_error}</p>
              <button
                type="button"
                className="ws-chat-retry"
                onClick={on_reload_messages}
              >
                Reintentar
              </button>
            </div>
          )}

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
                  : <Avatar className="ws-message-avatar" name={author_name} src={message.autor?.foto_perfil ?? null} size="md" />
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

          {!messages_loading && !messages_error && timeline.length === 0 && (
            <p className="ws-chat-empty">
              Todavía no hay mensajes en este canal.
            </p>
          )}

        </div>
      </div>

      {new_messages_notice && (
        <button
          type="button"
          className="ws-new-messages"
          onClick={on_show_new_messages}
        >
          <span className="ws-new-messages-icon" aria-hidden="true">💬</span>
          <span className="ws-new-messages-text">
            Hay nuevos mensajes
            <span className="ws-new-messages-author">
              {new_messages_notice.count === 1
                ? `${new_messages_notice.author_name} escribió en este canal`
                : `${new_messages_notice.count} mensajes nuevos en este canal`}
            </span>
          </span>
        </button>
      )}

      <div className="ws-composer-wrap">
        <form className="ws-composer" onSubmit={handleSendMessage}>
          <button type="button" className="ws-composer-add" title="Adjuntar archivo" aria-label="Adjuntar archivo">
            <span aria-hidden="true">+</span>
          </button>

          <input
            className="ws-composer-input"
            type="text"
            placeholder={`Enviar mensaje a #${channel_name}`}
            aria-label={`Enviar mensaje a #${channel_name}`}
            value={message_text}
            onChange={(event) => set_message_text(event.target.value)}
            maxLength={30000}
            disabled={sending_message}
          />

          <div className="ws-composer-actions">
            <button type="button" className="ws-icon-button" title="Emoji" aria-label="Emoji">
              <IconSmile size={20} />
            </button>
            <button type="button" className="ws-icon-button" title="GIF" aria-label="GIF">
              <IconGif size={20} />
            </button>
            <button
              type="submit"
              className="ws-icon-button ws-composer-send"
              title="Enviar mensaje"
              aria-label="Enviar mensaje"
              disabled={!message_text.trim() || sending_message}
            >
              <IconSend size={19} />
            </button>
          </div>
        </form>

        {send_message_error && (
          <p className="ws-composer-error" role="alert">{send_message_error}</p>
        )}
      </div>

    </section>
  )
}

export default ChatArea
