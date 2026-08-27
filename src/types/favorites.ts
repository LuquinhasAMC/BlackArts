/** Item salvo nos favoritos (localStorage). */
export interface FavoriteItem {
  identifier: string
  title: string
  mediatype?: string
  year?: string
  creator?: string
  thumbnail?: string
  addedAt: string
}
