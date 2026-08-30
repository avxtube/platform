import type { Connection } from "mongoose";

import {
    normalizeUsername,
    usernameFromEmail,
} from "@workspace/core/utils";

type UserDocument = {
    _id: string;
    email?: string;
    username?: string | null;
};

export async function backfillUsernames(connection: Connection): Promise<number> {
    const users = connection.collection<UserDocument>("user");
    const documents = await users.find(
        {},
        { projection: { _id: 1, email: 1, username: 1 } },
    ).toArray();
    const usedUsernames = new Set(
        documents
            .map(({ username }) => username?.toLowerCase())
            .filter((username): username is string => Boolean(username)),
    );
    const operations = documents.flatMap((user) => {
        if (user.username) return [];

        const username = getUniqueUsername(
            usernameFromEmail(user.email ?? ""),
            user._id,
            usedUsernames,
        );
        usedUsernames.add(username);

        return [{
            updateOne: {
                filter: { _id: user._id },
                update: { $set: { username } },
            },
        }];
    });

    if (operations.length === 0) return 0;

    const result = await users.bulkWrite(operations, { ordered: true });
    return result.modifiedCount;
}

function getUniqueUsername(base: string, userId: string, used: Set<string>): string {
    const seed = normalizeUsername(userId).slice(-8) || "user";

    for (let attempt = 0; attempt < 100; attempt += 1) {
        const suffix = attempt === 0 ? "" : `${seed}${attempt > 1 ? attempt : ""}`;
        const candidate = `${base.slice(0, 30 - suffix.length)}${suffix}`;

        if (!used.has(candidate)) return candidate;
    }

    throw new Error(`Unable to generate a username for user ${userId}`);
}
