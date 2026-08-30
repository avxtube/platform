import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

const authApiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

type AuthSessionResponse = {
    user?: {
        id?: string;
        email?: string;
        username?: string;
        name?: string;
        image?: string | null;
        role?: string;
    };
    session?: {
        id?: string;
    };
};

export interface CurrentUser {
    userId?: string;
    sessionId?: string;
    email?: string;
    username?: string;
    name?: string;
    image?: string;
    role?: string;
    credits?: number;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
    try {
        const requestHeaders = await headers();
        const forwardedHeaders = new Headers();
        forwardedHeaders.set("cookie", requestHeaders.get("cookie") ?? "");

        const userAgent = requestHeaders.get("user-agent");
        if (userAgent) forwardedHeaders.set("user-agent", userAgent);

        const response = await fetch(new URL("/api/auth/get-session", authApiUrl), {
            method: "GET",
            headers: forwardedHeaders,
            cache: "no-store",
        });

        if (!response.ok) {
            return {};
        }

        const session = await response.json() as AuthSessionResponse | null;

        if (!session?.user?.id) {
            return {};
        }

        return {
            userId: session.user.id,
            sessionId: session.session?.id,
            email: session.user.email,
            username: session.user.username,
            name: session.user.name,
            image: session.user.image ?? undefined,
            role: session.user.role
        };
    } catch (error) {
        console.error("[Auth] Failed to retrieve current user", error);
        return {};
    }
});
