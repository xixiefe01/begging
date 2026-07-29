// Cloudflare Pages Function: 健康检查 / 诊断
// 访问 /health 查看环境变量是否正确注入
export default {
  async fetch(request, env) {
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
        message: hasKey ? "环境变量配置正常" : "⚠️ AGNES_API_KEY 未配置!请在 Cloudflare Pages Settings → Environment variables 中添加",
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  },
};
