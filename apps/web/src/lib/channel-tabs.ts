import { CHANNEL_TAB_IDS, type ChannelTabId } from "@workspace/core/types"

export const channelTabIds = CHANNEL_TAB_IDS
export type { ChannelTabId }

export function parseChannelTab(value: string | undefined, enabledTabs: ChannelTabId[], defaultTab: ChannelTabId): ChannelTabId {
  return enabledTabs.includes(value as ChannelTabId) ? (value as ChannelTabId) : defaultTab
}
