/**
 * Links externos do projeto.
 *
 * O APK usa o atalho `latest/download` do GitHub Releases: ele sempre
 * aponta para o asset de mesmo nome na release marcada como mais recente,
 * então o botão não precisa ser atualizado a cada versão publicada.
 */
export const PROJECT_LINKS = {
  github: "https://github.com/LuquinhasAMC/BlackArts",
  androidApk:
    "https://github.com/LuquinhasAMC/BlackArts/releases/latest/download/app-debug.apk",
} as const
