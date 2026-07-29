// Cloudflare Pages Function: /v1/* 路由中间件
// 处理所有 /v1/* 请求,转发到 Agnes API
// 使用 onRequest 格式确保 wrangler 能正确识别

const AGNES_BASE = "https://apihub.agnes-ai.com/v1";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // /v1/chat/completions -> https://apihub.agnes-ai.com/v1/chat/completions
  const agnesUrl = AGNES_BASE + url.pathname.replace(/^\/v1/, "");

  let body = "";
  if (request.method === "POST") {
    body = await request.text();
  }

  // 从 Cloudflare 环境变量读取 Key
  const key = env.AGNES_API_KEY || "";

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (key) {
    headers.set("Authorization", "Bearer " + key);
  } else {
    const auth = request.headers.get("Authorization");
    if (auth) headers.set("Authorization", auth);
  }

  try {
    const resp = await fetch(agnesUrl, {
      method: request.method,
      headers,
      body: request.method === "POST" ? body : undefined,
    });

    const outHeaders = new Headers();
    for (const [k, v] of resp.headers) {
      if (!["transfer-encoding", "content-encoding", "strict-transport-security", "set-cookie"].includes(k.toLowerCase())) {
        outHeaders.set(k, v);
      }
    }
    outHeaders.set("Access-Control-Allow-Origin", "*");
    outHeaders.set("Cache-Control", "no-cache");

    return new Response(await resp.text(), {
      status: resp.status,
      headers: outHeaders,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: "代理转发失败: " + e.message } }),
      { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 处理 CORS 预检
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
