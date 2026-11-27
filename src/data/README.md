# Bancos de dados curados (Internet Archive)

> **Fonte oficial:** estes dados ficam no repositório público
> [`LuquinhasAMC/BlackArts-data`](https://github.com/LuquinhasAMC/BlackArts-data).
> O app lê os JSONs diretamente de lá em tempo de execução, como os
> endpoints de uma API somente leitura
> (`raw.githubusercontent.com/.../main/<tipo>.json`) e guarda uma cópia no
> **IndexedDB** do navegador/WebView (não há cópias em `src/data/`).
>
> Ao abrir a tela inicial, **uma única requisição** à API do GitHub
> (`/repos/LuquinhasAMC/BlackArts-data/commits/main`) verifica se o
> repositório mudou. Se mudou, os arquivos são baixados de novo, a cópia
> local é atualizada e um toast avisa que o conteúdo foi atualizado. Sem
> conexão (ou se ainda não há cópia local), o app usa o IndexedDB e, quando
> não há nada guardado e a requisição falha, mostra o erro com o botão
> **Tentar novamente**.

Obras selecionadas **manualmente** no Internet Archive. Critério de curadoria:
**obras de autores negros ou cuja negritude é o tema central** (religiões de
matriz africana, samba e ritmos afro-brasileiros, capoeira, quilombos,
literatura e história negra, cinema e fotografia) e **obras brasileiras**.
Temas como religião, esporte e luta só entram quando uma pessoa negra aparece
explicitamente ou quando a negritude é o próprio assunto.

Todas as obras foram verificadas na API de metadados do Internet Archive
(`https://archive.org/metadata/<id>`): o item existe, o `mediatype` corresponde
ao arquivo e há arquivos livres para visualização/escuta (sem empréstimo).

**São as únicas obras exibidas no catálogo** — não há busca externa na API.

## Estrutura

Um arquivo JSON por tipo de mídia + um arquivo de fileiras (estilo Netflix):

| Arquivo      | Tipo  | Conteúdo                                                          | Itens |
| ------------ | ----- | ----------------------------------------------------------------- | ----- |
| `audio.json` | audio | Samba, afro-samba, rap, 78 rpm, candomblé, jongo, maracatu        | 75    |
| `video.json` | video | Cinema negro, capoeira, samba de roda, documentários              | 43    |
| `image.json` | image | Fotografia: samba de roda, terreiros, escolas de samba, capoeira  | 18    |
| `text.json`  | text  | Literatura afro-brasileira, poesia, umbanda, candomblé e história | 79    |
| `rows.json`  | —     | Fileiras de conteúdo (Netflix)                                    | 27    |

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
corresponde. Na tela inicial, **10 fileiras aleatórias** (entre as 22) são
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
   ao arquivo correspondente **no repositório BlackArts-data** — a obra passa
   a aparecer no catálogo assim que o app recarregar os dados.
