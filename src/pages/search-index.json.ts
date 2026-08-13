import { getCollection } from "astro:content";
import { decodeEntities } from "../utils/decode-entities";

export async function GET() {
  const articles = await getCollection("articles");

  const index = articles.map((article) => ({
    title: decodeEntities(article.data.title),
    excerpt: decodeEntities(article.data.excerpt || ""),
    category: article.data.category,
    url: `/${article.data.year}/${article.data.month}/${article.data.day}/${article.slug}`,
    image: article.data.image || `https://picsum.photos/seed/${article.slug}/640/427`,
    date: article.data.date,
  }));

  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json" },
  });
}
