// Cloudflare Pages Function: Agnes API 代理
// 路径: functions/v1/[[path]].js -> 处理所有 /v1/* 请求
// 作用: 从 Cloudflare 环境变量读取 API Key,转发到 Agnes,彻底避免 Key 暴露给前端

const AGNES_BASE = "https://apihub.agnes-ai.com/v1";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // /v1/chat/completions -> https://apihub.agnes-ai.com/v1/chat/completions
    const agnesUrl = AGNES_BASE + url.pathname.replace(/^\/v1/, "");

    let body = "";
    if (request.method === "POST") {
      body = await request.text();
    }

    // 从 Cloudflare 环境变量读取 Key(服务器端,不暴露给前端)
    const key = env.AGNES_API_KEY || "";

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    if (key) {
      headers.set("Authorization", "Bearer " + key);
    } else {
      // 兜底:如果环境变量没配,允许前端传 Key(仅开发环境用)
      const auth = request.headers.get("Authorization");
      if (auth) headers.set("Authorization", auth);
    }

    try {
      const resp = await fetch(agnesUrl, {
        method: request.method,
        headers,
        body: request.method === "POST" ? body : undefined,
      });

      // 透传响应
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
  },
};
