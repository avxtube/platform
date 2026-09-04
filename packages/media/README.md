# @workspace/media

Shared media rules and UI for AVXTUBE.

- `@workspace/media` and `@workspace/media/types`: media purposes, MIME rules and upload result contracts.
- `@workspace/media/react`: reusable picker, image crop, resize and WebP conversion UI.
- `@workspace/media/server`: Sharp-based server image normalization. This entry point must only be imported by server code.

The React picker creates a pending selection without uploading. Images are cropped, resized and converted to a WebP `File` in the browser and remain in memory. Files and remote URLs are committed through the API only when the owning form is saved. A caller may provide a storage ID to override automatic priority selection.

Remote URL imports are downloaded by the API, checked against purpose-specific size and MIME rules, and blocked from private/local network destinations.
# MissAV remote imports

Both admin import paths use `createMissavMediaImport` to identify a MissAV page by
its hostname. Other sources keep their existing preparation/upload flow.
`POST /api/v1/admin/media/register-missav` stores source URLs and HLS/sprite
descriptors as `provider: remote` records. Source URLs and referrer information
are stored in media metadata, not on Content.
It does not download, upload, or contact VdoHide. The form registers on save;
quick import registers before resolving relations and saving its draft.

Contents store `mediaIds`; the API resolves each record's `purpose` and `quality`.
For parsed HLS renditions, each Media stores its root `quality` (`360`, `480`,
`720`, or `1080`) and only that variant object in `metadata.hls` (including its
`media` segment descriptor). It does not store the master wrapper or `variants[]`.
This applies to new imports; existing records are not migrated automatically.
Sprite descriptors without URLs are retained without guessing an image location.
Stable per-import IDs make retries idempotent. No proxy playback endpoint is
implemented by this registration feature: a future proxy must validate every
upstream URL (including nested HLS URLs and redirects), apply the server-side
`missav` request profile, and handle manifests/segments and byte ranges.
