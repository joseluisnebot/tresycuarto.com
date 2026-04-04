/**
 * browser-extract.js — Extrae datos de la web de un local usando Browser Rendering.
 *
 * GET /api/browser-extract?url=https://mibar.com&token=tc_browser_2026
 *
 * Devuelve JSON: { ok, telefono, horario, descripcion, photo_url, instagram, web }
 *
 * Requiere binding MYBROWSER configurado en Cloudflare Pages settings.
 */

// @cloudflare/puppeteer es un módulo nativo del runtime de Cloudflare Workers
// No se instala como npm package — se resuelve en runtime
import puppeteer from "@cloudflare/puppeteer";

const SECRET_TOKEN = "tc_browser_2026";
const PAGE_TIMEOUT = 15000;

const HORARIO_SELECTORS = [
  '[class*="horario"]', '[class*="schedule"]', '[class*="hours"]',
  '[class*="opening"]', '[itemprop="openingHours"]',
  '.hours', '#hours',
];

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const token = url.searchParams.get("token");
  if (token !== SECRET_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUrl = url.searchParams.get("url");
  if (!targetUrl) {
    return Response.json({ error: "Parámetro 'url' requerido" }, { status: 400 });
  }

  try { new URL(targetUrl); } catch {
    return Response.json({ error: "URL inválida" }, { status: 400 });
  }

  if (!env.MYBROWSER) {
    return Response.json({ error: "Browser binding no configurado" }, { status: 500 });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Bloquear recursos innecesarios (más rápido, menos tiempo de browser)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "media", "font", "stylesheet"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });

    const datos = await page.evaluate((selectors) => {
      const r = { telefono: null, horario: null, descripcion: null, photo_url: null, instagram: null, web: null };

      // Web canónica
      r.web = document.querySelector('link[rel="canonical"]')?.href || window.location.href;

      // Foto og:image
      r.photo_url = document.querySelector('meta[property="og:image"]')?.content || null;

      // Descripción
      const desc = document.querySelector('meta[property="og:description"]') ||
                   document.querySelector('meta[name="description"]');
      if (desc?.content?.length > 20) r.descripcion = desc.content.slice(0, 300);

      // Teléfono
      const telLink = document.querySelector('a[href^="tel:"]');
      if (telLink) {
        r.telefono = telLink.href.replace("tel:", "").trim();
      } else {
        const match = document.body.innerText.match(/(?:\+34|0034)?[\s.-]?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
        if (match) r.telefono = match[0].replace(/\s/g, "").trim();
      }

      // Instagram
      const igLink = document.querySelector('a[href*="instagram.com"]');
      if (igLink) {
        const m = igLink.href.match(/instagram\.com\/([^/?#]+)/);
        if (m?.[1] && !["p", "reel", "explore", "stories"].includes(m[1])) r.instagram = m[1];
      }

      // Horario: primero schema.org
      try {
        const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent || "{}");
        const h = schema.openingHours || schema.openingHoursSpecification;
        if (h) r.horario = Array.isArray(h) ? h.join(" | ") : String(h).slice(0, 200);
      } catch {}

      // Horario: selectores CSS
      if (!r.horario) {
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el?.innerText?.length > 5 && el.innerText.length < 200) {
              r.horario = el.innerText.trim().slice(0, 200);
              break;
            }
          } catch {}
        }
      }

      return r;
    }, HORARIO_SELECTORS);

    return Response.json({ ok: true, ...datos });

  } catch (err) {
    return Response.json({ ok: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}
