import {
  advertHobbyValid,
  DEFAULT_ADVERT_SETTINGS,
} from "@workspace/core/validators"
import { SettingModel } from "@workspace/db/models"

const name = "advert_hobby"

export async function getAdvertSettings() {
  const setting = await SettingModel.findOne({ name }).lean()
  return advertHobbyValid.parse(setting?.value ?? DEFAULT_ADVERT_SETTINGS)
}

export async function saveAdvertSettings(input: unknown) {
  const settings = advertHobbyValid.parse(input)
  await SettingModel.updateOne(
    { name },
    { $set: { value: settings } },
    { upsert: true, runValidators: true }
  )
  return settings
}
