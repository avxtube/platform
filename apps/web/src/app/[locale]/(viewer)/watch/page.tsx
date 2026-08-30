import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Input } from "@workspace/ui/components"
import { createPageMetadata, type LocalizedPageProps } from "@/i18n/metadata";
import { getTranslations } from "next-intl/server";


export async function generateMetadata({ params }: LocalizedPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "page.watch" })
  return createPageMetadata({
    locale,
    pathname: "/watch",
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  });
}

export default async function Page({ params }: LocalizedPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "page.watch" })

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">{t("title")}</h1>
          <p>{t("description")}</p>
          <p>{t("hint")}</p>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          <Input />
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  )
}
