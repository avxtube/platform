import { UserRole, type UserRole as UserRoleType } from "@workspace/core/enums";
import { auth } from "@workspace/auth/config";
import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export type RequestActor = {
    id: string;
    role: UserRoleType;
    isAdmin: boolean;
};

type UserParams = { id: string };

function isAdminRole(role: UserRoleType): boolean {
    return role === UserRole.ADMIN
        || role === UserRole.SUPER_ADMIN
        || role === UserRole.DEVELOPER;
}

function isUserRole(role: unknown): role is UserRoleType {
    return Object.values(UserRole).includes(role as UserRoleType);
}

export function getRequestActor(res: Response): RequestActor {
    return res.locals.actor as RequestActor;
}

export const authenticateUser: RequestHandler = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session?.user?.id) {
            res.status(401).json({ error: "Authentication is required" });
            return;
        }

        const user = session.user as typeof session.user & {
            role?: unknown;
            // isDelete?: boolean;
        };

        if (user.isDelete) {
            res.status(401).json({ error: "User account is deleted" });
            return;
        }

        if (!isUserRole(user.role)) {
            res.status(403).json({ error: "User role is invalid" });
            return;
        }

        res.locals.actor = {
            id: String(user.id),
            role: user.role,
            isAdmin: isAdminRole(user.role),
        } satisfies RequestActor;

        next();
    } catch (error) {
        next(error);
    }
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
    const actor = getRequestActor(res);

    if (!actor.isAdmin) {
        res.status(403).json({ error: "Admin access is required" });
        return;
    }

    next();
};

export function requireSelfOrAdmin(
    req: Request<UserParams>,
    res: Response,
    next: NextFunction,
): void {
    const actor = getRequestActor(res);

    if (!actor.isAdmin && actor.id !== req.params.id) {
        res.status(403).json({ error: "You can only access your own user data" });
        return;
    }

    next();
}
