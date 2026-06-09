import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'c0den4mes — real-time multiplayer codenames'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
        }}
      >
        {/* Glow blobs */}
        <div style={{
          position: 'absolute',
          left: '22%',
          top: '30%',
          width: 300,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.25)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute',
          right: '22%',
          top: '30%',
          width: 300,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.25)',
          filter: 'blur(80px)',
        }} />

        {/* Skull */}
        <div style={{ fontSize: 120, marginBottom: 20 }}>💀</div>

        {/* Title */}
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, letterSpacing: '-2px' }}>
          <span style={{ color: '#ef4444', textShadow: '0 0 40px rgba(239,68,68,0.8)' }}>c</span>
          <span style={{ color: '#ffffff' }}>0de</span>
          <span style={{ color: '#3b82f6', textShadow: '0 0 40px rgba(59,130,246,0.8)' }}>n</span>
          <span style={{ color: '#ffffff' }}>4mes</span>
        </div>

        {/* Subtitle */}
        <div style={{ color: '#52525b', fontSize: 28, marginTop: 16, letterSpacing: '6px', textTransform: 'uppercase' }}>
          real-time multiplayer codenames
        </div>
      </div>
    ),
    { ...size }
  )
}
