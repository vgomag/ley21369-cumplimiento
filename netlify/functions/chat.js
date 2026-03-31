export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  /* ── Verificar autenticación via clave de acceso ── */
  const authToken = req.headers.get('x-auth-token') || '';
  const validKey = Netlify.env.get('ACCESS_KEY') || 'umag2024';
  if (!authToken || authToken !== validKey) {
    return json({ error: 'No autorizado — sesión requerida' }, 401);
  }

  try {
    const body = await req.json();

    /* ═══ MODO NORMAL — Claude ═══ */
    const key = Netlify.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'API key no configurada' }, 500);

    /* Si el cliente pide streaming */
    if (body.stream) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-20250514',
          max_tokens: body.max_tokens || 2000,
          system: body.system,
          messages: body.messages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.text();
        return new Response(errData, { status: res.status, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    /* Modo sin streaming */
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: body.max_tokens || 2000,
        system: body.system,
        messages: body.messages,
      }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};

function json(d, s) { return new Response(JSON.stringify(d), { status: s||200, headers: { 'Content-Type': 'application/json' } }); }

export const config = { path: '/.netlify/functions/chat' };
