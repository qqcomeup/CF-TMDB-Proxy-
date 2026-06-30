// TMDB Proxy - 最终简化版 (伪装404页面)
// 直接上传到Cloudflare Worker，无需配置文件

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const search = url.search;

    // CORS 头部
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    };

    function rewriteConfigImages(payload) {
      if (!payload || typeof payload !== 'object' || !payload.images) return payload;
      const origin = url.origin.replace(/\/$/, '');
      const proxyBase = `${origin}/t/p/`;
      payload.images.base_url = proxyBase;
      payload.images.secure_base_url = proxyBase;
      return payload;
    }

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // 从请求中获取 API Key，兼容 TMDB v3 api_key 与 v4 Bearer Token。
    const authHeader = request.headers.get('Authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const API_KEY = request.headers.get('X-API-Key') ||
                   url.searchParams.get('api_key') ||
                   url.searchParams.get('key');

    // 增强安全检查
    const userAgent = request.headers.get('User-Agent') || '';
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const country = request.cf?.country || 'unknown';

    // 检测恶意爬虫：只保护根路径/管理路径，不拦截 /3/* 和 /t/p/*，避免误伤 MoviePilot 后端请求。
    const protectedPath = pathname === '/' || pathname === '' || pathname.startsWith('/admin/');
    const suspiciousUA = ['scrapy', 'spider'];
    const lowerUA = userAgent.toLowerCase();
    const isSuspicious = suspiciousUA.some(ua => lowerUA.includes(ua));

    if (protectedPath && ((lowerUA.includes('bot') && !lowerUA.includes('googlebot')) || isSuspicious)) {
      return new Response(getFake404HTML(), { status: 404, headers: { 'Content-Type': 'text/html', ...corsHeaders } });
    }

    // 简单的地理位置检查（可选）
    const blockedCountries = []; // 可以添加需要屏蔽的国家代码
    if (blockedCountries.includes(country)) {
      return new Response(getFake404HTML(), { status: 404, headers: { 'Content-Type': 'text/html', ...corsHeaders } });
    }

    // 隐藏管理端点 - 需要有效的API Key
    if (pathname === '/admin/status' && ((API_KEY && API_KEY.length === 32) || bearerToken)) {
      return new Response(JSON.stringify({
        status: 'active',
        version: '2.0.0',
        endpoints: { images: '/t/p/{size}/{path}', api: '/3/{endpoint}' },
        client_info: { ip: clientIP, country: country, ua: userAgent.substring(0, 50) },
        security: { api_key_provided: true, request_secure: true },
        performance: { cache_enabled: true, compression: true },
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 健康检查端点（无需API Key）
    if (pathname === '/health' || pathname === '/ping') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 'active'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 根路径 - 伪装404页面
    if (pathname === '/' || pathname === '') {
      return new Response(getFake404HTML(), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
      });
    }

    // 图片代理 /t/p/*
    if (pathname.startsWith('/t/p/')) {
      try {
        const imageUrl = `https://image.tmdb.org${pathname}`;

        // 检测客户端支持的图片格式
        const acceptHeader = request.headers.get('Accept') || '';
        const supportsWebP = acceptHeader.includes('image/webp');
        const supportsAVIF = acceptHeader.includes('image/avif');
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TMDB-Proxy/1.0)',
            'Accept': 'image/*',
          },
          cf: { 
            cacheTtl: 604800, // 7天缓存
            cacheEverything: true,
            polish: 'lossy', // 图片压缩
            mirage: true, // 自适应图片
          },
        });

        if (!response.ok) {
          return new Response(getFake404HTML(), {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
          });
        }

        return new Response(response.body, {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=604800, immutable', // 7天强缓存
            'ETag': response.headers.get('ETag'),
            'Last-Modified': response.headers.get('Last-Modified'),
            'Vary': 'Accept-Encoding',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(getFake404HTML(), {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
        });
      }
    }

    // API代理 /3/* 和 /4/*
    if (pathname.startsWith('/3/') || pathname.startsWith('/4/')) {
      // 检查是否提供了API Key
      if (!API_KEY && !bearerToken) {
        return new Response(getFake404HTML(), {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
        });
      }

      try {
        let apiUrl = `https://api.tmdb.org${pathname}${search}`;

        if (!bearerToken && !search.includes('api_key=')) {
          const separator = search ? '&' : '?';
          apiUrl += `${separator}api_key=${API_KEY}`;
        }

        const upstreamHeaders = {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br'
        };
        if (bearerToken) {
          upstreamHeaders.Authorization = `Bearer ${bearerToken}`;
        }

        const response = await fetch(apiUrl, {
          method: request.method,
          headers: upstreamHeaders,
          cf: {
            cacheTtl: 300, // 5分钟缓存
            cacheEverything: true,
          },
        });

        let responseText = await response.text();

        // 智能缓存控制
        const cacheTime = pathname.includes('configuration') ? 3600 : // 配置1小时
                         pathname.includes('search') ? 300 :           // 搜索5分钟
                         pathname.includes('popular') ? 1800 :         // 热门30分钟
                         600; // 默认10分钟

        if (pathname.startsWith('/3/configuration')) {
          try {
            const json = JSON.parse(responseText);
            responseText = JSON.stringify(rewriteConfigImages(json));
          } catch (err) {
            // 如果解析失败则保持原样
          }
        }

        return new Response(responseText, {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${cacheTime}`,
            'Vary': 'Accept-Encoding',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // 其他路径返回404
    return new Response(getFake404HTML(), { 
      status: 404, 
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders } 
    });
  },
};

// 伪装的404页面
function getFake404HTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 Not Found</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa; color: #212529; line-height: 1.6; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
        }
        .error-container { text-align: center; max-width: 600px; padding: 2rem; }
        .error-code { font-size: 8rem; font-weight: 300; color: #6c757d; margin-bottom: 1rem; line-height: 1; }
        .error-title { font-size: 2rem; font-weight: 400; color: #495057; margin-bottom: 1rem; }
        .error-message { font-size: 1.1rem; color: #6c757d; margin-bottom: 2rem; }
        .error-details {
            background: #e9ecef; border-radius: 8px; padding: 1rem; margin: 1.5rem 0;
            font-family: 'Courier New', monospace; font-size: 0.9rem; color: #495057; text-align: left;
        }
        .back-link {
            display: inline-block; padding: 0.75rem 1.5rem; background: #007bff; color: white;
            text-decoration: none; border-radius: 4px; transition: background-color 0.2s;
        }
        .back-link:hover { background: #0056b3; }
        .footer { margin-top: 3rem; font-size: 0.9rem; color: #adb5bd; }
        .server-info { margin-top: 1rem; font-size: 0.8rem; color: #ced4da; }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-code">404</div>
        <h1 class="error-title">Page Not Found</h1>
        <p class="error-message">The requested resource could not be found on this server.</p>

        <div class="error-details">
            <strong>Error Details:</strong><br>
            • Request Method: GET<br>
            • Request URL: ${new Date().toISOString().split('T')[0]}<br>
            • Server: Cloudflare Workers<br>
            • Timestamp: ${new Date().toISOString()}
        </div>

        <p style="color: #6c757d; margin: 1.5rem 0;">
            If you believe this is an error, please contact the site administrator.
        </p>

        <a href="javascript:history.back()" class="back-link">← Go Back</a>

        <div class="footer">
            <p>This page was generated automatically.</p>
            <div class="server-info">Server: Cloudflare Workers | Error Code: HTTP_404_NOT_FOUND</div>
        </div>
    </div>

    <script>
        // 隐藏的开发者工具信息
        console.log('%c🎬 TMDB Proxy Service v2.0', 'color: #007bff; font-size: 16px; font-weight: bold;');
        console.log('%cService Status: ✅ Active (Enhanced)', 'color: #28a745;');
        console.log('%cEndpoints:', 'color: #6c757d;');
        console.log('  • Images: /t/p/{size}/{path} (7-day cache, WebP/AVIF support)');
        console.log('  • API: /3/{endpoint} (Smart cache 5min-1hr)');
        console.log('  • Health: /health, /ping');
        console.log('  • Admin: /admin/status (requires API key)');
        console.log('%cAPI Key Methods:', 'color: #17a2b8;');
        console.log('  • Header: X-API-Key: your_api_key');
        console.log('  • URL Param: ?api_key=your_api_key');
        console.log('  • URL Param: ?key=your_api_key');
        console.log('%cFeatures: Cache, Compression, Security, Geo-blocking', 'color: #28a745;');
        console.log('%c⚠️ Disguised as 404 for security', 'color: #ffc107;');

        // 隐藏测试函数
        window.testAPI = () => fetch('/3/configuration').then(r=>r.json()).then(console.log);
        window.testImage = () => { const i=new Image(); i.onload=()=>console.log('✅ Image OK'); i.onerror=()=>console.log('❌ Image failed'); i.src='/t/p/w500/bcP7FtskwsNp1ikpMQJzDPjofP5.jpg'; };
        console.log('%cTest: testAPI() | testImage()', 'color: #17a2b8;');
    </script>
</body>
</html>`;
}
