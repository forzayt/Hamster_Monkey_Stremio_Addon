const express = require("express");
const axios = require("axios");
const { pipeline } = require("stream");
const { getRouter } = require("stremio-addon-sdk");
const addonInterface = require("./addon");

const app = express();
const PORT = process.env.PORT || 7000;
const HOST_URL = (
  process.env.HOST_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`
).replace(/\/+$/, "");

// Optional public CORS relay used only when PimpBunny cannot be reached from
// this host. Keep this configurable: public relays are not reliable enough to
// be the primary path for large, seekable video files.
const CORS_PROXY_URL = (process.env.CORS_PROXY_URL || "https://corsproxy.io/?url=").trim();

// Universal CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.static(__dirname));

// Stremio addon routes (/manifest.json, /catalog/..., /meta/..., /stream/...)
app.use("/", getRouter(addonInterface));

// ---------------------------------------------------------------------------
// Beautiful Tailwind CSS landing page
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  const manifestUrl = `${HOST_URL}/manifest.json`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PimpBunny Stremio Addon</title>
  <link rel="icon" href="https://pimpbunny.com/static/v2/images/popup/age-verification/age-verification.png" type="image/png">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
    .gradient-text { background: linear-gradient(135deg, #fbbf24 0%, #ef4444 50%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5); }
    .copy-btn:hover { background: #ef4444; transform: scale(1.05); }
  </style>
</head>
<body class="bg-slate-950 text-slate-200 antialiased overflow-x-hidden">

  <!-- Background mesh gradient -->
  <div class="fixed inset-0 -z-10">
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-pink-900/20 rounded-full blur-[120px]"></div>
    <div class="absolute top-1/3 right-1/6 w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-0 left-1/3 w-80 h-80 bg-orange-900/20 rounded-full blur-[120px]"></div>
  </div>

  <!-- Navbar -->
  <nav class="glass border-b border-slate-800/50 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gradient-to-br from-pink-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-red-500/30">
            PB
          </div>
          <span class="font-bold text-xl tracking-tight text-white">PimpBunny<span class="text-red-500">.com</span> Addon</span>
        </div>
        <div class="flex items-center gap-3">
          <a href="/manifest.json" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-red-500/25 border border-red-500/30">
            Manifest URL
          </a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="relative pt-20 pb-16 sm:pt-24 sm:pb-24 lg:pt-32 lg:pb-32">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-900/20 text-red-400 text-xs font-semibold mb-6">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        Live & Active
      </div>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
        Stream <span class="gradient-text">PimpBunny</span> in Stremio
      </h1>
      <p class="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
        Browse and stream videos from PimpBunny directly in Stremio. Categories, qualities, and streams auto-fetched from the site.
      </p>

      <!-- Manifest Card -->
      <div class="glass border border-slate-700 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl shadow-slate-900/50">
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Install via Manifest URL</p>
            <div class="flex gap-2">
              <input type="text" value="${manifestUrl}" readonly class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-red-500 outline-none select-all" />
              <button onclick="copyManifest()" class="copy-btn px-4 py-3 bg-slate-800 hover:bg-red-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-500/10 border border-slate-700">
                Copy
              </button>
            </div>
            <p class="text-xs text-slate-500 mt-2">Open Stremio → Addons → Install community addon → Paste this URL</p>
          </div>
          <div class="mt-4 sm:mt-0">
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                <span class="text-xs text-slate-400">Status: Online</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                <span class="text-xs text-slate-400">Version: 1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
        <div class="card-hover glass p-6 rounded-2xl border border-slate-800/50">
          <div class="w-10 h-10 bg-red-900/50 rounded-lg flex items-center justify-center text-red-500 mb-4">🔍</div>
          <h3 class="text-lg font-semibold text-white mb-2">Search</h3>
          <p class="text-sm text-slate-400">Search videos across all catalogs. Results update live from PimpBunny.</p>
        </div>
        <div class="card-hover glass p-6 rounded-2xl border border-slate-800/50">
          <div class="w-10 h-10 bg-red-900/50 rounded-lg flex items-center justify-center text-red-500 mb-4">🎬</div>
          <h3 class="text-lg font-semibold text-white mb-2">Multiple Qualities</h3>
          <p class="text-sm text-slate-400">360p, 480p, 720p, 1080p, 1440p — one stream per quality with direct MP4 URLs.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How to Install -->
  <section class="py-20 bg-slate-900/30 border-y border-slate-800/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">How to Install</h2>
        <p class="text-slate-400 max-w-xl mx-auto">Add PimpBunny to Stremio in three steps</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center p-6 rounded-2xl glass border border-slate-800/50">
          <div class="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4 text-slate-400">1</div>
          <h3 class="text-lg font-semibold text-white mb-2">Open Stremio</h3>
          <p class="text-sm text-slate-400">Launch Stremio and go to the Addons section.</p>
        </div>
        <div class="text-center p-6 rounded-2xl glass border border-slate-800/50">
          <div class="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4 text-slate-400">2</div>
          <h3 class="text-lg font-semibold text-white mb-2">Install Addon</h3>
          <p class="text-sm text-slate-400">Click "Install community addon" and paste the manifest URL.</p>
        </div>
        <div class="text-center p-6 rounded-2xl glass border border-slate-800/50">
          <div class="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4 text-slate-400">3</div>
          <h3 class="text-lg font-semibold text-white mb-2">Start Streaming</h3>
          <p class="text-sm text-slate-400">Browse categories and play videos directly in Stremio.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-slate-800/50 bg-slate-950 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-sm text-slate-500">
        PimpBunny Stremio Addon • Unofficial • Not affiliated with PimpBunny or Stremio
      </p>
      <div class="flex gap-4 text-sm">
        <a href="/manifest.json" class="text-slate-400 hover:text-white">Manifest</a>
        <span class="text-slate-600">•</span>
        <a href="#" class="text-slate-400 hover:text-white">Terms</a>
        <span class="text-slate-600">•</span>
        <a href="#" class="text-slate-400 hover:text-white">Privacy</a>
      </div>
    </div>
  </footer>

  <script>
    function copyManifest() {
      const input = document.querySelector('input[readonly]');
      input.select();
      document.execCommand('copy');
      const btn = document.querySelector('.copy-btn');
      const original = btn.innerText;
      btn.innerText = 'Copied!';
      btn.classList.add('bg-green-500');
      setTimeout(() => {
        btn.innerText = original;
        btn.classList.remove('bg-green-500');
      }, 2000);
    }
  </script>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// Debug endpoint: test fetching any URL through this server.
// Example: /debug/fetch?url=https://pimpbunny.com/categories/anal/
// ---------------------------------------------------------------------------
app.get("/debug/fetch", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");
  let u;
  try {
    u = new URL(targetUrl);
  } catch {
    return res.status(400).send("Invalid url");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeoutId);
    const body = await response.text();
    return res.json({
      status: response.status,
      url: u.href,
      contentType: response.headers.get("content-type") || "",
      contentLength: response.headers.get("content-length") || "",
      bytes: body.length,
      preview: body.replace(/\s+/g, " ").slice(0, 800),
    });
  } catch (e) {
    return res.status(502).json({
      error: e.message,
      status: e.response ? e.response.status : "network",
      url: u.href,
    });
  }
});

// ---------------------------------------------------------------------------
// Proxy for PimpBunny MP4/HLS streams.
// Allowed hosts: pimpbunny.com and phncdn.com (video CDN).
// ---------------------------------------------------------------------------
app.get("/proxy/stream", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");

  let u;
  try {
    u = new URL(targetUrl);
  } catch {
    return res.status(400).send("Invalid url");
  }
  const allowed =
    u.hostname === "pimpbunny.com" ||
    u.hostname.endsWith(".pimpbunny.com") ||
    u.hostname === "phncdn.com" ||
    u.hostname.endsWith(".phncdn.com");
  if (!allowed) {
    return res.status(403).send("Host not allowed");
  }

  try {
    const requestHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Referer: "https://pimpbunny.com/",
    };
    // Media players seek with byte ranges. Passing this through is essential
    // for MP4 playback and prevents buffering the whole file in this server.
    if (req.headers.range) requestHeaders.Range = req.headers.range;

    // Use Axios's Node stream rather than the built-in fetch implementation.
    // Some CDN/proxy responses have an incorrect Content-Length; Undici treats
    // that as a fatal stream error. Axios lets us report the failed playback
    // request cleanly without taking down the addon process.
    const fetchUpstream = (url, headers) =>
      axios({
        url,
        method: req.method === "HEAD" ? "head" : "get",
        headers,
        responseType: "stream",
        timeout: 25000,
        maxRedirects: 5,
        decompress: false,
        validateStatus: () => true,
      });

    let response;
    try {
      response = await fetchUpstream(targetUrl, requestHeaders);
      if (response.status < 200 || response.status >= 300) {
        response.data?.resume();
        throw new Error(`upstream ${response.status}`);
      }
    } catch (directError) {
      if (!CORS_PROXY_URL) throw directError;
      // corsproxy.io expects the original URL as the encoded query suffix.
      // Do not send a forged Referer to a third party proxy.
      response = await fetchUpstream(
        `${CORS_PROXY_URL}${encodeURIComponent(targetUrl)}`,
        req.headers.range ? { Range: req.headers.range } : {}
      );
      if (response.status < 200 || response.status >= 300) {
        response.data?.resume();
        throw new Error(`CORS proxy ${response.status}`);
      }
    }

    const contentType = response.headers["content-type"] || "";
    const isPlaylist = /\.m3u8/i.test(targetUrl) || /mpegurl/i.test(contentType);

    if (isPlaylist) {
      let body = "";
      for await (const chunk of response.data) body += chunk;
      const base = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      let text = body
        .replace(/URI="([^"]+)"/g, (_, uri) => {
          const abs = uri.startsWith("http") ? uri : new URL(uri, base).href;
          return `URI="${HOST_URL}/proxy/stream?url=${encodeURIComponent(abs)}"`;
        })
        .replace(/^(?!#)(\S+)\s*$/gm, (_, p) => {
          const abs = p.startsWith("http") ? p : new URL(p, base).href;
          return `${HOST_URL}/proxy/stream?url=${encodeURIComponent(abs)}`;
        });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Cache-Control", "no-store");
      return res.send(text);
    }

    res.status(response.status);
    res.setHeader("Content-Type", contentType || "video/mp2t");
    res.setHeader("Accept-Ranges", response.headers["accept-ranges"] || "bytes");
    // Do not forward Content-Length: faulty public proxies sometimes advertise
    // a length that does not match the stream they actually send.
    if (response.headers["content-range"]) {
      res.setHeader("Content-Range", response.headers["content-range"]);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    if (req.method === "HEAD" || !response.data) return res.end();
    return pipeline(response.data, res, (streamError) => {
      if (!streamError || res.destroyed) return;
      console.warn(`[proxy] stream interrupted: ${streamError.message}`);
      res.destroy(streamError);
    });
  } catch (err) {
    return res.status(404).send("Segment or playlist not found.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Addon active on port ${PORT}`);
  console.log(`${HOST_URL}/manifest.json`);
});
