# HTML Drop

A Lakebed capsule for dropping HTML documents onto the web via one simple API call.

Use it for AI-written plans, research notes, and other information-only HTML documents that should be easy for an agent to create and share publicly by URL.

## Public URL

HTML Drop is available at:

```txt
https://html-drop.lakebed.app/
```

Use this as the base URL for the hosted API and generated document links.

## Recommended agent API

Publishing is API-only and requires `PUBLISH_TOKEN` from `.env.lakebed.server`.

Publish:

```sh
curl -X POST https://html-drop.lakebed.app/api/publish \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <PUBLISH_TOKEN>' \
  -d '{
    "title": "Research summary",
    "html": "<!doctype html><html><body><h1>Research summary</h1></body></html>"
  }'
```

Response:

```json
{
  "url": "https://html-drop.lakebed.app/p/<slug>",
  "rawUrl": "https://html-drop.lakebed.app/raw?slug=<slug>",
  "editToken": "<token-if-editable>",
  "editUrl": "https://html-drop.lakebed.app/api/edit"
}
```

That is the main workflow: send `title` and `html`, receive a share URL.

Optional fields:

```json
{
  "readOnly": true,
  "expiresInDays": 7
}
```

- `readOnly: true` makes the document permanently non-editable.
- `expiresInDays` can be `0` through `365`; `0` or omitted means no expiration.

## Edit an editable document

```sh
curl -X POST https://html-drop.lakebed.app/api/edit \
  -H 'content-type: application/json' \
  -d '{
    "editToken": "<token>",
    "title": "Updated research summary",
    "html": "<!doctype html><html><body><h1>Updated</h1></body></html>"
  }'
```

Read-only and expired documents cannot be edited.

## Access model

- Every document gets a long random `slug` for viewing.
- Documents are not publicly listed.
- Editable documents get a separate long random `editToken`.
- The public share URL does **not** allow editing.
- Expired documents are deleted on the next view/edit attempt and return `404`.

## Other endpoints

Compatibility aliases are also available:

- `POST /api/pages` → same as `POST /api/publish`
- `POST /api/pages/edit` → same as `POST /api/edit`

Raw HTML is available at:

```txt
/raw?slug=<slug>
```

## Publish auth

`PUBLISH_TOKEN` is required in `.env.lakebed.server`. Publish callers must send:

```txt
Authorization: Bearer <token>
```

If `PUBLISH_TOKEN` is missing, publish requests fail with a server configuration error. Editing uses the per-document `editToken`.

## Local UI

The homepage is intentionally minimal and does not create pages. Publishing happens only through the token-protected API. Public API documentation lives here in the README, not in the web UI.

## Run locally

For local development, use `http://localhost:3000` instead of the hosted base URL in API examples.

```sh
npx lakebed dev
```

Inspect local state while dev is running:

```sh
npx lakebed db dump --port 3000
npx lakebed logs --port 3000
```

Note: Lakebed local dev state is in-memory and resets when `npx lakebed dev` restarts. Hosted deploy state persists.

## Deploy

```sh
npx lakebed deploy
```

For a production-ish app with `PUBLISH_TOKEN`, claim or own the deploy so hosted server env can sync, then deploy again.

## Notes

- The share URL uses Lakebed's client router at `/p/:slug` and renders the saved HTML inside a sandboxed iframe.
- `/raw?slug=...` serves submitted HTML directly as `text/html`; use a dedicated app/domain for untrusted agent output.
- Current size limit is 200KB per submitted HTML document.
