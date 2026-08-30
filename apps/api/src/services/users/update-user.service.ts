import { UserModel, type UserSchemaType } from "@workspace/db/models";

export type UpdateUserInput = Partial<
    Pick<
        UserSchemaType,
        "name" | "email" | "emailVerified" | "twoFactorEnabled" | "role" | "image" | "country"
    >
>;

export async function updateUser(id: string, input: UpdateUserInput) {
    const update: UpdateUserInput = {};

    if (input.name !== undefined) update.name = input.name.trim();
    if (input.email !== undefined) update.email = input.email.trim().toLowerCase();
    if (input.emailVerified !== undefined) update.emailVerified = input.emailVerified;
    if (input.twoFactorEnabled !== undefined) update.twoFactorEnabled = input.twoFactorEnabled;
    if (input.role !== undefined) update.role = input.role;
    if (input.image !== undefined) update.image = input.image;
    if (input.country !== undefined) update.country = input.country;

    return UserModel.findOneAndUpdate(
        { _id: id, isDelete: { $ne: true } },
        { $set: update },
        { new: true, runValidators: true },
    )
        .select("_id name username email emailVerified twoFactorEnabled role image country createdAt updatedAt")
        .lean()
        .exec();
}
