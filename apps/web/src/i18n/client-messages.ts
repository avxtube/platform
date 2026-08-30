import { clientContentKeys } from "./client-content-keys"

type Messages = Record<string, unknown>

export function selectClientMessages(messages: Messages) {
  const content = messages.content as Record<string, string> | undefined
  const clientContent = Object.fromEntries(
    clientContentKeys.flatMap((key) =>
      content?.[key] === undefined ? [] : [[key, content[key]]]
    )
  )

  return {
    shared: messages.shared,
    auth: messages.auth,
    common: messages.common,
    page: messages.page,
    content: clientContent,
  }
}
