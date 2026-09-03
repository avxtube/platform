# @workspace/media

Shared media rules and UI for AVXTUBE.

- `@workspace/media` and `@workspace/media/types`: media purposes, MIME rules and upload result contracts.
- `@workspace/media/react`: reusable picker, image crop, resize and WebP conversion UI.
- `@workspace/media/server`: Sharp-based server image normalization. This entry point must only be imported by server code.

The React picker creates a pending selection without uploading. Images are cropped, resized and converted to a WebP `File` in the browser and remain in memory. Files and remote URLs are committed through the API only when the owning form is saved. A caller may provide a storage ID to override automatic priority selection.

Remote URL imports are downloaded by the API, checked against purpose-specific size and MIME rules, and blocked from private/local network destinations.
