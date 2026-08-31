import { HomeFeed } from "@/components/home/home-feed"
import { createPageMetadata, type LocalizedPageProps } from "@/i18n/metadata";
import { loadMetadataMockup } from "@/mock-up/loadMockup";
import { getHomeFeed } from "@workspace/services/queries/video";

export const dynamic = "force-dynamic";

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

export default async function Page({ params }: LocalizedPageProps) {
  const { locale } = await params
  const feed = await getHomeFeed().catch((error) => { console.error("[Home] Failed to fetch feed", error); return { categories: [], videos: [], shorts: [], playlists: [] } })
  return <HomeFeed {...feed} locale={locale}/>
}
