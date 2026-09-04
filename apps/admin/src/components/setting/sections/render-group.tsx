import type { DomainSettings } from "@workspace/core/validators"
import { DomainSection } from "./domain-section"

// Add settings groups here as their editors become available.
export const SETTING_GROUPS = [
  { id: "domain", href: "/setting/domain" },
] as const

export function RenderSettingGroup({
  group,
  data,
}: {
  group: "domain"
  data: DomainSettings
}) {
  switch (group) {
    case "domain":
      return <DomainSection data={data} />
  }
}
