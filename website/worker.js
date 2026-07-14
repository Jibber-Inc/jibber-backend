const APP_CLIP_IDS = [
  'LSXDX8B86V.com.Jibber-Inc.iOS.Clip',
  'LSXDX8B86V.com.Jibber-Inc.iOS-staging.Clip',
];

const AASA = JSON.stringify({
  applinks: {
    details: [
      {
        appIDs: [
          'LSXDX8B86V.com.Jibber-Inc.iOS',
          'LSXDX8B86V.com.Jibber-Inc.iOS-staging',
        ],
        components: [{ '/': '/*' }],
      },
    ],
  },
  appclips: {
    apps: APP_CLIP_IDS,
  },
  webcredentials: {
    apps: [
      'LSXDX8B86V.com.Jibber-Inc.iOS',
      'LSXDX8B86V.com.Jibber-Inc.iOS-staging',
    ],
  },
});

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111111">
  <title>Jibber</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b0b0d; color: #fff; }
    main { width: min(560px, calc(100% - 40px)); padding: 48px 32px; text-align: center; background: #17171b; border: 1px solid #2a2a30; border-radius: 28px; }
    h1 { margin: 0 0 12px; font-size: clamp(42px, 10vw, 72px); letter-spacing: -0.06em; }
    p { margin: 0 auto; max-width: 34rem; color: #b6b6bf; font-size: 18px; line-height: 1.5; }
    .mark { display: inline-grid; place-items: center; width: 64px; height: 64px; margin-bottom: 24px; border-radius: 20px; background: #fff; color: #111; font-size: 32px; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <div class="mark">J</div>
    <h1>Jibber</h1>
    <p>Open this link on your iPhone to continue in Jibber.</p>
  </main>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (
      url.pathname === '/.well-known/apple-app-site-association' ||
      url.pathname === '/apple-app-site-association'
    ) {
      return new Response(AASA, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return new Response(HTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  },
};
