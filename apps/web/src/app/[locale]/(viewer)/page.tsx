import { HomeFeed } from "@/components/home/home-feed"
import { createPageMetadata, type LocalizedPageProps } from "@/i18n/metadata";
import { loadMetadataMockup } from "@/mock-up/loadMockup";
import { getHomeFeed } from "@workspace/services/queries/video";

export const dynamic = "force-dynamic";
// Retain this dynamic page in Next's in-tab router cache. A reload or a new
// tab still requests a fresh feed, while returning from Watch can reuse the
// exact Home payload that the viewer already saw.
export const unstable_dynamicStaleTime = 31_536_000;

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
  const feed = await getHomeFeed(locale).catch((error) => { console.error("[Home] Failed to fetch feed", error); return { categories: [], videos: [], shorts: [], playlists: [] } })
  return <HomeFeed {...feed} locale={locale}/>
}
