import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/$/, "") || "https://travelstylehub.com";
  const articles = await getCollection("articles");
  const pages = await getCollection("pages");
  const urls = [
    "/",
    "/aviation/", "/destinations/", "/fashion/", "/food/",
    ...pages.map(page => `/${page.slug}/`),
    ...articles.map(article => `/${article.data.year}/${article.data.month}/${article.data.day}/${article.slug}/`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${base}${url}</loc></url>`).join("")}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
