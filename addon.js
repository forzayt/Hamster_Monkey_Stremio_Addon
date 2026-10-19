const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE = "https://pimpbunny.com";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: BASE + "/",
};

// Public base of this addon (for self-referencing URLs if needed).
const HOST_URL = (
  process.env.HOST_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${process.env.PORT || 7000}`
).replace(/\/+$/, "");

// Simple in-memory cache.
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchHtml(u) {
  const c = cache.get(u);
  if (c && Date.now() - c.t < CACHE_TTL) return c.d;
  const { data } = await axios.get(u, {
    headers,
    timeout: 25000,
    maxRedirects: 5,
  });
  cache.set(u, { d: data, t: Date.now() });
  return data;
}

function $load(html) {
  return cheerio.load(html);
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
function videoUrl(slug) {
  return `${BASE}/videos/${slug}/`;
}
function catUrl(slug, page) {
  return `${BASE}/categories/${slug}/?page=${page || 1}`;
}
function searchUrl(q, page) {
  const base = `${BASE}/search/${encodeURIComponent(q)}/`;
  return page > 1 ? base + `?page=${page}` : base;
}

function slugFromHref(href) {
  const m = String(href).match(/\/videos\/([^\/]+)\/?/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Categories (from pimpbunny.com/categories/)
// ---------------------------------------------------------------------------
const CATEGORIES = [
  ["bbc", "BBC"],
  ["anal", "Anal"],
  ["deep-throat", "Deep Throat"],
  ["bdsm", "BDSM"],
  ["bizarre", "Bizarre"],
  ["double-penetration", "Double Penetration"],
  ["feet", "Feet"],
  ["fetish", "Fetish"],
  ["gang-bang", "Gang Bang"],
  ["lesbian", "Lesbian"],
  ["outdoor", "Outdoor"],
  ["masturbation", "Masturbation"],
  ["threesome", "Threesome"],
  ["blowjob", "Blowjob"],
  ["sex", "Sex"],
  ["striptease", "Striptease"],
  ["seduction", "Seduction"],
  ["pawg", "PAWG"],
  ["bunnies", "Bunnies"],
  ["big-boobs", "Big Boobs"],
  ["exclusive", "Exclusive"],
  ["4k", "4K"],
  ["cosplay", "Cosplay"],
  ["asian", "Asian"],
  ["big-beautiful-women", "Big Beautiful Women"],
  ["milf", "MILF"],
  ["latina", "Latina"],
  ["teen", "Teen"],
  ["bwc", "BWC"],
  ["petite", "Petite"],
];

// ---------------------------------------------------------------------------
// Parse video entries from category / homepage / search page
// ---------------------------------------------------------------------------
async function parseVideoList(html) {
  const $ = $load(html);
  const metas = [];
  const seen = new Set();

  // Collect video links in DOM order
  const videoEntries = [];
  $("a.ui-card-link__KxRw6l").each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href");
    const slug = slugFromHref(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title =
      $a.attr("title") ||
      $a.find("img").attr("alt") ||
      $a.text().trim() ||
      `Video ${slug}`;

    videoEntries.push({ slug, title });
  });

  // Collect poster screenshot URLs in DOM order (from data-original attribute)
  const posterUrls = [];
  $("img[data-original*='videos_screenshots']").each((_, img) => {
    const src = $(img).attr("data-original");
    if (src && src.startsWith("http") && !posterUrls.includes(src)) {
      posterUrls.push(src);
    }
  });

  // Match posters to videos by order
  for (let i = 0; i < videoEntries.length; i++) {
    const entry = videoEntries[i];
    const poster = posterUrls[i] || "";

    metas.push({
      id: `pb:${entry.slug}`,
      type: "movie",
      name: entry.title,
      poster,
      description: "",
    });
  }

  console.log(`[pimpbunny] parseVideoList -> ${metas.length} videos found`);
  return metas;
}

// ---------------------------------------------------------------------------
// Parse a single video page -> title, poster, description, streams
// ---------------------------------------------------------------------------
// Stream URLs look like:
// https://pimpbunny.com/get_file/49/<hash>/<bucket>/<id>/<id>_720p.mp4/
// https://pimpbunny.com/get_file/49/<hash>/<bucket>/<id>/<id>_360p.mp4/?v-acctoken=...
const REGEX_STREAM = /https:\/\/[^"'\s<>]*?get_file[^"'\s<>]*?\.mp4[^"'\s<>]*/gi;
const REGEX_QUALITY = /_(\d+p)\.mp4/i;

async function parseVideoPage(slug) {
  const html = await fetchHtml(videoUrl(slug));
  const $ = $load(html);

  // --- Title ---
  let title =
    $("meta[property='og:title']").attr("content") ||
    $("title")
      .text()
      .replace(/\| PimpBunny$/i, "")
      .trim() ||
    "PimpBunny Video";

  // --- Poster ---
  let poster =
    $("meta[property='og:image']").attr("content") ||
    $("meta[name='twitter:image']").attr("content") ||
    "";

  // --- Description ---
  const desc =
    $("meta[property='og:description']").attr("content") ||
    $("meta[name='description']").attr("content") ||
    "";

  // --- Streams ---
  const streamUrls = (html.match(REGEX_STREAM) || []).filter(
    (u) => !u.includes("_preview.mp4") && !u.includes("_pb_preview.mp4")
  );

  const sources = {};
  for (const url of streamUrls) {
    const qm = url.match(REGEX_QUALITY);
    const quality = qm ? qm[1] : "SD";
    // Prefer URL with v-acctoken; otherwise keep first seen
    const existing = sources[quality];
    if (
      !existing ||
      (url.includes("v-acctoken") && !existing.includes("v-acctoken"))
    ) {
      sources[quality] = url;
    }
  }

  const streams = Object.entries(sources).map(([quality, url]) => ({
    title: quality,
    url,
  }));

  console.log(
    `[pimpbunny] parseVideoPage ${slug} -> title="${title}" streams=${streams.length}`
  );
  return { title, poster, desc, streams };
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------
const manifest = {
  id: "org.pimpbunny.addon",
  version: "1.0.0",
  name: "PimpBunny",
  description:
    "Browse and stream videos from pimpbunny.com. Categories, qualities and streams are auto-fetched from the site.",
  logo: "https://pimpbunny.com/static/v2/images/logo.png",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  idPrefixes: ["pb:"],
  catalogs: [
    {
      type: "movie",
      id: "pimpbunny_popular",
      name: "Popular",
      extra: [{ name: "search", isRequired: false }],
    },
    ...CATEGORIES.map(([slug, name]) => ({
      type: "movie",
      id: `pimpbunny_cat_${slug}`,
      name,
      extra: [{ name: "search", isRequired: false }],
    })),
  ],
};

const builder = new addonBuilder(manifest);

// ---------------------------------------------------------------------------
// Catalog handler
// ---------------------------------------------------------------------------
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  if (type !== "movie") return { metas: [] };
  const search = extra && extra.search ? String(extra.search) : null;
  const skip = extra && extra.skip ? parseInt(extra.skip, 10) : 0;
  const PAGE_SIZE = 32;
  const page = Math.floor(skip / PAGE_SIZE) + 1;

  try {
    if (id === "pimpbunny_popular") {
      // Homepage does not paginate via ?page= (returns same content),
      // so only serve the first page; Stremio will stop asking when we return [].
      if (skip > 0) return { metas: [] };
      const url = search ? searchUrl(search) : BASE + "/";
      const html = await fetchHtml(url);
      const metas = await parseVideoList(html);
      console.log(`[pimpbunny] catalog ${id} -> ${metas.length} metas`);
      return { metas };
    }

    const m = id.match(/^pimpbunny_cat_(.+)$/);
    if (m) {
      const slug = m[1];
      const url = search ? searchUrl(search, page) : catUrl(slug, page);
      const html = await fetchHtml(url);
      const metas = await parseVideoList(html);
      console.log(`[pimpbunny] catalog ${id} page ${page} -> ${metas.length} metas`);
      return { metas };
    }
  } catch (e) {
    console.error(`[pimpbunny] Catalog ${id} error:`, e.message);
  }
  return { metas: [] };
});

// ---------------------------------------------------------------------------
// Meta handler
// ---------------------------------------------------------------------------
builder.defineMetaHandler(async ({ type, id }) => {
  if (type !== "movie") return { meta: null };
  const m = id.match(/^pb:(.+)$/);
  if (!m) return { meta: null };
  const slug = m[1];

  try {
    const { title, poster, desc } = await parseVideoPage(slug);
    console.log(`[pimpbunny] meta ${id} -> "${title}"`);
    return {
      meta: {
        id,
        type: "movie",
        name: title,
        poster,
        background: poster,
        description: desc || "Video from pimpbunny.com",
      }
    };
  } catch (e) {
    console.error(`[pimpbunny] Meta ${id} error:`, e.message);
    return { meta: null };
  }
});

// ---------------------------------------------------------------------------
// Stream handler
// ---------------------------------------------------------------------------
builder.defineStreamHandler(async ({ type, id }) => {
  if (type !== "movie") return { streams: [] };
  const m = id.match(/^pb:(.+)$/);
  if (!m) return { streams: [] };
  const slug = m[1];

  try {
    const { streams } = await parseVideoPage(slug);
    console.log(`[pimpbunny] stream ${id} -> ${streams.length} streams`);
    return { streams };
  } catch (e) {
    console.error(`[pimpbunny] Stream ${id} error:`, e.message);
    return { streams: [] };
  }
});

module.exports = builder.getInterface();
