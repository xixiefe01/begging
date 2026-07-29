// Cloudflare Pages Function: /health 诊断端点

export async function onRequest(context) {
  const { env } = context;
  const hasKey = !!(env.AGNES_API_KEY && env.AGNES_API_KEY.length > 5);
  const keyLen = env.AGNES_API_KEY ? env.AGNES_API_KEY.length : 0;
  return new Response(
    JSON.stringify({
      status: "ok",
      env: {
        AGNES_API_KEY_present: hasKey,
        AGNES_API_KEY_length: keyLen,
        AGNES_API_BASE_URL: env.AGNES_API_BASE_URL || "/v1",
        AGNES_MODEL: env.AGNES_MODEL || "agnes-2.0-flash",
      },
      message: hasKey ? "环境变量配置正常" : "⚠️ AGNES_API_KEY 未配置",
    }, null, 2),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    }
  );
}
