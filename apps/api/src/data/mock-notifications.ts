import type { ViewerNotification } from "@workspace/core/types";
import { mockVideos } from "./mock-videos";

const notificationTypes: ViewerNotification["type"][] = ["upload", "upload", "reply", "live", "upload", "membership"];

export const mockNotifications: ViewerNotification[] = mockVideos.slice(0, 12).map((video, index) => ({
  id: `notification-${index + 1}`,
  section: index < 4 ? "important" : "more",
  type: notificationTypes[index % notificationTypes.length]!,
  actorId: video.channel.id,
  actorName: video.channel.name,
  actorInitials: video.channel.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
  actorAvatarUrl: video.channel.avatarUrl,
  title: video.title,
  thumbnailUrl: video.thumbnailUrl,
  targetUrl: `/watch/${video.id}`,
  createdAt: new Date(Date.now() - (index + 1) * (index < 4 ? 3_600_000 : 10_800_000)).toISOString(),
  unread: index < 7,
}));
