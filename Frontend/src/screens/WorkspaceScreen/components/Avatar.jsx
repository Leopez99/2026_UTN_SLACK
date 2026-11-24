import { AVATAR_COLORS, getColorForSeed, getInitials } from '../../../utils/avatar.util'

const STATUS_LABELS = {
  online: 'En línea',
  idle: 'Ausente',
  offline: 'Desconectado'
}

/*
Avatar con iniciales y color estable. Si recibe "src" muestra la imagen
(por ejemplo el logo de un espacio de trabajo). Si recibe "status" dibuja
el punto de presencia en la esquina inferior derecha.
*/
function Avatar({ name = '', src = null, size = 'md', status = null, className = '' }) {
  const color = getColorForSeed(name, AVATAR_COLORS)
  const label = status ? `${name} (${STATUS_LABELS[status]})` : name

  return (
    <span
      className={`ws-avatar ws-avatar--${size} ${className}`.trim()}
      style={{ backgroundColor: color }}
      role="img"
      aria-label={label}
      title={name}
    >
      {src ? (
        <img
          className="ws-avatar-img"
          src={src}
          alt=""
          aria-hidden="true"
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}

      {status && (
        <span
          className={`ws-status-dot ws-status-dot--${status}`}
          aria-hidden="true"
        />
      )}
    </span>
  )
}

export default Avatar
