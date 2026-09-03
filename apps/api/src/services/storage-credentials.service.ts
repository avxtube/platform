import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

const VERSION = "v1"

function encryptionKey() {
  const secret =
    process.env.STORAGE_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("STORAGE_ENCRYPTION_KEY is not configured")
  return createHash("sha256").update(secret).digest()
}

export function encryptStorageCredential(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

export function decryptStorageCredential(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".")
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue)
    throw new Error("Storage credential format is invalid")
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
