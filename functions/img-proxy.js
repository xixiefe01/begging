// Cloudflare Pages Function: /img-proxy
// 代理 Agnes CDN 图片,解决 html2canvas 截图 CORS 问题

const ALLOWED_HOSTS = ["agnes-ai.space", "agnes-ai.com"];

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return new Response("Missing url param", { status: 400 });
  }

  try {
    const targetUrl = new URL(target);
    const host = targetUrl.hostname;
    if (!ALLOWED_HOSTS.some((h) => host.endsWith(h))) {
      return new Response("Host not allowed: " + host, { status: 403 });
    }

    const resp = await fetch(target, {
      headers: { "User-Agent": "BeggingBot/1.0 (+Cloudflare Pages)" },
    });

    const outHeaders = new Headers();
    const ct = resp.headers.get("Content-Type") || "image/png";
    outHeaders.set("Content-Type", ct);
    outHeaders.set("Access-Control-Allow-Origin", "*");
    outHeaders.set("Cache-Control", "public, max-age=86400");

    return new Response(await resp.arrayBuffer(), {
      status: resp.status,
      headers: outHeaders,
    });
  } catch (e) {
    return new Response("IMG ERR: " + e.message, { status: 502 });
  }
}
