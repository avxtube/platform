import { createHash } from "node:crypto";

import { TermModel } from "@workspace/db/models";
import { Router, type NextFunction, type Request, type Response } from "express";

import { authenticateUser, getRequestActor, requireAdmin } from "../middlewares/user-access.middleware";

const router: Router = Router();
router.use(authenticateUser, requireAdmin);

router.post("/check", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isRecord(req.body) || !Array.isArray(req.body.terms)) throw badRequest("terms must be an array");
    if (req.body.terms.length > 100) throw badRequest("terms must contain at most 100 items");
    const requested = uniqueRequests(req.body.terms.map(parseRequestedTerm));
    const checked = await Promise.all(requested.map(async (item) => {
      const exactName = new RegExp(`^${escapeRegExp(item.name)}$`, "i");
      const term = await TermModel.findOne({ taxonomy: item.taxonomy, name: exactName, status: "active" }).lean();
      return term ? { key: item.key, id: term._id, name: term.name, slug: term.slug, taxonomy: term.taxonomy } : null;
    }));

    res.status(200).json({ terms: checked.filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

router.post("/resolve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isRecord(req.body) || !Array.isArray(req.body.terms)) throw badRequest("terms must be an array");
    if (req.body.terms.length > 100) throw badRequest("terms must contain at most 100 items");
    const requested = uniqueRequests(req.body.terms.map(parseRequestedTerm));
    const actor = getRequestActor(res);
    const resolved = [];

    for (const item of requested) {
      const exactName = new RegExp(`^${escapeRegExp(item.name)}$`, "i");
      let term = await TermModel.findOne({ taxonomy: item.taxonomy, name: exactName, status: "active" }).lean();
      let created = false;
      if (!term) {
        const slug = await availableSlug(item.taxonomy, item.name);
        const document = await TermModel.create({ taxonomy: item.taxonomy, name: item.name, slug, createdBy: actor.id });
        term = document.toObject();
        created = true;
      }
      resolved.push({ ...item, id: term._id, name: term.name, created });
    }

    res.status(200).json({ terms: resolved });
  } catch (error) {
    next(error);
  }
});

type RequestedTerm = { key: string; name: string; taxonomy: "category" | "tag" };

function parseRequestedTerm(value: unknown): RequestedTerm {
  if (!isRecord(value)) throw badRequest("Each term must be an object");
  const key = typeof value.key === "string" ? value.key.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim().replace(/\s+/g, " ") : "";
  const taxonomy = value.taxonomy;
  if (!key || !name || name.length > 100 || (taxonomy !== "category" && taxonomy !== "tag")) throw badRequest("Each term requires key, name, and category or tag taxonomy");
  return { key, name, taxonomy };
}

function uniqueRequests(items: RequestedTerm[]) {
  return [...new Map(items.map((item) => [`${item.taxonomy}:${item.name.toLocaleLowerCase()}`, item])).values()];
}

async function availableSlug(taxonomy: RequestedTerm["taxonomy"], name: string) {
  const normalized = toSlug(name) || createHash("sha1").update(name.toLocaleLowerCase()).digest("hex").slice(0, 12);
  const exists = await TermModel.exists({ taxonomy, slug: normalized });
  if (!exists) return normalized;
  const suffix = createHash("sha1").update(`${taxonomy}:${name.toLocaleLowerCase()}`).digest("hex").slice(0, 8);
  return `${normalized.slice(0, 111)}-${suffix}`;
}

function toSlug(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function badRequest(message: string) { return Object.assign(new Error(message), { name: "ValidationError" }); }

export default router;
