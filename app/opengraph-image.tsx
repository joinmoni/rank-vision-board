import { ImageResponse } from '@vercel/og';

export const alt = 'Rank - 2026 Vision Board';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#FAF5F0',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            fontWeight: 900,
            color: '#FF7A00',
            textAlign: 'center',
            marginBottom: '30px',
            letterSpacing: '-0.02em',
          }}
        >
          Rank
        </div>
        <div
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#1A1310',
            textAlign: 'center',
            marginBottom: '30px',
            lineHeight: '1.1',
          }}
        >
          Create Your 2026 Vision Board
        </div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 500,
            color: '#4A4441',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Simply type in your goals below. We will instantly transform them into a stunning image to keep you focused all year.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

