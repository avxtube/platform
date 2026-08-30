import { randomUUID } from "node:crypto";
import { normalizeUsername, usernameFromEmail } from "@workspace/core/utils";
import { UserModel, type UserSchemaType } from "@workspace/db/models";

export type CreateUserInput = Pick<UserSchemaType, "name" | "email"> &
    Partial<
        Pick<
            UserSchemaType,
            "_id" | "username" | "emailVerified" | "twoFactorEnabled" | "role" | "image" | "country"
        >
    >;

export async function createUser(input: CreateUserInput) {
    const id = input._id ?? randomUUID();
    const requestedUsername = typeof input.username === "string"
        ? input.username.trim()
        : "";

    if (requestedUsername && !/^[a-zA-Z0-9]{3,30}$/.test(requestedUsername)) {
        throw new Error("Username must contain only letters and numbers and be 3-30 characters long");
    }

    const username = requestedUsername
        ? normalizeUsername(requestedUsername)
        : await findAvailableUsername(input.email, id);
    const user = await UserModel.create({
        _id: id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        username,
        emailVerified: input.emailVerified,
        twoFactorEnabled: input.twoFactorEnabled,
        role: input.role,
        image: input.image,
        country: input.country,
    });

    return user.toObject();
}

async function findAvailableUsername(email: string, userId: string): Promise<string> {
    const base = usernameFromEmail(email);
    const seed = normalizeUsername(userId).slice(-8) || "user";

    for (let attempt = 0; attempt < 100; attempt += 1) {
        const suffix = attempt === 0 ? "" : `${seed}${attempt > 1 ? attempt : ""}`;
        const candidate = `${base.slice(0, 30 - suffix.length)}${suffix}`;

        if (!await UserModel.exists({ username: candidate })) return candidate;
    }

    throw new Error("Unable to generate an available username");
}
