import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Input } from "@workspace/ui/components"
import { createPageMetadata, type LocalizedPageProps } from "@/i18n/metadata";
import { loadMetadataMockup } from "@/mock-up/loadMockup";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-static";

export async function generateMetadata({ params }: LocalizedPageProps) {
  const { locale } = await params;
  const data = await loadMetadataMockup(locale)
  return createPageMetadata({
    locale,
    pathname: "/",
    title: data.title,
    description: data.description,
    keywords: data.keywords,
  });
}

export default async function Page() {
  const [page, auth] = await Promise.all([
    getTranslations("page.index"),
    getTranslations("auth"),
  ])

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">{page("title")}</h1>
          <p>{page("description")}</p>
          <p>{page("welcome")}</p>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          <Input />
        </div>
        <LanguageSwitcher />
        <Link href="/login">{auth("action.login")}</Link>
        <Link href="/register">{auth("action.register")}</Link>
      </div>
    </div>
  )
}
