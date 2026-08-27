# Bancos de dados curados (Internet Archive)

Obras selecionadas **manualmente** no Internet Archive, com foco em obras
artísticas sobre a cultura negra, a diáspora africana e artistas negros.
**São as únicas obras exibidas no catálogo** — não há busca externa na API.

## Estrutura

Um arquivo JSON por tipo de mídia + um arquivo de fileiras (estilo Netflix):

| Arquivo       | Tipo  | Conteúdo                              | Itens |
| ------------- | ----- | ------------------------------------- | ----- |
| `audio.json`  | audio | Jazz, blues, soul, gospel, afrobeat   | 37    |
| `video.json`  | video | Cinema negro, documentários, direitos civis | 29    |
| `image.json`  | image | Fotografia e história negra (NASA, museus, juneteenth) | 31 |
| `text.json`   | text  | Literatura, poesia e história negra   | 35    |
| `rows.json`   | —     | Fileiras de conteúdo (Netflix)         | 39    |

Cada item segue a estrutura mínima `id`/`type`/`url`, com campos de exibição
opcionais:

```json
{
  "id": "identificador-do-item",
  "type": "audio | video | image | text",
  "url": "https://archive.org/details/identificador-do-item",
  "title": "Título de exibição",
  "creator": "Artista ou autor (opcional)",
  "year": "Ano (opcional)",
  "tags": ["jazz", "clássico"]
}
```

- `id`: identificador do item no Internet Archive (a API de metadados
  `https://archive.org/metadata/<id>` resolve todos os arquivos e metadados).
- `type`: tipo de mídia no app (`MediaType`).
- `url`: página do item no Internet Archive.
- `title`/`creator`/`year`: usados pelos cards do catálogo (o thumbnail é
  gerado a partir do `id`).
- `tags`: etiquetas temáticas — podem se repetir entre obras do mesmo tema
  e aparecem nos metadados da obra e nas fileiras da tela inicial.

## Fileiras (rows.json)

As fileiras são como as do Netflix: um título e um filtro por `tags` e/ou
`types`. As obras entram na fileira quando a tag coincide **ou** o tipo
corresponde. Na tela inicial, **10 fileiras aleatórias** (entre as 39) são
sorteadas a cada visita, com as obras também em ordem aleatória.

```json
{
  "id": "obras-romanticas",
  "title": "Obras românticas",
  "tags": ["romance"],
  "types": ["text", "video"]
}
```

## Como adicionar novas obras

1. Pesquise no Internet Archive (ex.: `https://archive.org/advancedsearch.php?q=...&output=json`)
   ou diretamente em `https://archive.org/details/<id>`.
2. Confirme que o item existe e o `mediatype` corresponde ao arquivo JSON.
3. Adicione `{ "id", "type", "url" }` (e `title`/`tags` sempre que possível)
   ao arquivo correspondente — a obra passa a aparecer no catálogo.
