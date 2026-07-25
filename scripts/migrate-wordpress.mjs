import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const SITE = process.env.WORDPRESS_SITE || "https://www.travelstylehub.com";
const root = new URL("..", import.meta.url).pathname;
const contentRoot = join(root, "src", "content");
const publicRoot = join(root, "public");
const overrideRoot = join(root, "src", "wordpress-overrides");

async function all(endpoint, query = "") {
  const first = await fetch(`${SITE}/wp-json/wp/v2/${endpoint}?per_page=100${query}`);
  if (!first.ok) throw new Error(`Could not read ${endpoint}: ${first.status}`);
  const pages = Number(first.headers.get("x-wp-totalpages") || 1);
  const results = await first.json();
  for (let page = 2; page <= pages; page++) {
    const response = await fetch(`${SITE}/wp-json/wp/v2/${endpoint}?per_page=100&page=${page}${query}`);
    if (!response.ok) throw new Error(`Could not read ${endpoint} page ${page}`);
    results.push(...await response.json());
  }
  return results;
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function filePathFor(url) {
  const parsed = new URL(url);
  if (!parsed.pathname.startsWith("/wp-content/uploads/")) return null;
  return join(publicRoot, decodeURIComponent(parsed.pathname));
}

function wordpressMediaUrl(url) {
  const parsed = new URL(url);
  if (/(^|\.)travelstylehub\.com$/i.test(parsed.hostname)) {
    parsed.protocol = "https:";
    parsed.hostname = "www.travelstylehub.com";
  }
  return parsed.toString();
}

async function downloadMedia(urls) {
  let completed = 0;
  for (const url of urls) {
    const output = filePathFor(url);
    if (!output) continue;
    try {
      const existing = await stat(output).catch(() => null);
      if (existing?.size) continue;
      const response = await fetch(wordpressMediaUrl(url));
      if (!response.ok) throw new Error(String(response.status));
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, Buffer.from(await response.arrayBuffer()));
      completed++;
    } catch (error) {
      console.warn(`Skipped media ${url}: ${error.message}`);
    }
  }
  return completed;
}

function uploadUrls(html) {
  return [...localizeUploads(html).matchAll(/\/wp-content\/uploads\/[^"'\s)<]+/gi)]
    .map(match => new URL(match[0].replace(/&amp;/g, "&"), SITE).toString());
}

function localizeUploads(html = "") {
  return html.replace(
    /(?:https?:)?\/\/(?:www\.)?travelstylehub\.com\/wp-content\/uploads\//gi,
    "/wp-content/uploads/",
  );
}

function cleanArticleBody(html) {
  let body = localizeUploads(html).trim();
  body = body.replace(
    /^<p><!DOCTYPE html><br\s*\/?>\s*<html[^>]*><br\s*\/?>\s*<head><br\s*\/?>[\s\S]*?<\/head><br\s*\/?>\s*<body><\/p>\s*/i,
    "",
  );
  body = body.replace(/\s*<p><\/body><br\s*\/?>\s*<\/html><\/p>\s*$/i, "");
  body = body.replace(/^<h1>[\s\S]*?<\/h1>\s*/i, "");
  return body;
}

function routeDate(post) {
  const pathname = new URL(post.link, SITE).pathname;
  const match = pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (match) return { year: match[1], month: match[2], day: match[3] };
  const [year, month, day] = post.date.slice(0, 10).split("-");
  return { year, month, day };
}

async function articleBody(post) {
  const override = await readFile(join(overrideRoot, `${post.slug}.html`), "utf8").catch(() => "");
  return override.trim() || cleanArticleBody(post.content.rendered);
}

const [categories, posts, pages] = await Promise.all([
  all("categories"),
  all("posts", "&_embed=1"),
  all("pages"),
]);
const categoryById = new Map(categories.map(category => [category.id, category.slug]));
const mediaUrls = new Set();

await rm(join(contentRoot, "articles"), { recursive: true, force: true });
await rm(join(contentRoot, "pages"), { recursive: true, force: true });
await mkdir(join(contentRoot, "articles"), { recursive: true });
await mkdir(join(contentRoot, "pages"), { recursive: true });

for (const post of posts) {
  const category = categoryById.get(post.categories[0]) || "uncategorized";
  const featured = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";
  const title = stripHtml(post.title.rendered);
  const body = await articleBody(post);
  for (const url of uploadUrls(post.content.rendered)) mediaUrls.add(url);
  for (const url of uploadUrls(body)) mediaUrls.add(url);
  if (featured) mediaUrls.add(featured);
  const { year, month, day } = routeDate(post);
  const frontmatter = {
    title,
    date: post.date,
    category,
    excerpt: stripHtml(post.excerpt.rendered),
    image: localizeUploads(featured),
    year,
    month,
    day,
  };
  const yaml = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
  await writeFile(join(contentRoot, "articles", `${post.slug}.md`), `---\n${yaml}\n---\n\n${body}\n`);
}

for (const page of pages) {
  const body = localizeUploads(page.content.rendered);
  for (const url of uploadUrls(page.content.rendered)) mediaUrls.add(url);
  const yaml = [`title: ${JSON.stringify(stripHtml(page.title.rendered))}`, `description: ${JSON.stringify(stripHtml(page.excerpt.rendered))}`].join("\n");
  await writeFile(join(contentRoot, "pages", `${page.slug}.md`), `---\n${yaml}\n---\n\n${body}\n`);
}

const downloaded = await downloadMedia([...mediaUrls]);
console.log(`Imported ${posts.length} posts, ${pages.length} pages, and ${downloaded} media files.`);
