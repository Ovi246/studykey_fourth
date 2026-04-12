export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const headerCountry = request.headers.get('x-vercel-ip-country');
  if (headerCountry) {
    return Response.json({ country: headerCountry });
  }

  try {
    const res = await fetch('https://api.country.is/', { cache: 'no-store' });
    const data = await res.json();
    return Response.json({ country: data?.country ?? null });
  } catch {
    return Response.json({ country: null });
  }
}
