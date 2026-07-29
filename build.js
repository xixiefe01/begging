// Cloudflare Pages 部署脚本
// 读取 Cloudflare 环境变量，生成前端需要的 env.js
const fs = require('fs');
const path = require('path');

const apiKey = process.env.AGNES_API_KEY || '';
const baseUrl = process.env.AGNES_API_BASE_URL || '/v1';
const model = process.env.AGNES_MODEL || 'agnes-2.0-flash';

const envContent = `/* 自动生成 - 请勿手动修改 */
window.__ENV__ = {
  AGNES_API_KEY: "${apiKey}",
  AGNES_API_BASE_URL: "${baseUrl}",
  AGNES_MODEL: "${model}"
};`;

fs.writeFileSync(path.join(__dirname, 'env.js'), envContent);
console.log('✅ env.js 已通过环境变量注入生成');
