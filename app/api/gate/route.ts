export async function POST(req: Request) {
  const { pw } = await req.json();
  if (pw && pw === process.env.APP_PASSWORD) {
    return new Response("OK", { headers: { "set-cookie": `app_auth=${pw}; Path=/; HttpOnly; SameSite=Lax` } });
  }
  return new Response("NO", { status: 401 });
}
