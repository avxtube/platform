import { UserModel } from "@workspace/db/models";

export async function getUserById(id: string) {
    return UserModel.findOne({ _id: id, isDelete: { $ne: true } })
        .select("_id name username email emailVerified twoFactorEnabled role image country createdAt updatedAt")
        .lean()
        .exec();
}
