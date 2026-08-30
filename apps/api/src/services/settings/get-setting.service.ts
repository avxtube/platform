import { SettingModel } from "@workspace/db/models";
import dbConnect from "@workspace/db/mongoose";

export type Settings = Record<string, unknown>;

/**
 * ดึงการตั้งค่าเฉพาะ
 */
export const getSetting = async (name: string) => {
    await dbConnect();

    const setting = await SettingModel.findOne({ name }).lean();
    if (!setting) return null;

    return setting.value;
};

/**
 * ดึงการตั้งค่าหลายรายการ (ใช้ React cache สำหรับ performance)
 */
export const getSettingsByNames = async (names: string[]) => {
    await dbConnect();

    const settings = await SettingModel.find({
        name: { $in: names }
    }).lean();

    return settings.reduce<Settings>((result, setting) => {
        result[setting.name] = setting.value;
        return result;
    }, {});
};


/**
 * ดึงการตั้งค่าทั้งหมด
 */
export const getSettings = async () => {
    await dbConnect();

    const settings = await SettingModel.find({}).lean();

    return settings.reduce<Settings>((result, setting) => {
        result[setting.name] = setting.value;
        return result;
    }, {});
};
