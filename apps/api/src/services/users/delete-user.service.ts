import { UserModel } from "@workspace/db/models";

export async function deleteUser(id: string) {
    return UserModel.findOneAndUpdate(
        { _id: id, isDelete: { $ne: true } },
        { $set: { isDelete: true } },
        { new: true },
    )
        .select("_id")
        .lean()
        .exec();
}
