import { randomUUID } from "node:crypto";
import { UserModel, type UserSchemaType } from "@workspace/db/models";

export type CreateUserInput = Pick<UserSchemaType, "name" | "email"> &
    Partial<
        Pick<
            UserSchemaType,
            "_id" | "emailVerified" | "twoFactorEnabled" | "role" | "image" | "country"
        >
    >;

export async function createUser(input: CreateUserInput) {
    const user = await UserModel.create({
        _id: input._id ?? randomUUID(),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        emailVerified: input.emailVerified,
        twoFactorEnabled: input.twoFactorEnabled,
        role: input.role,
        image: input.image,
        country: input.country,
    });

    return user.toObject();
}
