import { useMemo } from 'react'
import './HomeBackground.css'

/* Cantidad de particulas por capa de profundidad */
const DUST_COUNT = 42 /* lejanas: pequenas, tenues, estaticas */
const STAR_COUNT = 26 /* medias: titilan suave */
const NEAR_COUNT = 12 /* cercanas: mas visibles y con leve deriva */

/* Generador pseudo-aleatorio determinista para que el fondo no cambie
   entre renders del componente. */
function createRng(seed) {
  let state = seed
  return function next() {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function buildParticles(count, seed) {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => {
    const x = (rng() * 100).toFixed(2)
    const y = (rng() * 100).toFixed(2)
    const size = (1 + rng() * 2.4).toFixed(2)
    const opacity = (0.12 + rng() * 0.45).toFixed(2)
    const duration = (7 + rng() * 9).toFixed(2)
    const delay = (rng() * -16).toFixed(2)
    const drift = (rng() * 24 - 12).toFixed(1) /* deriva horizontal en px */
    return { x, y, size, opacity, duration, delay, drift }
  })
}

/* Formas abstractas flotantes (anillos / cuadrados con glow muy suave) */
const SHAPES = [
  { type: 'ring',   x: 12, y: 22, size: 150, blur: 2,  glow: 0.10 },
  { type: 'ring',   x: 80, y: 66, size: 220, blur: 4,  glow: 0.08 },
  { type: 'ring',   x: 62, y: 30, size: 90,  blur: 1,  glow: 0.12 },
  { type: 'square', x: 24, y: 70, size: 26,  blur: 3,  glow: 0.14 },
  { type: 'square', x: 72, y: 14, size: 18,  blur: 5,  glow: 0.10 },
  { type: 'square', x: 45, y: 85, size: 14,  blur: 2,  glow: 0.16 },
  { type: 'dot',    x: 86, y: 40, size: 10,  blur: 6,  glow: 0.35 },
  { type: 'dot',    x: 30, y: 46, size: 8,   blur: 8,  glow: 0.25 },
  { type: 'dot',    x: 55, y: 60, size: 12,  blur: 10, glow: 0.30 },
]

/* Fondo decorativo del HomeScreen.
   Es una capa totalmente independiente: fija al viewport, sin
   pointer-events y por detras del contenido (z-index 0). No depende
   de nada del resto de la pantalla y se puede reutilizar tal cual
   debajo de cualquier otro contenido (textos, botones, imagenes). */
function HomeBackground() {
  const dust = useMemo(() => buildParticles(DUST_COUNT, 7), [])
  const stars = useMemo(() => buildParticles(STAR_COUNT, 137), [])
  const near = useMemo(() => buildParticles(NEAR_COUNT, 911), [])

  return (
    <div className="home-bg" aria-hidden="true">
      {/* Capa 1: viñeta oscura superior + brillo electrico abajo/derecha */}
      <div className="home-bg-wash" />

      {/* Capa 2: resplandores radiales difusos (fuente de luz azul detras) */}
      <div className="home-bg-glow home-bg-glow-primary" />
      <div className="home-bg-glow home-bg-glow-secondary" />
      <div className="home-bg-glow home-bg-glow-accent" />

      {/* Capa 3: formas flotantes desenfocadas (profundidad) */}
      <div className="home-bg-shapes">
        {SHAPES.map((shape, index) => (
          <span
            key={index}
            className={`home-bg-shape home-bg-shape-${shape.type}`}
            style={{
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              width: `${shape.size}px`,
              height: `${shape.size}px`,
              filter: `blur(${shape.blur}px)`,
              opacity: shape.glow,
              animationDelay: `${(index * -3.5) % 20}s`,
            }}
          />
        ))}
      </div>

      {/* Capa 4: particulas en tres profundidades */}
      <div className="home-bg-particles">
        {[dust, stars, near].map((layer, layerIndex) => (
          <div key={layerIndex} className={`home-bg-particle-layer home-bg-particle-layer-${layerIndex}`}>
            {layer.map((particle, index) => (
              <span
                key={index}
                className="home-bg-particle"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  opacity: particle.opacity,
                  animationDuration: `${particle.duration}s`,
                  animationDelay: `${particle.delay}s`,
                  '--drift': `${particle.drift}px`,
                  '--twinkle-low': `${(particle.opacity * 0.45).toFixed(2)}`,
                  '--twinkle-high': `${particle.opacity}`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomeBackground
