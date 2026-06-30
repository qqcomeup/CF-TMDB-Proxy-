# TMDB Proxy - Cloudflare Workers 版本 AI写的代码

https://github.com/user-attachments/assets/d862ef34-a291-4c7f-aedc-62fd8d6410ac

<img width="893" height="824" alt="image" src="https://github.com/user-attachments/assets/080ebd4a-5cf8-4e13-916b-d892e473418b" />


## MoviePilot 快速说明

MP交流群：https://t.me/moviepilot_official （我是 咚咚咚）

部署后建议绑定自己的域名；Cloudflare 默认 workers.dev 预览域名在部分网络环境可能不可用。

MoviePilot 推荐配置：

```env
TMDB_API_DOMAIN=你的域名
TMDB_IMAGE_DOMAIN=你的域名
TMDB_API_KEY=你的TMDB_V3_KEY
```

同时在 MP 的安全图片域名 / `SECURITY_IMAGE_DOMAINS` 中加入你的域名，保存后重启 MP。

快速自测：

```bash
curl https://你的域名/health
curl "https://你的域名/3/configuration?api_key=你的TMDB_V3_KEY"
curl -I "https://你的域名/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg"
```

已知有效图片示例：

```text
原始：https://image.tmdb.org/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg
代理：https://你的域名/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg
```

> `poster.jpg` 只是占位符，不是 TMDB 真实图片路径，直接测试会返回 404。

### 本分支补强点

- 放宽 `/3/*`、`/4/*`、`/t/p/*` 的 User-Agent 拦截，避免误伤 MoviePilot 后端请求。
- 支持 `Authorization: Bearer <token>`，兼容 TMDB v4 Token。
- 新增 `/4/*` API 代理。
- `/3/configuration*` 自动把图片域名重写到当前代理域名 `/t/p/`。
- 图片代理不再手动透传 `Content-Length`，API JSON 不再透传上游 `Content-Encoding`。
- 修正 Cloudflare 一键部署链接。

<img width="1403" height="972" alt="image" src="https://github.com/user-attachments/assets/bd89a46f-806d-4626-980a-08b8ff38467c" />
<img width="1378" height="1209" alt="image" src="https://github.com/user-attachments/assets/d194d295-93f5-487c-9efe-87d34f71f09b" />
<img width="1177" height="620" alt="image" src="https://github.com/user-attachments/assets/c901411b-73b9-4c24-8026-79cd5040c900" />

## ✨ 功能特性

- API 代理：`/3/*`、`/4/*`
- 图片代理：`/t/p/*`
- `/3/configuration*` 图片域名自动重写
- 健康检查：`/health`、`/ping`
- 首页和无效请求伪装 404

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

> 注意：`poster.jpg` 只是占位符，不是 TMDB 真实图片路径，会返回 404。
> 可以使用下面这个已知有效的 TMDB 图片路径快速判断图片代理是否正常：
> `https://你的域名/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg`


```javascript
// 原始 TMDB 图片（真实存在的示例路径）
https://image.tmdb.org/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg

// 通过代理访问
https://your-worker.your-subdomain.workers.dev/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg
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
const imageUrl = 'https://your-worker.your-subdomain.workers.dev/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg';
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
curl -I https://your-worker.your-subdomain.workers.dev/t/p/original/aWTfsoyRQNKxvI2EOLOEPKyxDqr.jpg

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
