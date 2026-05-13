import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') ?? 'hangout-friends'
  const sub = searchParams.get('sub') ?? ''
  const cta = searchParams.get('cta') ?? 'Tap to respond'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <svg
          style={{ position: 'absolute', inset: 0, opacity: 0.06 }}
          width="1200"
          height="630"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1200" height="630" fill="url(#grid)" />
        </svg>

        {/* Accent glow */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '480px',
            height: '480px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* App name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              background: '#4f46e5',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '4px', opacity: 0.9 }} />
          </div>
          <span style={{ color: '#a1a1aa', fontSize: '20px', letterSpacing: '0.02em' }}>
            hangout-friends
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: title.length > 40 ? '48px' : '60px',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          {sub && (
            <div style={{ color: '#71717a', fontSize: '28px', lineHeight: 1.3, maxWidth: '800px' }}>
              {sub}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: '22px',
              fontWeight: 600,
              padding: '14px 32px',
              borderRadius: '14px',
              letterSpacing: '0.01em',
            }}
          >
            {cta}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
