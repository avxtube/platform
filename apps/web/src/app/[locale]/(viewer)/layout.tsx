import { ViewerShell } from "@/components/viewer"
import { WatchPlayerProvider } from "@/components/watch/watch-player-provider"
import { DEFAULT_ADVERT_SETTINGS } from "@workspace/core/validators"
import { getSettingsByNames } from "@workspace/services/queries/setting"

export default async function ViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { advert_hobby = DEFAULT_ADVERT_SETTINGS } =
    await getSettingsByNames(["advert_hobby"])

  return (
    <WatchPlayerProvider adverts={advert_hobby}>
      <ViewerShell>{children}</ViewerShell>
    </WatchPlayerProvider>
  )
}
