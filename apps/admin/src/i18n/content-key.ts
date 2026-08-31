export function contentMessageKey(text: string) {
  return encodeURIComponent(text).replaceAll(".", "%2E")
}
