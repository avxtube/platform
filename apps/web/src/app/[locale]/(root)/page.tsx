import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Input } from "@workspace/ui/components"
import { createPageMetadata, type LocalizedPageProps } from "@/i18n/metadata";
import { loadMetadataMockup } from "@/mock-up/loadMockup";
import { getTranslations } from "next-intl/server";

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

export default async function Page(props: LocalizedPageProps) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "web.page.index" })

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">{t("title")}</h1>
          <p>{t("description")}</p>
          <p>{t("welcome")}</p>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          <Input />
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  )
}
