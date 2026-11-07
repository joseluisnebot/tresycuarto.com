/**
 * browser-texto.js — Devuelve el texto de una página ya pintada por un navegador real
 * (Browser Run). Lo usa scripts/scraper_eventos.py para las agendas que bloquean al
 * scraper (403, certificados rotos) o que cargan los eventos con JavaScript.
 *
 * GET /api/browser-texto?url=https://agenda.example.es/&token=<BROWSER_TOKEN>
 *
 * Devuelve JSON: { ok, url, titulo, texto, ms }  (texto recortado a 20.000 caracteres)
 *
 * Coste: entra en las 10 h/mes de Browser Run del plan Workers Paid. El scraper lleva
 * la cuenta de lo gastado (logs/browser_minutos.txt) y se para antes del límite.
 */

import puppeteer from "@cloudflare/puppeteer";

const PAGE_TIMEOUT = 25000;
const MAX_TEXTO = 20000;

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const token = url.searchParams.get("token");
  if (!env.BROWSER_TOKEN || token !== env.BROWSER_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUrl = url.searchParams.get("url");
  try { new URL(targetUrl); } catch {
    return Response.json({ error: "URL inválida" }, { status: 400 });
  }
  if (!env.MYBROWSER) {
    return Response.json({ error: "Browser binding no configurado" }, { status: 500 });
  }

  const inicio = Date.now();
  let browser = null;
  try {
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-ES,es;q=0.9" });

    // Sin imágenes, vídeo ni fuentes: solo hace falta el texto
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "media", "font"].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: PAGE_TIMEOUT });

    const { titulo, texto } = await page.evaluate(() => {
      for (const el of document.querySelectorAll("script, style, noscript, nav, footer, header, aside")) el.remove();
      return { titulo: document.title, texto: document.body?.innerText || "" };
    });

    return Response.json({
      ok: true, url: page.url(), titulo,
      texto: texto.replace(/\n{3,}/g, "\n\n").slice(0, MAX_TEXTO),
      ms: Date.now() - inicio,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message, ms: Date.now() - inicio });
  } finally {
    if (browser) await browser.close();
  }
}
