import type { CursorPage, WatchComment } from "@workspace/core/types"
import { CommentModel, ContentModel, UserModel } from "@workspace/db/models"

type CommentRow = {
  _id: string
  userId: string
  parentId?: string | null
  message: string
  likeCount?: number
  pinned?: boolean
  createdAt: Date
}

export async function getVideoComments(
  contentId: string,
  cursor: number,
  limit: number
): Promise<CursorPage<WatchComment>> {
  const topLevel = {
    contentId,
    deletedAt: { $exists: false },
    $or: [{ parentId: { $exists: false } }, { parentId: null }],
  }
  const [rawRows, total] = await Promise.all([
    CommentModel.find(topLevel)
      .sort({ createdAt: -1, _id: -1 })
      .skip(cursor)
      .limit(limit)
      .lean(),
    CommentModel.countDocuments(topLevel),
  ])
  const rows = rawRows as unknown as CommentRow[]
  const parentIds = rows.map((row) => row._id)
  const rawReplies = parentIds.length
    ? await CommentModel.find({
        contentId,
        parentId: { $in: parentIds },
        deletedAt: { $exists: false },
      })
        .sort({ createdAt: 1, _id: 1 })
        .lean()
    : []
  const replies = rawReplies as unknown as CommentRow[]
  const userIds = [...new Set([...rows, ...replies].map((row) => row.userId))]
  const users = userIds.length
    ? await UserModel.find({ _id: { $in: userIds } })
        .select("_id name username")
        .lean()
    : []
  const userNames = new Map(
    users.map((user) => [
      String(user._id),
      user.name || user.username || "User",
    ])
  )
  const repliesByParent = new Map<string, WatchComment[]>()
  for (const reply of replies) {
    if (!reply.parentId) continue
    const list = repliesByParent.get(reply.parentId) ?? []
    list.push(mapComment(reply, userNames))
    repliesByParent.set(reply.parentId, list)
  }
  const items = rows.map((row) => ({
    ...mapComment(row, userNames),
    replies: repliesByParent.get(row._id) ?? [],
  }))
  const nextOffset = cursor + items.length
  return {
    items,
    nextCursor: nextOffset < total ? String(nextOffset) : null,
    total,
  }
}

export async function createVideoComment(input: {
  contentId: string
  userId: string
  message: string
  parentId?: string
}) {
  if (input.parentId) {
    const parent = await CommentModel.findOne({
      _id: input.parentId,
      contentId: input.contentId,
      deletedAt: { $exists: false },
    })
      .select("_id parentId")
      .lean()
    if (!parent || parent.parentId) throw invalid("Parent comment not found")
  }
  const [comment, user] = await Promise.all([
    CommentModel.create(input),
    UserModel.findById(input.userId).select("_id name username").lean(),
  ])
  await ContentModel.updateOne(
    { _id: input.contentId },
    { $inc: { "stats.commentCount": 1 } }
  )
  return mapComment(comment.toObject() as unknown as CommentRow, new Map([
    [input.userId, user?.name || user?.username || "User"],
  ]))
}

function mapComment(
  row: CommentRow,
  userNames: Map<string, string>
): WatchComment {
  const author = userNames.get(row.userId) ?? "User"
  return {
    id: row._id,
    author,
    initials: initials(author),
    message: row.message,
    likeCount: Math.max(0, row.likeCount ?? 0),
    publishedAt: row.createdAt.toISOString(),
    ...(row.pinned ? { pinned: true } : {}),
  }
}

function initials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => Array.from(part)[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  )
}

function invalid(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" })
}
