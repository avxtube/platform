export type VideoChannel = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  verified: boolean;
};

export const CHANNEL_KINDS = ["creator", "actor", "studio"] as const;

export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export const CHANNEL_TAB_IDS = ["home", "videos", "shorts", "live", "courses", "playlists", "posts", "about"] as const;

export type ChannelTabId = (typeof CHANNEL_TAB_IDS)[number];

export type ChannelLayout = "banner" | "compact";

export type ChannelLink = {
  label: string;
  url: string;
};

export type ActorChannelProfile = {
  kind: "actor";
  stageName: string;
  nationality: string | null;
  genres: string[];
};

export type StudioChannelProfile = {
  kind: "studio";
  legalName: string | null;
  foundedYear: number | null;
  specialties: string[];
};

export type CreatorChannelProfile = {
  kind: "creator";
  topics: string[];
};

export type ChannelProfile =
  | ActorChannelProfile
  | StudioChannelProfile
  | CreatorChannelProfile;

export type Channel = VideoChannel & {
  kind: ChannelKind;
  layout: ChannelLayout;
  enabledTabs: ChannelTabId[];
  defaultTab: ChannelTabId;
  membershipEnabled: boolean;
  description: string;
  bannerUrl: string | null;
  country: string | null;
  subscriberCount: number;
  videoCount: number;
  shortCount: number;
  viewCount: number;
  joinedAt: string;
  isFollowing: boolean;
  links: ChannelLink[];
  profile: ChannelProfile;
};

export type Video = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: number;
  publishedAt: string;
  category: string;
  playbackUrl?: string;
  channel: VideoChannel;
};

export type VideosResponse = {
  videos: Video[];
  total: number;
};

export type Actor = VideoChannel & {
  bio: string;
  followerCount: number;
  videoCount: number;
  coverUrl: string;
  isFollowing: boolean;
};

export type ActorsResponse = {
  actors: Actor[];
  total: number;
};

export type Short = Video & {
  likeCount: number;
  commentCount: number;
  shareCount: number;
  commentPolicy: "enabled" | "disabled" | "review";
};

export type ShortsResponse = {
  shorts: Short[];
  total: number;
};

export type ShortsPageResponse = {
  items: Short[];
  page: number;
  pageSize: number;
  nextPage: number | null;
  total: number;
};

export type Playlist = {
  id: string;
  title: string;
  description: string;
  owner: string;
  visibility: "public" | "private" | "unlisted";
  items: Video[];
};

export type ChannelDetailResponse = {
  channel: Channel;
  videos: Video[];
  shorts: Short[];
  playlists: Playlist[];
  courses: ChannelCourse[];
  posts: ChannelPost[];
};

export type ChannelCourse = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  lessonCount: number;
};

export type ChannelPost = {
  id: string;
  message: string;
  imageUrl: string | null;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
};

export type HomeFeedResponse = {
  videos: Video[];
  shorts: Short[];
  playlists: Playlist[];
};

export type ViewerNotification = {
  id: string;
  section: "important" | "more";
  type: "upload" | "live" | "reply" | "membership";
  actorId: string;
  actorName: string;
  actorInitials: string;
  actorAvatarUrl: string | null;
  title: string;
  thumbnailUrl: string | null;
  targetUrl: string;
  createdAt: string;
  unread: boolean;
};

export type NotificationsResponse = {
  notifications: ViewerNotification[];
  total: number;
  nextCursor: string | null;
  unreadCount: number;
};

export type StudioOverview = {
  totalViews: number;
  totalFollowers: number;
  totalVideos: number;
  estimatedRevenue: number;
  recentVideos: Video[];
};

export type WatchComment = {
  id: string;
  author: string;
  initials: string;
  message: string;
  likeCount: number;
  publishedAt: string;
  pinned?: boolean;
  replies?: WatchComment[];
};

export type WatchData = {
  video: Video;
  relatedVideos: Video[];
  relatedNextCursor: string | null;
  comments: WatchComment[];
  commentsNextCursor: string | null;
};

export type CursorPage<Item> = {
  items: Item[];
  nextCursor: string | null;
  total: number;
};

export type FollowingProfile = {
  id: string;
  type: "actor" | "studio";
  name: string;
  handle: string;
  initials: string;
  avatarUrl: string | null;
  verified: boolean;
  isLive: boolean;
  hasNew?: boolean;
};

export type CollectionKind = "library" | "history" | "watch-later" | "liked";

export type CollectionResponse = {
  kind: CollectionKind;
  videos: Video[];
  total: number;
};

export type HistoryContentType = "video" | "short" | "podcast" | "music";

export type HistoryEntry = {
  id: string;
  type: HistoryContentType;
  watchedAt: string;
  content: Video;
};

export type HistoryResponse = CollectionResponse & {
  entries: HistoryEntry[];
};

export type SearchResponse = {
  videos: Video[];
  shorts: Short[];
  actors: Actor[];
  playlists: Playlist[];
  total: number;
};
