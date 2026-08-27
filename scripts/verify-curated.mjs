// Verifica as obras curadas: existência no Internet Archive, mediatype
// correspondente e presença de arquivos reproduzíveis pelo app.
// Uso: node scripts/verify-curated.mjs [audio|video|image|text]
import { readFileSync } from "node:fs"
import { join } from "node:path"

const onlyType = process.argv[2]

const TYPES = ["audio", "video", "image", "text"]

// Mediatypes do Internet Archive que o app resolve para cada tipo.
const MEDIATYPES = {
  audio: ["audio", "etree"],
  video: ["movies", "video"],
  image: ["image"],
  text: ["texts", "text"],
}

// Formatos que o app consegue reproduzir, por tipo.
const PLAYABLE = {
  audio: ["mp3", "vbr mp3", "ogg audio", "flac", "wav"],
  video: ["h.264", "mpeg4", "matroska", "ogg video", "webm", "mp4"],
  image: ["jpeg", "png", "tiff", "gif", "jpg", "bmp"],
  text: ["text pdf", "djvu txt", "text", "epub", "abbyy gz"],
}

function filePlayable(files, type) {
  return files.some((f) => {
    const fmt = (f.format || "").toLowerCase()
    return PLAYABLE[type].some((p) => fmt.includes(p))
  })
}

async function check(id, type) {
  const url = `https://archive.org/metadata/${encodeURIComponent(id)}`
  let res
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    try {
      res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) break
      if (res.status === 404) {
        return { ok: false, reason: "não encontrado (404)" }
      }
    } catch {
      clearTimeout(timer)
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  if (!res || !res.ok) {
    return { ok: false, reason: "timeout/rede após 3 tentativas" }
  }
  const data = await res.json()
  const meta = data.metadata || {}
  const mediatype = meta.mediatype
  const title = meta.title || id
  const files = Array.isArray(data.files) ? data.files : []
  if (!mediatype) {
    return { ok: false, reason: "sem mediatype", title }
  }
  if (!MEDIATYPES[type].includes(mediatype)) {
    return {
      ok: false,
      reason: `mediatype=${mediatype} (esperado ${MEDIATYPES[type].join("/")})`,
      title,
    }
  }
  if (!filePlayable(files, type)) {
    return { ok: false, reason: "sem arquivos reproduzíveis", title }
  }
  return { ok: true, title, mediatype, fileCount: files.length }
}

const results = []
for (const type of TYPES) {
  if (onlyType && onlyType !== type) continue
  const file = join(process.cwd(), "src", "data", `${type}.json`)
  const items = JSON.parse(readFileSync(file, "utf8"))
  console.log(`\n=== ${type} (${items.length}) ===`)

  // Concorrência de 4 para não estourar a API nem demorar demais.
  const queue = [...items]
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const item = queue.shift()
      const r = await check(item.id, type)
      results.push({ type, id: item.id, ...r })
      if (!r.ok) {
        console.log(`  [FALHA] ${item.id} -> ${r.reason}`)
      }
    }
  })
  await Promise.all(workers)
}

console.log(`\n${"-".repeat(60)}`)
const bad = results.filter((r) => !r.ok)
const good = results.filter((r) => r.ok)
console.log(`OK: ${good.length} | FALHAS: ${bad.length} | TOTAL: ${results.length}`)
if (bad.length) {
  console.log("\nItens com problema:")
  for (const r of bad) {
    console.log(`  [${r.type}] ${r.id} -> ${r.reason}`)
  }
}
