import type { ChannelCourse, ChannelPost } from "@workspace/core/types";

import { mockVideos } from "./mock-videos";

export function getMockChannelCourses(channelId: string): ChannelCourse[] {
  return mockVideos
    .filter((video) => video.channel.id === channelId)
    .slice(0, 4)
    .map((video, index) => ({
      id: `${channelId}-course-${index + 1}`,
      title: index === 0 ? `Master ${video.category}` : `${video.title} — Complete course`,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      lessonCount: 12 + index * 7,
    }));
}

export function getMockChannelPosts(channelId: string): ChannelPost[] {
  const videos = mockVideos.filter((video) => video.channel.id === channelId);
  return videos.slice(0, 4).map((video, index) => ({
    id: `${channelId}-post-${index + 1}`,
    message: index === 0
      ? `มีวิดีโอใหม่แล้ว: ${video.title}\nขอบคุณทุกคนที่ติดตามและสนับสนุนช่องของเรา`
      : `เบื้องหลังผลงาน ${video.title} อยากให้ทำเนื้อหาเกี่ยวกับอะไรต่อ แสดงความคิดเห็นได้เลย`,
    imageUrl: index % 2 === 0 ? video.thumbnailUrl : null,
    publishedAt: video.publishedAt,
    likeCount: 15 + index * 128,
    commentCount: 8 + index * 21,
  }));
}
