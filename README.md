# BlackArts 🖤

Museu digital da negritude — reúne vídeos, músicas, fotografias, obras de arte,
documentos e registros culturais da diáspora africana, usando a API pública do
[Internet Archive](https://archive.org).

Stack: React 19 · Vite · TypeScript · Tailwind CSS 4 · shadcn/ui (base Radix) ·
React Router 7 · TanStack Query · lucide-react.

## Como rodar

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install        # instala as dependências
npm run dev        # sobe o servidor de desenvolvimento (http://localhost:5173)
```

Scripts disponíveis:

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção (typecheck + vite build)
npm run preview    # serve o build de produção
npm run typecheck  # verificação de tipos (tsc --noEmit)
npm run lint       # eslint
npm run format     # prettier
```

## App nativo (Capacitor/Android)

O projeto usa [Capacitor](https://capacitorjs.com) para empacotar o app como
APK Android. Pré-requisitos: JDK 21+ e Android SDK (variável `ANDROID_HOME`).

```bash
npm run build          # gera o web bundle em dist/
npx cap sync android   # copia os assets web e plugins para a pasta android/
cd android && ./gradlew assembleDebug   # gera o APK de debug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Para instalar direto no aparelho (com depuração USB ativada):

```bash
npx cap run android
```

Comportamentos nativos configurados:

- **Orientação**: sempre retrato, exceto no fullscreen do player de vídeo
  (libera landscape enquanto a tela cheia estiver ativa).
- **Edge-to-edge**: as barras do sistema (status e navegação) ficam sobre a
  interface, com safe areas aplicadas via `var(--safe-area-inset-*)` para o
  conteúdo nunca ficar coberto.
- **Seleção de texto**: bloqueada na interface (mantida em campos de texto e
  no visualizador de documentos).
- **Ícone e splash**: gerados a partir de `assets/logo.png` (a logo do app)
  com `@capacitor/assets`.
- **Tema nativo**: janela e barras em escuro, com acento âmbar do BlackArts.

## Setup inicial

O projeto foi iniciado com o preset do shadcn/ui (base Radix, estilo
`radix-luma`, base color `taupe`):

```bash
npx shadcn@latest init --preset b7W7uXJuE --base radix --template vite
npm install react-router-dom @tanstack/react-query lucide-react clsx tailwind-merge
npx shadcn@latest add button input card badge tabs skeleton dialog select scroll-area separator tooltip sonner dropdown-menu
```

## Estrutura

```
src/
  app/                  # router e providers globais
    router.tsx
    providers.tsx
  components/
    catalog/            # card, grade, toolbar de busca e estados do catálogo
    favorites/          # botão de favorito e botão de compartilhar
    layout/             # header, footer, layout e loader
    media/              # visualizadores + registry + bottom bar flutuante por player
    metadata/           # tabela de metadados e descrição expansível
    ui/                 # componentes shadcn/ui
  config/
    archive.ts          # curadoria: termos, tipos de mídia, categorias, cache
  hooks/
    use-favorites.tsx   # favoritos com localStorage (contexto compartilhado)
    use-debounce.ts
    use-first-run.ts
    use-media-playback.ts  # detecção de falha e "tentar novamente" em players
  lib/
    archive-api.ts      # camada de serviço do Internet Archive
    media.ts            # detecção de tipo de mídia e seleção de arquivos
    share.ts            # Web Share API + fallback de copiar link
    storage.ts          # localStorage seguro
    utils.ts
  pages/
    welcome.tsx         # primeira execução
    home.tsx            # catálogo (busca + filtros + paginação)
    item-detail.tsx     # tela de obra em formato app mobile (viewport cheio)
    favorites.tsx
    not-found.tsx
  styles/
    globals.css         # tema (radix-luma / taupe)
  types/
    archive.ts
    favorites.ts
```

## Como funciona

- **Dados**: `advancedsearch.php` para o catálogo e `/metadata/{identifier}`
  para o detalhe. Thumbnails via `/services/img/{identifier}` e arquivos via
  `/download/{identifier}/{fileName}`.
- **Estado na URL**: busca, tipo, categoria e página ficam nos query params
  (`/?q=jazz&type=audio&page=2`) — dá para voltar/avançar e compartilhar a busca.
- **Cache**: TanStack Query com `staleTime` de 5 minutos; requisições são
  canceladas com `AbortController` e têm timeout.
- **Favoritos**: persistidos em `localStorage` (`blackarts:favorites:v1`) com
  parse seguro; estado compartilhado entre header, catálogo, detalhe e página
  de favoritos.
- **Tela de obra (app mobile)**: viewport cheio (`h-dvh`) com top bar fixa
  (voltar · Metadados · compartilhar), visualizador central com título acima e
  **bottom bar flutuante dinâmica por player**: áudio = controles de
  reprodução (player nativo + seleção de faixa), imagem = zoom in/out e
  restaurar original, texto = navegação (rolagem) e copiar, além de favoritar
  e menu "mais opções" (favoritar entra no menu quando falta espaço).
- **Visualizadores**: registry extensível
  (`media-viewer-registry.tsx`) — players nativos de áudio/vídeo, imagem com
  zoom, texto puro rolável ou PDF em iframe e fallback com link para o
  Internet Archive.
- **Compartilhamento**: Web Share API quando disponível (mobile), com fallback
  de copiar link + toast.

## Limitações conhecidas

- Depende de conexão com a internet para carregar o catálogo e os metadados.
- Nem todos os formatos do Internet Archive são reproduzíveis no navegador
  (ex.: alguns vídeos só em formatos não suportados); nesses casos há fallback
  com link para abrir no próprio Internet Archive.
- A API pública do Internet Archive pode estar lenta ou fora do ar — o app
  mostra estados de erro com "Tentar novamente".
- Algumas redes (principalmente no Brasil) bloqueiam os servidores de arquivos
  `*.us.archive.org` do Internet Archive: a API (`archive.org`) funciona, mas o
  download de áudio/vídeo/imagens/PDF e até as thumbnails dão timeout. O app
  detecta a falha e exibe um estado amigável com "Tentar novamente" e link
  para abrir o item no Internet Archive. Nesses casos, usar VPN ou outra rede
  costuma resolver.
- Favoritos são locais ao dispositivo/navegador (não há conta de usuário).
