import { createHash, randomUUID } from "node:crypto"

import { ChannelModel } from "@workspace/db/models"
import { Router, type NextFunction, type Request, type Response } from "express"

import {
  authenticateUser,
  requireAdmin,
} from "../middlewares/user-access.middleware"
import { channelPositions } from "../services/content-relations.service"

const router: Router = Router()

router.use(authenticateUser, requireAdmin)

router.post(
  "/check",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isRecord(req.body) || !Array.isArray(req.body.channels)) {
        throw badRequest("channels must be an array")
      }
      if (req.body.channels.length > 50)
        throw badRequest("channels must contain at most 50 items")
      const requested = uniqueRequests(
        req.body.channels.map(parseRequestedChannel)
      )
      const checked = await Promise.all(
        requested.map(async (item) => {
          const exactName = new RegExp(`^${escapeRegExp(item.name)}$`, "i")
          const entityKind = item.kind === "actor" ? "person" : "organization"
          const filter: Record<string, unknown> = {
            kind: { $in: [entityKind, item.kind] },
            name: exactName,
            deletedAt: null,
          }
          const channel = await ChannelModel.findOne(filter).lean()
          return channel
            ? { key: item.key, id: channel._id, name: channel.name }
            : null
        })
      )
      res.status(200).json({ channels: checked.filter(Boolean) })
    } catch (error) {
      next(error)
    }
  }
)

// Content editor search: kind here is a role, not Channel.kind.
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role =
      req.query.kind === "actor"
        ? "actor"
        : req.query.kind === "studio"
          ? "studio"
          : null
    if (!role) throw badRequest("kind must be actor or studio")
    const ids =
      typeof req.query.ids === "string"
        ? req.query.ids.split(",").filter(Boolean).slice(0, 100)
        : []
    const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
    if (!ids.length && q.length < 2) {
      res.json({ channels: [] })
      return
    }
    const filter: Record<string, unknown> = { deletedAt: null }
    if (ids.length) filter._id = { $in: ids }
    else {
      filter.$and = [
        { $or: [{ "metadata.roles": role }, { kind: role }] },
        {
          $or: [
            { name: new RegExp(escapeRegExp(q), "i") },
            { handle: new RegExp(escapeRegExp(q), "i") },
          ],
        },
      ]
    }
    const items = await ChannelModel.find(filter)
      .sort({ name: 1 })
      .limit(ids.length || 12)
      .lean()
    res.json({
      channels: items.map((item) => ({
        id: item._id,
        name: item.name,
        handle: item.handle,
        avatarUrl: item.avatarUrl ?? null,
        kind: item.kind,
        positions: channelPositions(item.kind, item.metadata),
      })),
    })
  } catch (error) {
    next(error)
  }
})

router.post(
  "/resolve",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isRecord(req.body) || !Array.isArray(req.body.channels)) {
        throw badRequest("channels must be an array")
      }

      const requested = req.body.channels.map(parseRequestedChannel)
      if (requested.length > 50)
        throw badRequest("channels must contain at most 50 items")
      const resolved = []

      for (const item of uniqueRequests(requested)) {
        const exactName = new RegExp(`^${escapeRegExp(item.name)}$`, "i")
        const entityKind = item.kind === "actor" ? "person" : "organization"
        const filter: Record<string, unknown> = {
          kind: { $in: [entityKind, item.kind] },
          name: exactName,
          deletedAt: null,
        }
        let channel = await ChannelModel.findOne(filter).lean()
        let created = false

        if (!channel) {
          const handle = await availableHandle(item.kind, item.name)
          const document = await ChannelModel.create({
            _id: randomUUID(),
            kind: entityKind,
            metadata: {
              roles: [item.kind],
              ...(item.kind === "actor" ? { gender: "female" } : {}),
            },
            layout: item.kind === "actor" ? "compact" : "banner",
            handle,
            name: item.name,
          })
          channel = document.toObject()
          created = true
        } else {
          await ChannelModel.updateOne(
            { _id: channel._id },
            { $addToSet: { "metadata.roles": item.kind } }
          )
        }

        resolved.push({ ...item, id: channel._id, name: channel.name, created })
      }

      res.status(200).json({ channels: resolved })
    } catch (error) {
      next(error)
    }
  }
)

type RequestedChannel = { key: string; name: string; kind: "actor" | "studio" }

function parseRequestedChannel(value: unknown): RequestedChannel {
  if (!isRecord(value)) throw badRequest("Each channel must be an object")
  const key = typeof value.key === "string" ? value.key.trim() : ""
  const name =
    typeof value.name === "string" ? value.name.trim().replace(/\s+/g, " ") : ""
  const kind = value.kind
  if (
    !key ||
    !name ||
    name.length > 100 ||
    (kind !== "actor" && kind !== "studio")
  ) {
    throw badRequest(
      "Each channel requires key, name (1-100 characters), and actor or studio kind"
    )
  }
  return { key, name, kind }
}

function uniqueRequests(items: RequestedChannel[]) {
  return [
    ...new Map(
      items.map((item) => [
        `${item.kind}:${item.name.toLocaleLowerCase()}`,
        item,
      ])
    ).values(),
  ]
}

async function availableHandle(kind: RequestedChannel["kind"], name: string) {
  const ascii = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40)
  const digest = createHash("sha1")
    .update(`${kind}:${name.toLocaleLowerCase()}`)
    .digest("hex")
    .slice(0, 10)
  const base = `${kind}${ascii || digest}`
  const exists = await ChannelModel.exists({ handle: base })
  return exists ? `${base}${digest}` : base
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" })
}

export default router
