'use client'

import { useId } from 'react'
import { useReducedMotion } from 'framer-motion'

interface OrbitSceneProps {
  /** Short banner variant (phones): no labels, tighter crop. */
  compact?: boolean
  /** Sign-in in flight: the keyhole stops breathing and holds full brightness. */
  busy?: boolean
}

// Everything is drawn inside one group tilted like the logo's swoosh. Coordinates below are in
// that group's own (untilted) space: an ellipse centred on the keyhole.
const CX = 490
const CY = 350
const RX = 380
const RY = 150
const TILT = -14

const ORBIT_PATH = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 1 1 ${CX + RX} ${CY} A ${RX} ${RY} 0 1 1 ${CX - RX} ${CY} Z`

// Destinations sit on the orbit at these angles (degrees, clockwise from +x). The hub is the
// keyhole itself: the Dubai branch everyone is routed from.
const DESTINATIONS = [
  { id: 'canada', label: 'Canada', angle: 212, dx: -14, dy: -16, anchor: 'end' as const },
  { id: 'europe', label: 'Europe', angle: 262, dx: 0, dy: -20, anchor: 'middle' as const },
  { id: 'australia', label: 'Australia', angle: 22, dx: 16, dy: 5, anchor: 'start' as const },
  { id: 'new-zealand', label: 'New Zealand', angle: 58, dx: 14, dy: 22, anchor: 'start' as const },
]

// Fixed field of faint stars: deterministic so server and client markup always match.
const STARS: [number, number, number][] = [
  [92, 88, 1.4], [188, 152, 1], [312, 64, 1.2], [520, 46, 1], [668, 96, 1.5], [792, 58, 1], [842, 176, 1.2],
  [64, 250, 1], [128, 470, 1.3], [254, 560, 1], [402, 620, 1.4], [588, 596, 1], [716, 552, 1.2], [828, 466, 1],
  [864, 322, 1.4], [40, 380, 1.1], [232, 36, 1], [452, 122, 0.9], [610, 168, 1], [148, 640, 1.1],
]

const onOrbit = (angleDeg: number) => {
  const a = (angleDeg * Math.PI) / 180
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) }
}

export function OrbitScene({ compact = false, busy = false }: OrbitSceneProps) {
  const reduceMotion = Boolean(useReducedMotion())
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${name}-${uid}`

  return (
    // Full scene: `meet`, so every destination label stays inside the panel at any window shape
    // (the viewBox spans the widest label; the leftover bands are just more of the panel's own
    // background). Phone banner: `slice`, a tight crop around the keyhole that fills the strip.
    <svg
      viewBox={compact ? `${CX - 330} ${CY - 140} 660 270` : '20 100 960 500'}
      preserveAspectRatio={compact ? 'xMidYMid slice' : 'xMidYMid meet'}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id={id('gold')} gradientUnits="userSpaceOnUse" x1={CX - RX} y1="0" x2={CX + RX} y2="0">
          <stop offset="0" stopColor="#9D6C2D" />
          <stop offset="0.38" stopColor="#C29B58" />
          <stop offset="0.66" stopColor="#EECA7D" />
          <stop offset="1" stopColor="#BE9349" />
        </linearGradient>
        {/* the swoosh: full strength at the left, dissolving into the dark by the right, as in the logo */}
        <linearGradient id={id('swoosh')} gradientUnits="userSpaceOnUse" x1={CX - RX} y1="0" x2={CX + RX} y2="0">
          <stop offset="0" stopColor="#B98A3E" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#EECA7D" stopOpacity="0.55" />
          <stop offset="1" stopColor="#EECA7D" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('halo')}>
          <stop offset="0" stopColor="#EECA7D" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#C29B58" stopOpacity="0.16" />
          <stop offset="1" stopColor="#C29B58" stopOpacity="0" />
        </radialGradient>
        <filter id={id('glow')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* stars */}
      <g fill="#DCE4F5">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x + 40} cy={y} r={r} opacity={0.18 + (i % 4) * 0.08} />
        ))}
      </g>

      {/* concentric compass rings around the keyhole (upright, not tilted) */}
      <g fill="none" stroke="#EECA7D" transform={`translate(${CX} ${CY})`}>
        <circle r="214" strokeOpacity="0.10" strokeWidth="1" />
        <g className={reduceMotion ? undefined : 'mi-orbit-spin'}>
          <circle r="300" strokeOpacity="0.16" strokeWidth="1" strokeDasharray="2 9" strokeLinecap="round" />
        </g>
        <circle r="392" strokeOpacity="0.07" strokeWidth="1" />
      </g>

      <g transform={`rotate(${TILT} ${CX} ${CY})`}>
        {/* soft glow behind the swoosh, then the swoosh, then the crisp hairline */}
        <path d={ORBIT_PATH} fill="none" stroke={`url(#${id('swoosh')})`} strokeWidth="26" strokeLinecap="round" opacity="0.28" filter={`url(#${id('glow')})`} />
        <path d={ORBIT_PATH} fill="none" stroke={`url(#${id('swoosh')})`} strokeWidth="9" strokeLinecap="round" />
        <path
          id={id('orbit')}
          d={ORBIT_PATH}
          pathLength={1}
          fill="none"
          stroke={`url(#${id('gold')})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          className={reduceMotion ? undefined : 'mi-orbit-draw'}
          style={reduceMotion ? undefined : { strokeDasharray: 1, strokeDashoffset: 1 }}
        />

        {/* destination nodes */}
        {DESTINATIONS.map((d) => {
          const p = onOrbit(d.angle)
          return (
            <g key={d.id}>
              <circle cx={p.x} cy={p.y} r="9" fill="none" stroke="#EECA7D" strokeOpacity="0.4" strokeWidth="1">
                {!reduceMotion && (
                  <>
                    <animate attributeName="r" values="6;15;6" dur="3.6s" repeatCount="indefinite" begin={`${(d.angle % 7) * 0.4}s`} />
                    <animate attributeName="stroke-opacity" values="0.55;0;0.55" dur="3.6s" repeatCount="indefinite" begin={`${(d.angle % 7) * 0.4}s`} />
                  </>
                )}
              </circle>
              <circle cx={p.x} cy={p.y} r="4.5" fill="#EECA7D" filter={`url(#${id('glow')})`} />
              {!compact && (
                <g transform={`rotate(${-TILT} ${p.x} ${p.y})`}>
                  <text
                    x={p.x + d.dx}
                    y={p.y + d.dy}
                    textAnchor={d.anchor}
                    fontSize="13"
                    fontWeight="600"
                    letterSpacing="0.16em"
                    fill="#E6ECF8"
                    fillOpacity="0.9"
                    style={{ textTransform: 'uppercase' }}
                  >
                    {d.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* the paper-plane arrow from the logo, circling the keyhole */}
        <g filter={`url(#${id('glow')})`}>
          {reduceMotion ? (
            <path d="M 17 0 L -13 -11 L -6 0 L -13 11 Z" fill="#F6DC9B" stroke="#BE9349" strokeWidth="0.8" strokeLinejoin="round" transform={`translate(${onOrbit(250).x} ${onOrbit(250).y}) rotate(20)`} />
          ) : (
            <path d="M 17 0 L -13 -11 L -6 0 L -13 11 Z" fill="#F6DC9B" stroke="#BE9349" strokeWidth="0.8" strokeLinejoin="round">
              <animateMotion dur="16s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#${id('orbit')}`} />
              </animateMotion>
            </path>
          )}
        </g>
      </g>

      {/* keyhole: "Your world, unlocked." */}
      <g transform={`translate(${CX} ${CY})`}>
        <circle r="120" fill={`url(#${id('halo')})`} className={busy || reduceMotion ? undefined : 'mi-keyhole-glow'} opacity={busy ? 1 : undefined} />
        <g transform="scale(1.55) translate(0 -6)" fill="none" stroke={`url(#${id('gold')})`} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" filter={`url(#${id('glow')})`}>
          <circle cx="0" cy="-9" r="13" />
          <path d="M -6.5 3.2 L -10 34 L 10 34 L 6.5 3.2" />
        </g>
        {!compact && (
          <text y="86" textAnchor="middle" fontSize="12" fontWeight="600" letterSpacing="0.34em" fill="#EECA7D" fillOpacity="0.85">
            DUBAI
          </text>
        )}
      </g>
    </svg>
  )
}
