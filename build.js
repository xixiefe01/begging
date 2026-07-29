// Cloudflare Pages 部署脚本
// 读取 Cloudflare 环境变量,生成前端需要的 env.js
// 注意:API Key 由 Cloudflare Functions 在服务器端注入,env.js 里不需要存 Key
//       这样 Key 不会暴露到前端代码里,更安全
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.AGNES_API_BASE_URL || '/v1';
const model = process.env.AGNES_MODEL || 'agnes-2.0-flash';

const envContent = `/* 自动生成 - 请勿手动修改 */
/* API Key 由 Cloudflare Functions 服务器端注入,不在前端暴露 */
window.__ENV__ = {
  AGNES_API_KEY: "",
  AGNES_API_BASE_URL: "${baseUrl}",
  AGNES_MODEL: "${model}"
};`;

fs.writeFileSync(path.join(__dirname, 'env.js'), envContent);
console.log('✅ env.js 已生成(API Key 由 Cloudflare Functions 注入)');
console.log('   ⚠️  请确保已在 Cloudflare Pages 环境变量中配置 AGNES_API_KEY');
