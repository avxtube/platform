import { TermModel, TERM_TAXONOMIES } from "@workspace/db/models";
import { Router, type NextFunction, type Request, type Response } from "express";

const router: Router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taxonomy = typeof req.query.taxonomy === "string" && TERM_TAXONOMIES.includes(req.query.taxonomy as typeof TERM_TAXONOMIES[number])
      ? req.query.taxonomy
      : null;
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const ids = typeof req.query.ids === "string" ? req.query.ids.split(",").map((id) => id.trim()).filter(Boolean) : [];
    const requestedLimit = Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : ids.length ? String(ids.length) : "12", 10) || 12;
    const limit = Math.max(1, Math.min(requestedLimit, ids.length ? 100 : 30));
    const filter: Record<string, unknown> = { status: "active" };
    if (taxonomy) filter.taxonomy = taxonomy;
    if (ids.length) filter._id = { $in: ids };
    if (query) {
      const pattern = new RegExp(escapeRegExp(query), "i");
      filter.$or = [{ name: pattern }, { slug: pattern }];
    }
    const terms = await TermModel.find(filter).sort({ name: 1 }).limit(limit).lean();
    res.status(200).json({ terms: terms.map((term) => ({ id: term._id, name: term.name, slug: term.slug, taxonomy: term.taxonomy })), total: terms.length });
  } catch (error) {
    next(error);
  }
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
