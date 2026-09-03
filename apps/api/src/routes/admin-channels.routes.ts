import { createHash, randomUUID } from "node:crypto";

import { ChannelModel } from "@workspace/db/models";
import { Router, type NextFunction, type Request, type Response } from "express";

import { mockChannels } from "../data/mock-channels";
import { authenticateUser, getRequestActor, requireAdmin } from "../middlewares/user-access.middleware";

const router: Router = Router();

router.use(authenticateUser, requireAdmin);

router.post("/resolve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isRecord(req.body) || !Array.isArray(req.body.channels)) {
      throw badRequest("channels must be an array");
    }

    const requested = req.body.channels.map(parseRequestedChannel);
    if (requested.length > 50) throw badRequest("channels must contain at most 50 items");
    const actor = getRequestActor(res);
    const resolved = [];

    for (const item of uniqueRequests(requested)) {
      const mock = mockChannels.find((channel) =>
        channel.kind === item.kind && channel.name.localeCompare(item.name, undefined, { sensitivity: "base" }) === 0
      );
      if (mock) {
        resolved.push({ ...item, id: mock.id, name: mock.name, created: false });
        continue;
      }

      const exactName = new RegExp(`^${escapeRegExp(item.name)}$`, "i");
      let channel = await ChannelModel.findOne({ kind: item.kind, name: exactName, status: { $ne: "deleted" } }).lean();
      let created = false;

      if (!channel) {
        const handle = await availableHandle(item.kind, item.name);
        const document = await ChannelModel.create({
          _id: `channel_${randomUUID()}`,
          ownerId: actor.id,
          kind: item.kind,
          layout: item.kind === "actor" ? "compact" : "banner",
          handle,
          name: item.name,
        });
        channel = document.toObject();
        created = true;
      }

      resolved.push({ ...item, id: channel._id, name: channel.name, created });
    }

    res.status(200).json({ channels: resolved });
  } catch (error) {
    next(error);
  }
});

type RequestedChannel = { key: string; name: string; kind: "actor" | "studio" };

function parseRequestedChannel(value: unknown): RequestedChannel {
  if (!isRecord(value)) throw badRequest("Each channel must be an object");
  const key = typeof value.key === "string" ? value.key.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim().replace(/\s+/g, " ") : "";
  const kind = value.kind;
  if (!key || !name || name.length > 100 || (kind !== "actor" && kind !== "studio")) {
    throw badRequest("Each channel requires key, name (1-100 characters), and actor or studio kind");
  }
  return { key, name, kind };
}

function uniqueRequests(items: RequestedChannel[]) {
  return [...new Map(items.map((item) => [`${item.kind}:${item.name.toLocaleLowerCase()}`, item])).values()];
}

async function availableHandle(kind: RequestedChannel["kind"], name: string) {
  const ascii = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
  const digest = createHash("sha1").update(`${kind}:${name.toLocaleLowerCase()}`).digest("hex").slice(0, 10);
  const base = `${kind}${ascii || digest}`;
  const exists = await ChannelModel.exists({ handle: base });
  return exists ? `${base}${digest}` : base;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" });
}

export default router;
