import { ViewerShell } from "@/components/viewer"
import { WatchPlayerProvider } from "@/components/watch/watch-player-provider"

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WatchPlayerProvider><ViewerShell>{children}</ViewerShell></WatchPlayerProvider>
}
