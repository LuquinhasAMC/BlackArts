// Verifica itens candidatos: mediatype e presença de arquivos reproduzíveis.
// Uso: node scripts/verify-new.mjs
const candidates = {
  audio: [
    "duke-ellington-soul-call",
    "lp_this-girls-in-love-with-you_aretha-franklin_item",
    "waters-muddy-1947-64-mc-kinley-morganfield-side-b-archive-05",
    "TheThrillIsGone_201509",
    "lp_aint-that-good-news_sam-cooke_item",
    "MiriamMakeba_604",
    "78_old-manuscript_count-basie-and-his-orchestra-redman_gbia0517896a",
    "lp_still-bill_bill_withers",
    "lp_live-at-the-copa_the-temptations",
    "78_songs-by-lead-belly_lead-belly-sanders-terry_gbia8005779",
    "78_dont-fish-in-my-sea_ma-rainey-james-blythe_gbia0191245b",
    "1975-fela-kuti-africa-70-expensive-shit",
    "etta-james-2x-live-shows-005",
    "bpl-littlerichard-1987",
    "Maybellene",
    "78_homeward-bound_dinah-washington-joe-morris-arnette-cobbs-rudy-rutherford-milt-buckn_gbia0063348a",
    "78_hot-air_cab-calloway-and-his-orchestra-novello-calloway_gbia3032564b",
  ],
  video: [
    "carmen-jones",
    "silent-body-and-soul",
    "the-scar-of-shame_1927",
    "hallelujah-1929-4-k-hd-upscale-full-movie-2160p-24fps-vp-9-lq-128kbit-aac",
    "borderline_1930",
    "CSPAN3_20141213_184400_1944_Documentary_The_Negro_Soldier",
    "go_down_death",
    "dirty-gertie-from-harlem-usa",
    "bronze_buckaroo",
  ],
  image: [
    "Franklin003",
    "img-0142_202107",
    "mma_writing_the_emancipation_proclamation_from_confederate_war_etchings_421339",
    "blackpanthers10pnt_202507",
    "harlem-renaissance-figures-4-raw",
    "langston-hughes-artist-file-d.-d.-teoli-jr.-a.-c.-61",
    "du-bois",
  ],
  text: [
    "blackboyamerican0000wrig",
    "poemsonvarioussu00whea",
    "soulsblackfolke01boisgoog",
    "iknowwhycagedbir0000ange_m6v8",
    "gotellitonmounta0000bald",
    "raisininsun0000hans_c8a7",
    "isbn_2740280545003",
    "miseducationofne00cart",
    "thewretchedoftheearth",
    "notwithoutlaught00hugh",
    "narrativeofsojou00gilbiala",
    "home-to-harlem-novel",
    "BlackSkinWhiteMasksPlutoClassics",
    "autobiographyofm00gain_0",
  ],
}

const EXT = {
  audio: ["mp3", "ogg", "oga", "wav", "flac", "m4a"],
  video: ["mp4", "webm", "ogv", "m4v", "mov"],
  image: ["jpg", "jpeg", "png", "gif", "webp", "tif", "tiff"],
  text: ["pdf", "txt", "epub", "djvu"],
}

async function check(id, type) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  const base = `https://archive.org/download/${encodeURIComponent(id)}`
  try {
    const [metaRes, filesRes] = await Promise.all([
      fetch(`${base}/${encodeURIComponent(id)}_meta.xml`, { signal: controller.signal }),
      fetch(`${base}/${encodeURIComponent(id)}_files.xml`, { signal: controller.signal }),
    ])
    clearTimeout(timer)
    const meta = await metaRes.text()
    const files = await filesRes.text()
    const mediatype = /<mediatype>([^<]+)<\/mediatype>/.exec(meta)?.[1]
    const playable = EXT[type].some((ext) => files.includes(`.${ext}"`))
    return { mediatype, playable, http: `${metaRes.status}/${filesRes.status}` }
  } catch {
    clearTimeout(timer)
    return { mediatype: null, playable: false, http: "erro" }
  }
}

let ok = 0
let bad = 0
for (const type of Object.keys(candidates)) {
  console.log(`\n=== ${type} ===`)
  for (const id of candidates[type]) {
    const r = await check(id, type)
    const pass = r.playable
    if (pass) ok += 1
    else bad += 1
    console.log(
      `  ${pass ? "OK  " : "FALHA"} ${id} | mediatype=${r.mediatype ?? "-"} | playable=${r.playable} | ${r.http}`
    )
  }
}
console.log(`\nOK: ${ok} | FALHAS: ${bad}`)
