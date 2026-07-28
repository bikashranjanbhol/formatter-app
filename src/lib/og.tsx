import { ImageResponse } from 'next/og';
import { SITE_NAME } from './config';

/**
 * Shared Open Graph / Twitter card renderer. Produces a real 1200×630 PNG at
 * request time via next/og, so links unfurl with a branded image instead of
 * plain text. Uses only inline styles (required by Satori/next-og) and the
 * built-in font, so no network font fetch is needed.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export function renderOgImage(options: { title: string; subtitle: string; badge?: string }) {
  const { title, subtitle, badge } = options;
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        backgroundColor: '#020617',
        backgroundImage:
          'radial-gradient(900px 600px at 100% 0%, rgba(49,123,255,0.35), transparent 60%), radial-gradient(700px 500px at 0% 100%, rgba(124,58,237,0.28), transparent 55%)',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Brand row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #307bff, #1447e1)',
            fontSize: '38px',
            fontWeight: 700,
          }}
        >
          {'{}'}
        </div>
        <div style={{ display: 'flex', fontSize: '30px', fontWeight: 600, color: '#cbd5e1' }}>
          {SITE_NAME}
        </div>
      </div>

      {/* Title block */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {badge ? (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '8px 18px',
              marginBottom: '24px',
              borderRadius: '9999px',
              border: '1px solid rgba(148,163,184,0.4)',
              color: '#93c5fd',
              fontSize: '24px',
            }}
          >
            {badge}
          </div>
        ) : null}
        <div style={{ display: 'flex', fontSize: '68px', fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: '24px',
            fontSize: '30px',
            color: '#94a3b8',
            maxWidth: '900px',
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Footer row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '24px',
          color: '#22c55e',
        }}
      >
        <div style={{ display: 'flex' }}>🔒 Processed locally in your browser</div>
      </div>
    </div>,
    { ...OG_SIZE },
  );
}
