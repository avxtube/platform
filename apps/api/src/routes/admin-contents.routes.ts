import {
    CONTENT_KINDS,
    CONTENT_MODERATION_STATUSES,
    CONTENT_STATUSES,
    CONTENT_VISIBILITIES,
    ContentModel,
} from "@workspace/db/models";
import { Router, type NextFunction, type Request, type Response } from "express";

import {
    authenticateUser,
    getRequestActor,
    requireAdmin,
} from "../middlewares/user-access.middleware";

const router: Router = Router();

router.use(authenticateUser, requireAdmin);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const kind = optionalEnum(req.query.kind, CONTENT_KINDS);
        const status = optionalEnum(req.query.status, CONTENT_STATUSES);
        const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
        const page = positiveInteger(req.query.page, 1);
        const limit = Math.min(positiveInteger(req.query.limit, 20), 100);
        const filter: Record<string, unknown> = { deletedAt: { $exists: false } };

        if (kind) filter.kind = kind;
        if (status) filter.status = status;
        if (query) {
            const pattern = new RegExp(escapeRegExp(query), "i");
            filter.$or = [{ title: pattern }, { description: pattern }];
        }

        const [items, total] = await Promise.all([
            ContentModel.find(filter)
                .sort({ updatedAt: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ContentModel.countDocuments(filter),
        ]);

        res.status(200).json({
            items,
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        });
    } catch (error) {
        next(error);
    }
});

router.get("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const content = await ContentModel.findOne({
            _id: req.params.id,
            deletedAt: { $exists: false },
        }).lean();

        if (!content) {
            res.status(404).json({ error: "Content not found" });
            return;
        }

        res.status(200).json({ content });
    } catch (error) {
        next(error);
    }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const actor = getRequestActor(res);
        const input = parseContentInput(req.body, false);
        const content = await ContentModel.create({
            ...input,
            createdBy: actor.id,
        });

        res.status(201).json({ content: content.toObject() });
    } catch (error) {
        next(error);
    }
});

router.patch("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const input = parseContentInput(req.body, true);
        const content = await ContentModel.findOneAndUpdate(
            { _id: req.params.id, deletedAt: { $exists: false } },
            { $set: input },
            { new: true, runValidators: true },
        ).lean();

        if (!content) {
            res.status(404).json({ error: "Content not found" });
            return;
        }

        res.status(200).json({ content });
    } catch (error) {
        next(error);
    }
});

function parseContentInput(value: unknown, partial: boolean) {
    if (!isRecord(value)) throw badRequest("Request body must be an object");

    const result: Record<string, unknown> = {};
    const kind = requiredOrOptionalEnum(value.kind, CONTENT_KINDS, "kind", partial);
    const status = requiredOrOptionalEnum(value.status, CONTENT_STATUSES, "status", partial);
    const visibility = requiredOrOptionalEnum(value.visibility, CONTENT_VISIBILITIES, "visibility", partial);
    const moderationStatus = requiredOrOptionalEnum(
        value.moderationStatus,
        CONTENT_MODERATION_STATUSES,
        "moderationStatus",
        partial,
    );

    if (kind !== undefined) result.kind = kind;
    if (status !== undefined) result.status = status;
    if (visibility !== undefined) result.visibility = visibility;
    if (moderationStatus !== undefined) result.moderationStatus = moderationStatus;

    assignOptionalString(result, value, "title", 1_000);
    assignOptionalString(result, value, "description", 20_000);
    assignOptionalString(result, value, "studioId", 200);
    assignStringArray(result, value, "termIds");
    assignStringArray(result, value, "actorIds");
    assignOptionalDate(result, value, "publishedAt");
    assignOptionalDate(result, value, "scheduledAt");

    if ("metadata" in value) {
        if (value.metadata !== null && !isRecord(value.metadata)) {
            throw badRequest("metadata must be an object or null");
        }
        result.metadata = value.metadata;
    }

    if ("seo" in value) {
        if (value.seo === null) {
            result.seo = null;
        } else if (isRecord(value.seo)) {
            const seo: Record<string, unknown> = {};
            assignOptionalString(seo, value.seo, "metaTitle", 300);
            assignOptionalString(seo, value.seo, "metaDescription", 160);
            assignStringArray(seo, value.seo, "keywords");
            result.seo = seo;
        } else {
            throw badRequest("seo must be an object or null");
        }
    }

    return result;
}

function requiredOrOptionalEnum<const T extends readonly string[]>(
    value: unknown,
    allowed: T,
    field: string,
    partial: boolean,
): T[number] | undefined {
    if (value === undefined && partial) return undefined;
    if (typeof value !== "string" || !allowed.includes(value)) {
        throw badRequest(`${field} must be one of: ${allowed.join(", ")}`);
    }
    return value as T[number];
}

function optionalEnum<const T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
    return typeof value === "string" && allowed.includes(value) ? value as T[number] : undefined;
}

function assignOptionalString(target: Record<string, unknown>, source: Record<string, unknown>, field: string, maxLength: number) {
    if (!(field in source)) return;
    const value = source[field];
    if (value === null || value === "") {
        target[field] = undefined;
        return;
    }
    if (typeof value !== "string" || value.length > maxLength) {
        throw badRequest(`${field} must be a string up to ${maxLength} characters`);
    }
    target[field] = value.trim();
}

function assignStringArray(target: Record<string, unknown>, source: Record<string, unknown>, field: string) {
    if (!(field in source)) return;
    const value = source[field];
    if (value === null) {
        target[field] = undefined;
        return;
    }
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw badRequest(`${field} must be an array of strings`);
    }
    target[field] = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function assignOptionalDate(target: Record<string, unknown>, source: Record<string, unknown>, field: string) {
    if (!(field in source)) return;
    const value = source[field];
    if (value === null || value === "") {
        target[field] = undefined;
        return;
    }
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        throw badRequest(`${field} must be an ISO date string`);
    }
    target[field] = new Date(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, fallback: number) {
    if (typeof value !== "string") return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badRequest(message: string) {
    return Object.assign(new Error(message), { name: "ValidationError" });
}

export default router;
