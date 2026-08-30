import type { Video } from "@workspace/core/types"

import { VideoCard } from "./video-card"

type VideoGridProps = {
  videos: Video[]
  locale: string
  className?: string
  hideAvatar?: boolean
  getVideoHref?: (video: Video, index: number) => string
  labels: {
    views: (count: string) => string
    published: (date: string) => string
    moreOptions: string
    verified: string
  }
}

export function VideoGrid({ videos, locale, labels, className = "", hideAvatar = false, getVideoHref }: VideoGridProps) {
  const numberFormatter = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  })
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  })

  return (
    <div className={`grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${className}`}>
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          href={getVideoHref?.(video, index) ?? `/watch/${video.id}`}
          hideAvatar={hideAvatar}
          viewsLabel={labels.views(numberFormatter.format(video.viewCount))}
          publishedLabel={labels.published(dateFormatter.format(new Date(video.publishedAt)))}
          moreOptionsLabel={labels.moreOptions}
          verifiedLabel={labels.verified}
        />
      ))}
    </div>
  )
}
