export const config = { runtime: 'edge' };

// Strict US detection. The ONLY trusted source is Vercel's own geo header,
// which is derived from the visitor's connecting IP and is overwritten by the
// platform on every request (a client cannot spoof it by sending its own).
//
// Deliberately no upstream-lookup fallback: calling a geo API from inside the
// edge function resolves the *edge node's* IP, not the visitor's, so a
// Bangladeshi visitor routed through a US node would be reported as 'US'.
// If the header is absent we report null and let the client fail closed.
export default async function handler(request: Request): Promise<Response> {
  const country = request.headers.get('x-vercel-ip-country');

  return Response.json(
    { country: country || null },
    {
      headers: {
        // Per-visitor response — must never be cached by the CDN or a shared
        // proxy, or one visitor's country gets served to the next.
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    },
  );
}
