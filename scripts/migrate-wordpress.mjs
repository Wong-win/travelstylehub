import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const SITE = "https://travelstylehub.com";
const root = new URL("..", import.meta.url).pathname;
const contentRoot = join(root, "src", "content");
const publicRoot = join(root, "public");

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

async function downloadMedia(urls) {
  let completed = 0;
  for (const url of urls) {
    const output = filePathFor(url);
    if (!output) continue;
    try {
      const response = await fetch(url);
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
  return [...html.matchAll(/https?:\/\/travelstylehub\.com\/wp-content\/uploads\/[^"'\s)<]+/g)]
    .map(match => match[0].replace(/&amp;/g, "&"));
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
  const body = post.content.rendered.replaceAll(`${SITE}/wp-content/uploads/`, "/wp-content/uploads/");
  for (const url of uploadUrls(post.content.rendered)) mediaUrls.add(url);
  if (featured) mediaUrls.add(featured);
  const date = new Date(post.date);
  const frontmatter = {
    title: stripHtml(post.title.rendered),
    date: post.date,
    category,
    excerpt: stripHtml(post.excerpt.rendered),
    image: featured.replace(`${SITE}/wp-content/uploads/`, "/wp-content/uploads/"),
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
  const yaml = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
  await writeFile(join(contentRoot, "articles", `${post.slug}.md`), `---\n${yaml}\n---\n\n${body}\n`);
}

for (const page of pages) {
  const body = page.content.rendered.replaceAll(`${SITE}/wp-content/uploads/`, "/wp-content/uploads/");
  for (const url of uploadUrls(page.content.rendered)) mediaUrls.add(url);
  const yaml = [`title: ${JSON.stringify(stripHtml(page.title.rendered))}`, `description: ${JSON.stringify(stripHtml(page.excerpt.rendered))}`].join("\n");
  await writeFile(join(contentRoot, "pages", `${page.slug}.md`), `---\n${yaml}\n---\n\n${body}\n`);
}

const downloaded = await downloadMedia([...mediaUrls]);
console.log(`Imported ${posts.length} posts, ${pages.length} pages, and ${downloaded} media files.`);
