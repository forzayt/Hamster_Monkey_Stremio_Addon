const express = require("express");
const { getRouter } = require("stremio-addon-sdk");
const addonInterface = require("./addon");

const app = express();
const PORT = process.env.PORT || 7000;

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

// Simple health/debug endpoint
app.get("/", (req, res) => {
  res.send(`
    <h1>PimpBunny Stremio Addon</h1>
    <p>Manifest: <a href="/manifest.json">/manifest.json</a></p>
    <p>Catalogs: Popular + categories (auto-fetched from pimpbunny.com).</p>
    <p>Install in Stremio using the manifest URL above.</p>
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Addon active on port ${PORT}`);
  console.log(`http://127.0.0.1:${PORT}/manifest.json`);
});
