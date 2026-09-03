import { liveMetadata, postMetadata, shortMetadata, videoMetadata } from "./presets"
import { registerMetadata } from "./registry"

registerMetadata("video", videoMetadata)
registerMetadata("short", shortMetadata)
registerMetadata("post", postMetadata)
registerMetadata("live", liveMetadata)

export * from "./presets"
export * from "./registry"
export * from "./types"
