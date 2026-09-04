import { DEFAULT_DOMAIN_SETTING } from "@workspace/core/config"
import { domainSettingSchema } from "@workspace/core/validators"
import { SettingModel } from "@workspace/db/models"

const name = "domain_setting"

export async function getDomainSettings() {
  const setting = await SettingModel.findOne({ name }).lean()
  // Ignore retired fields on read so previously saved settings still open.
  // The next save replaces the value with only the supported fields.
  return domainSettingSchema
    .strip()
    .parse(setting?.value ?? DEFAULT_DOMAIN_SETTING)
}

export async function saveDomainSettings(input: unknown) {
  const settings = domainSettingSchema.parse(input)
  // A single document update avoids partially saving one group of settings.
  await SettingModel.updateOne(
    { name },
    { $set: { value: settings } },
    { upsert: true, runValidators: true }
  )
  return settings
}
