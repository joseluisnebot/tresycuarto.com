#!/usr/bin/env node
/**
 * sync-cities.mjs
 * Sincroniza ciudades de D1 con data/cities.json y public/_routes.json.
 * Si detecta ciudades nuevas con ≥10 locales, las añade y dispara build+deploy.
 * Si ANTHROPIC_API_KEY está configurada, genera contenido (intro/barrios/FAQs)
 * automáticamente para las ciudades nuevas usando Claude Sonnet.
 *
 * Uso: node scripts/sync-cities.mjs [--deploy]
 * Variables de entorno necesarias:
 *   CF_ACCOUNT, CF_TOKEN, D1_DB, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 * Opcionales:
 *   ANTHROPIC_API_KEY  → genera contenido SEO automáticamente con Claude Sonnet
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CITIES_FILE = join(ROOT, "data", "cities.json");
const ROUTES_FILE = join(ROOT, "public", "_routes.json");

const CF_ACCOUNT       = process.env.CF_ACCOUNT || process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN         = process.env.CF_TOKEN   || process.env.CLOUDFLARE_API_TOKEN;
const D1_DB            = process.env.D1_DB      || "458672aa-392f-4767-8d2b-926406628ba0";
const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY || "";
const MIN_LOCALES      = 10;
const MIN_CON_DIRECCION = 10;
const DEPLOY = process.argv.includes("--deploy");

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function d1Query(sql) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_DB}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    }
  );
  const json = await res.json();
  if (!json.success) throw new Error(JSON.stringify(json.errors));
  return json.result[0].results;
}

function buildRoutes(cities) {
  const staticExcludes = [
    "/",
    "/para-locales", "/para-locales/",
    "/faq", "/faq/",
    "/contacto", "/contacto/",
    "/privacidad", "/privacidad/",
    "/unete", "/unete/",
    "/dashboard", "/dashboard/",
    "/local", "/local/*",
  ];

  const cityExcludes = cities.map(c => `/locales/${c.slug}/`);

  const assetExcludes = [
    "/_next/*",
    "/icon.svg", "/icon-192.png", "/icon-512.png",
    "/manifest.json", "/sw.js", "/robots.txt",
    "/*.png", "/*.svg", "/*.txt", "/*.json",
  ];

  return {
    version: 1,
    include: ["/*"],
    exclude: [...staticExcludes, ...cityExcludes, ...assetExcludes],
  };
}

// ── Generación de contenido con Claude Sonnet ──────────────────────────────

const CONTENT_FILE = join(ROOT, "data", "ciudad-content.json");

async function generarContenidoCiudad(ciudad) {
  if (!ANTHROPIC_KEY) return null;

  const prompt = `Eres un experto en turismo y ocio en España. Genera contenido para la página de tardeo de "${ciudad}" en tresycuarto.com (plataforma de bares, cafés y terrazas para el ocio de tarde en España, de 16h a 21h).

Devuelve SOLO un objeto JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "coords": {"lat": LATITUD_DECIMAL, "lon": LONGITUD_DECIMAL},
  "intro": "2-3 frases sobre la cultura de tardeo en ${ciudad}. Menciona zonas/barrios reales y algo característico local (gastronomía, tradición, clima). Tono cercano y evocador.",
  "barrios": ["Barrio1", "Barrio2", "Barrio3", "Barrio4", "Barrio5"],
  "faqs": [
    {"q": "¿Dónde tardeear en ${ciudad}?", "a": "Respuesta específica con zonas reales."},
    {"q": "¿Qué tomar en el tardeo de ${ciudad}?", "a": "Productos o bebidas típicas locales."},
    {"q": "¿A qué hora es el tardeo en ${ciudad}?", "a": "Horarios habituales y días más animados."},
    {"q": "¿Cuántos locales de tardeo hay en ${ciudad}?", "a": "Menciona que en tresycuarto tienen locales mapeados en ${ciudad}."}
  ]
}

Requisitos:
- coords: coordenadas reales del centro de ${ciudad}
- barrios: 5 barrios o zonas reales donde haya bares/cafés en ${ciudad}
- intro: específico para ${ciudad}, no genérico
- faqs: datos reales, no inventes cifras exactas salvo que las conozcas`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error(`  ⚠ Error API Anthropic (${res.status}) para ${ciudad}`);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Extraer JSON de la respuesta (por si viene con texto extra)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error(`  ⚠ Respuesta sin JSON válido para ${ciudad}`);
      return null;
    }

    return JSON.parse(match[0]);
  } catch (e) {
    console.error(`  ⚠ Error generando contenido para ${ciudad}:`, e.message);
    return null;
  }
}

async function generarContenidoParaCiudades(ciudades) {
  if (!ANTHROPIC_KEY) {
    console.log("  ℹ ANTHROPIC_API_KEY no configurada — se omite generación de contenido SEO.");
    console.log("    Configúrala en /root/scripts/sync_cities.sh para activarla.");
    return;
  }

  const content = JSON.parse(readFileSync(CONTENT_FILE, "utf8"));
  const sinContenido = ciudades.filter(c => !content[c.nombre]);

  if (sinContenido.length === 0) {
    console.log("  Todas las ciudades nuevas ya tienen contenido SEO.");
    return;
  }

  console.log(`\nGenerando contenido SEO para ${sinContenido.length} ciudades nuevas...`);

  for (const ciudad of sinContenido) {
    process.stdout.write(`  → ${ciudad.nombre}... `);
    const contenido = await generarContenidoCiudad(ciudad.nombre);
    if (contenido) {
      content[ciudad.nombre] = contenido;
      console.log("✓");
    } else {
      console.log("✗ (sin contenido)");
    }
    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 500));
  }

  writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2) + "\n");
  console.log("data/ciudad-content.json actualizado con contenido SEO.");
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Consultando D1...");
  const rows = await d1Query(
    `SELECT ciudad,
       COUNT(*) as total,
       SUM(CASE WHEN direccion IS NOT NULL AND direccion != '' THEN 1 ELSE 0 END) as con_dir
     FROM locales GROUP BY ciudad
     HAVING total >= ${MIN_LOCALES} AND con_dir >= ${MIN_CON_DIRECCION}`
  );
  console.log(`  ${rows.length} ciudades con ≥${MIN_LOCALES} locales y ≥${MIN_CON_DIRECCION} con dirección`);

  const cities = JSON.parse(readFileSync(CITIES_FILE, "utf8"));
  const existingSlugs = new Set(cities.map(c => c.slug));
  const existingNames = new Set(cities.map(c => c.nombre.toLowerCase()));

  const nuevas = [];
  for (const { ciudad } of rows) {
    if (existingNames.has(ciudad.toLowerCase())) continue;
    const slug = slugify(ciudad);
    if (existingSlugs.has(slug)) continue;
    nuevas.push({ slug, nombre: ciudad });
    console.log(`  + Nueva ciudad: ${ciudad} → ${slug}`);
  }

  if (nuevas.length === 0) {
    console.log("Sin ciudades nuevas. Nada que hacer.");
    // Regenerar _routes.json igualmente (por si acaso)
    writeFileSync(ROUTES_FILE, JSON.stringify(buildRoutes(cities), null, 2) + "\n");
    return;
  }

  const updated = [...cities, ...nuevas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  writeFileSync(CITIES_FILE, JSON.stringify(updated, null, 2) + "\n");
  console.log(`data/cities.json actualizado (${updated.length} ciudades)`);

  writeFileSync(ROUTES_FILE, JSON.stringify(buildRoutes(updated), null, 2) + "\n");
  console.log("public/_routes.json regenerado");

  // Generar contenido SEO para ciudades nuevas con Claude Sonnet
  await generarContenidoParaCiudades(nuevas);

  if (DEPLOY) {
    console.log("\nDisparando build + deploy...");
    execSync("npm run build", { cwd: ROOT, stdio: "inherit", env: process.env });
    execSync(
      `npx wrangler pages deploy out --project-name=tresycuarto --branch=main`,
      { cwd: ROOT, stdio: "inherit", env: process.env }
    );
    console.log("Deploy completado.");
  } else {
    console.log("\nEjecuta con --deploy para construir y desplegar.");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
