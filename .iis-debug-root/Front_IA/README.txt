IIS static package ready.

Target path expected:
- Front_IA as IIS site or IIS application path

What to publish:
- Copy all contents of this folder into the IIS physical path for Front_IA

Required IIS notes:
1. Enable Default Document with index.html
2. Publish this package as the physical directory of Front_IA
3. The frontend is baked to run under /Front_IA
4. This package now avoids optional IIS modules for maximum compatibility

Backend:
- API URL is embedded at build time from .env.production / NEXT_PUBLIC_API_URL

Build command:
- pnpm run build:iis
