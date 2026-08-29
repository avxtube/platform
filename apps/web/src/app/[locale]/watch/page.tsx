import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Input } from "@workspace/ui/components"
import { createPageMetadata, type LocalizedPageProps } from "@/i18n/metadata";
import { loadMetadataMockup } from "@/mock-up/loadMockup";


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

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          <Input />
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  )
}
