import { UserModel } from "@workspace/db/models";

export async function getUsers() {
    return UserModel.find({ isDelete: { $ne: true } })
        .select("_id name email emailVerified twoFactorEnabled role image country createdAt updatedAt")
        .lean()
        .exec();
}
