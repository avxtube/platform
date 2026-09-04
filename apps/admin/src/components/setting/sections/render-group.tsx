import type { AdvertSettings, DomainSettings } from "@workspace/core/validators"
import { AdvertSection } from "./adverts-section"
import { DomainSection } from "./domain-section"

// Add settings groups here as their editors become available.
export const SETTING_GROUPS = [
  { id: "domain", href: "/setting/domain" },
  { id: "adverts", href: "/setting/adverts" },
] as const

export function RenderSettingGroup({
  group,
  data,
}: {
  group: "domain" | "adverts"
  data: DomainSettings | { advert_hobby: AdvertSettings }
}) {
  switch (group) {
    case "domain":
      return <DomainSection data={data as DomainSettings} />
    case "adverts":
      return <AdvertSection data={data as { advert_hobby: AdvertSettings }} />
  }
}
