import type { LucideIcon } from "lucide-react"
import { CircleUserRound, Clock3, History, LibraryBig, Pause, SquarePlay, ThumbsUp, Trash2 } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { Locale } from "@workspace/i18n/config"
import { Link } from "@/i18n/navigation"

export type SignInPromptKind = "following" | "library" | "history" | "watch-later" | "liked"

const icons: Record<SignInPromptKind, LucideIcon> = {
  following: SquarePlay,
  library: LibraryBig,
  history: History,
  "watch-later": Clock3,
  liked: ThumbsUp,
}

export async function ViewerSignInPrompt({ kind, locale }: { kind: SignInPromptKind; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "video.signInPrompt" })
  const Icon = icons[kind]
  const content = <div className="flex min-h-[58vh] flex-col items-center justify-center px-5 text-center"><Icon className="size-24 stroke-[1.7]" /><h1 className="mt-7 text-2xl font-black tracking-tight">{t(`${kind}.title`)}</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">{t(`${kind}.description`)}</p><Link href="/login" className="mt-7 inline-flex h-10 items-center gap-2 rounded-full border border-blue-500 px-4 text-sm font-semibold text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"><CircleUserRound className="size-5" />{t("action")}</Link></div>

  if (kind !== "history") return content
  return <div className="grid min-h-[70vh] lg:grid-cols-[minmax(0,1fr)_340px]"><div>{content}</div><aside className="space-y-2 p-5 pt-10 text-sm"><p className="flex items-center gap-3 rounded-xl px-3 py-3"><Trash2 className="size-5" />{t("history.clearWatch")}</p><p className="flex items-center gap-3 rounded-xl px-3 py-3"><Pause className="size-5" />{t("history.pauseWatch")}</p><p className="flex items-center gap-3 rounded-xl px-3 py-3"><Trash2 className="size-5" />{t("history.clearSearch")}</p><p className="flex items-center gap-3 rounded-xl px-3 py-3"><Pause className="size-5" />{t("history.pauseSearch")}</p></aside></div>
}
