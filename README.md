# TMDB Proxy - Cloudflare Workers 版本 AI写的代码

## 🆕 harden-mp-compat 分支更新说明

本分支主要面向 MoviePilot 使用场景做兼容性和稳定性补强：

- 放宽 User-Agent 拦截策略：`/3/*`、`/4/*`、`/t/p/*` 不再拦截 `python/curl/wget`，避免误伤 MoviePilot 后端请求。
- 支持 TMDB v4 Token：可通过 `Authorization: Bearer <token>` 访问 `/3/*`、`/4/*` 和 `/admin/status`。
- 扩展 API 代理范围：除 `/3/*` 外，新增 `/4/*` 代理。
- 保留 `/3/configuration*` 图片域名重写逻辑，返回的 `images.base_url` / `secure_base_url` 会指向当前代理域名 `/t/p/`。
- 图片代理响应不再手动透传 `Content-Length`，避免 Cloudflare Workers 图片优化或压缩后长度不一致。
- API JSON 响应不再透传上游 `Content-Encoding`，避免 Worker 已读取文本后出现重复编码标记。
- 修正 README 中 Cloudflare 一键部署链接，指向当前仓库。
- 新增 MoviePilot 配置示例，说明 `TMDB_API_DOMAIN`、`TMDB_IMAGE_DOMAIN`、`TMDB_API_KEY` 和安全图片域名配置。

建议测试：

```bash
curl https://你的域名/health
curl "https://你的域名/3/configuration?api_key=你的TMDB_V3_KEY"
curl -I "https://你的域名/t/p/w500/示例图片路径.jpg"
```

MoviePilot 推荐配置：

```env
TMDB_API_DOMAIN=你的域名
TMDB_IMAGE_DOMAIN=你的域名
TMDB_API_KEY=你的TMDB_V3_KEY
```


MP交流群：https://t.me/moviepilot_official （我是 咚咚咚）

部署好绑定自己域名后 必须绑定自己域名 必须绑定自己域名 必须绑定自己域名 CF给的预览域名自带墙！
记得在路径 MOVIEPILOT v2 设定-系统-高级设置-添加上去 xx.org  与网络-安全域名里面 也需要添加上去保存-保存-重启MP应用

自定义api https://www.themoviedb.org/settings/api 自助注册申请
API 密钥 MP环境上填写如下参数，有效提高TMDB请求率。
- 'TMDB_API_KEY=xxx'

<img width="1403" height="972" alt="image" src="https://github.com/user-attachments/assets/bd89a46f-806d-4626-980a-08b8ff38467c" />
<img width="1378" height="1209" alt="image" src="https://github.com/user-attachments/assets/d194d295-93f5-487c-9efe-87d34f71f09b" />



2025-11-18 MP更新认证资源版本2.4.3不然会报错 ,cf炸了会导致代理失效

## 🆕 2025-11-16 更新

- 兼容 **神医插件/Emby 识别** 场景：`server.js` 与 `worker.js` 新增 `rewriteTmdbConfigImages`，会自动把 `/3/configuration*` 中的 `images.base_url / secure_base_url` 重写为代理域名下的 `/t/p/`，搜索结果缩图将直接命中代理。
- Node 版本放宽 `Cross-Origin-Resource-Policy`，Cloudflare Workers 也同步在 `corsHeaders` 里设置 `cross-origin`，保证前端可跨站加载图片，不再出现破图。
- Cloudflare Workers 版本同样复用新的 CORS 头

<img width="1177" height="620" alt="image" src="https://github.com/user-attachments/assets/c901411b-73b9-4c24-8026-79cd5040c900" />


🎬 基于 Cloudflare Workers 的 TMDB (The Movie Database) 代理服务，提供图片和 API 代理功能，具备安全伪装、智能缓存和全球 CDN 加速。

## ✨ 功能特性

- 🔒 **安全伪装**: 主页显示 404 页面，隐藏真实服务
- 🖼️ **图片代理**: 支持 WebP/AVIF 格式，7天缓存
- 🔌 **API 代理**: 智能缓存策略，5分钟到1小时不等
- 🌍 **全球 CDN**: Cloudflare 全球节点加速
- 🛡️ **安全防护**: API Key 保护，恶意爬虫检测
- 📊 **性能优化**: 图片压缩、自适应加载
- 🔍 **监控端点**: 健康检查和管理接口

## 🚀 快速部署

### 方法1: Cloudflare Workers Dashboard

1. **登录 Cloudflare Dashboard**
   - 访问 [Cloudflare Workers](https://workers.cloudflare.com/)
   - 登录你的 Cloudflare 账户

2. **创建新的 Worker**
3. 如下图<img width="2808" height="628" alt="image" src="https://github.com/user-attachments/assets/dbac6a29-3c9e-45c2-adff-a94608b1af60" />
   - 点击 "创建应用"
   - 输入服务名称（如：`tmdb-proxy`）
   - 选择 "从 Hello World! 开始" 模板
   - 部署

4. **部署代码**
5. - 编辑代码
   - 将 `worker.js` 的内容复制到编辑器中
   - 点击 "部署"

### 方法2: Wrangler CLI

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建新项目
wrangler init tmdb-proxy

# 复制 worker.js 内容到 src/index.js
# 部署到 Cloudflare Workers
wrangler deploy
```

### 方法3: 一键部署

**注意**: 使用一键部署前，请确保你的 GitHub 仓库包含以下文件：
- `worker.js` - 主要代码文件
- `wrangler.toml` - Wrangler 配置文件
- `package.json` - 项目配置文件

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/qqcomeup/CF-TMDB-Proxy-)

如果遇到 "找不到 wrangler.toml 文件" 的错误，请先将本项目的所有文件上传到你的 GitHub 仓库。

## 📖 使用方法

### 图片代理

```javascript
// 原始 TMDB 图片
https://image.tmdb.org/t/p/w500/poster.jpg

// 通过代理访问
https://your-worker.your-subdomain.workers.dev/t/p/w500/poster.jpg
```

### API 代理

需要提供有效的 TMDB API Key：

```javascript
// 方法1: 使用 Header
fetch('https://your-worker.your-subdomain.workers.dev/3/movie/popular', {
  headers: {
    'X-API-Key': 'your_tmdb_api_key'
  }
})

// 方法2: 使用 URL 参数
https://your-worker.your-subdomain.workers.dev/3/movie/popular?api_key=your_tmdb_api_key

// 方法3: 使用简短参数
https://your-worker.your-subdomain.workers.dev/3/movie/popular?key=your_tmdb_api_key
```

### JavaScript 示例

```javascript
// 图片使用
const imageUrl = 'https://your-worker.your-subdomain.workers.dev/t/p/w500/poster.jpg';
document.getElementById('poster').src = imageUrl;

// API 调用
async function getPopularMovies() {
  try {
    const response = await fetch('https://your-worker.your-subdomain.workers.dev/3/movie/popular', {
      headers: {
        'X-API-Key': 'your_tmdb_api_key'
      }
    });
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## 🔧 管理端点

### 健康检查

```bash
# 基础健康检查（无需 API Key）
curl https://your-worker.your-subdomain.workers.dev/health

# 或者
curl https://your-worker.your-subdomain.workers.dev/ping
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": "active"
}
```

### 服务状态（需要 API Key）

```bash
curl -H "X-API-Key: your_tmdb_api_key" \
     https://your-worker.your-subdomain.workers.dev/admin/status
```

响应示例：
```json
{
  "status": "active",
  "version": "2.0.0",
  "endpoints": {
    "images": "/t/p/{size}/{path}",
    "api": "/3/{endpoint}"
  },
  "client_info": {
    "ip": "1.2.3.4",
    "country": "US",
    "ua": "Mozilla/5.0..."
  },
  "security": {
    "api_key_provided": true,
    "request_secure": true
  },
  "performance": {
    "cache_enabled": true,
    "compression": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```


## MoviePilot 兼容性建议

推荐在 MP 中配置：

```env
TMDB_API_DOMAIN=你的自定义域名
TMDB_IMAGE_DOMAIN=你的自定义域名
TMDB_API_KEY=你的 TMDB v3 API Key
```

并在安全域名 / SECURITY_IMAGE_DOMAINS 中加入该自定义域名。

本分支补强点：
- 不再拦截 `/3/*`、`/4/*`、`/t/p/*` 的 `python/curl/wget` User-Agent，避免误伤 MoviePilot 后端请求。
- 支持 `Authorization: Bearer`，兼容 TMDB v4 Token。
- `/3/configuration*` 会把 TMDB 图片域名重写到当前代理域名。
- 图片代理不再手动透传 `Content-Length`，避免 Workers 压缩/优化后长度不一致。
- API JSON 响应不再透传上游 `Content-Encoding`，避免已读取文本后重复编码标记。

## 📊 缓存策略

| 端点类型 | 缓存时间 | 说明 |
|---------|---------|------|
| 图片 (`/t/p/*`) | 7天 | 强缓存，支持 ETag |
| 配置 (`/3/configuration*`) | 1小时 | 配置信息变化较少 |
| 搜索 (`/3/search*`) | 5分钟 | 搜索结果实时性要求高 |
| 热门 (`/3/movie/popular*`) | 30分钟 | 热门内容更新频率中等 |
| 其他 API (`/3/*`) | 10分钟 | 默认缓存时间 |

## 🛡️ 安全特性

### API Key 保护
- 支持多种 API Key 传递方式
- 自动验证 API Key 格式（32位字符）
- 无效请求返回伪装 404 页面

### 恶意爬虫检测
```javascript
// 检测的 User-Agent 关键词
['curl', 'wget', 'python', 'scrapy', 'spider']

// 允许的搜索引擎爬虫
['googlebot'] // Google 爬虫除外
```

### 地理位置控制
```javascript
// 可配置屏蔽的国家/地区
const blockedCountries = []; // 在代码中自定义
```

### 404 伪装页面
- 主页和错误请求都显示逼真的 404 页面
- 开发者控制台显示真实服务信息
- 提供隐藏的测试函数

## 🎯 测试方法

部署成功后，打开浏览器开发者控制台进行测试：

```javascript
// 在浏览器控制台中运行

// 测试 API（需要先设置 API Key）
testAPI()

// 测试图片加载
testImage()
```

或使用 curl 命令：

```bash
# 1. 健康检查
curl https://your-worker.your-subdomain.workers.dev/health

# 2. 图片代理测试
curl -I https://your-worker.your-subdomain.workers.dev/t/p/w500/bcP7FtskwsNp1ikpMQJzDPjofP5.jpg

# 3. API 代理测试（需要 API Key）
curl -H "X-API-Key: your_api_key" \
     https://your-worker.your-subdomain.workers.dev/3/configuration

# 4. 主页测试（应该显示 404）
curl https://your-worker.your-subdomain.workers.dev/
```

## 📝 配置说明

### 获取 TMDB API Key

1. 访问 [TMDB 官网](https://www.themoviedb.org/)
2. 注册账户并登录
3. 进入 [API 设置页面](https://www.themoviedb.org/settings/api)
4. 申请 API Key（通常几分钟内批准）

### 自定义域名（可选）

1. 在 Cloudflare Workers 中添加自定义域名
2. 配置 DNS 记录指向 Workers
3. 启用 SSL/TLS 加密

## 🔍 故障排除

### 常见问题

**Q: 主页显示 404 是正常的吗？**
A: 是的，这是安全伪装功能。真实的服务信息在浏览器开发者控制台中。

**Q: API 请求返回 404**
A: 检查是否提供了有效的 TMDB API Key，支持 Header 和 URL 参数两种方式。

**Q: 图片加载失败**
A: 确认图片路径正确，TMDB 图片路径格式为 `/t/p/{size}/{file_path}`。

**Q: 如何查看详细错误信息？**
A: 在 Cloudflare Workers Dashboard 中查看实时日志。

### 性能优化建议

1. **启用 Cloudflare 缓存**: 在 Workers 设置中启用缓存
2. **使用 WebP 格式**: 现代浏览器自动获得 WebP 格式图片
3. **合理设置缓存**: 根据数据更新频率调整缓存时间
4. **监控使用量**: 关注 Workers 的请求量和响应时间

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交Pull Request！

## 📞 支持

- GitHub Issues: [提交问题](https://github.com/qqcomeup/cf-tmdb/issues)
- TMDB API 文档: [官方文档](https://developers.themoviedb.org/3)
- Cloudflare Workers 文档: [官方文档](https://developers.cloudflare.com/workers/)

---

⭐ 如果这个项目对你有帮助，请给个 Star！
