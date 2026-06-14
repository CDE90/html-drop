import { boolean, capsule, endpoint, json, string, table, text } from "lakebed/server";
import { cleanTitle, cleanToken, looksLikeHtml } from "../shared/pages";

function randomToken(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

function publishTokenStatus(ctx: { env: Record<string, string | undefined> }, req: { headers: { get(name: string): string | null } }) {
  const token = ctx.env.PUBLISH_TOKEN;
  if (!token) {
    return "missing";
  }
  return req.headers.get("authorization") === `Bearer ${token}` ? "ok" : "unauthorized";
}

function queryValue(req: { query: unknown; url?: string }, name: string): string {
  const query = req.query;
  if (query && typeof (query as URLSearchParams).get === "function") {
    return String((query as URLSearchParams).get(name) ?? "");
  }
  if (query && typeof query === "object" && name in query) {
    return String((query as Record<string, unknown>)[name] ?? "");
  }
  if (req.url) {
    return new URL(req.url).searchParams.get(name) ?? "";
  }
  return "";
}

function originFor(req: { url?: string }): string {
  if (!req.url) {
    return "";
  }
  return new URL(req.url).origin;
}

function expiresAtFor(value: unknown): string {
  const days = Math.max(0, Math.min(365, Math.floor(Number(value ?? 0))));
  if (!days) {
    return "";
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isExpired(row: { expiresAt: string }): boolean {
  return Boolean(row.expiresAt) && Date.now() > Date.parse(row.expiresAt);
}

function validateHtml(html: string) {
  if (!html) {
    return "html is required";
  }
  if (html.length > 200_000) {
    return "html must be 200KB or smaller";
  }
  if (!looksLikeHtml(html)) {
    return "html should look like an HTML document or fragment";
  }
  return "";
}

type CreateBody = {
  html?: string;
  title?: string;
  readOnly?: boolean;
  expiresInDays?: number | string;
};

type EditBody = {
  editToken?: string;
  html?: string;
  title?: string;
};

export default capsule({
  schema: {
    pages: table({
      slug: string(),
      editToken: string(),
      title: string(),
      html: string(),
      authorId: string(),
      readOnly: boolean().default(false),
      expiresAt: string().default("")
    })
  },

  endpoints: {
    publish: endpoint({ method: "POST", path: "/api/publish" }, async (ctx, req) => {
      const tokenStatus = publishTokenStatus(ctx, req);
      if (tokenStatus === "missing") {
        return json({ error: "server is missing PUBLISH_TOKEN" }, { status: 500 });
      }
      if (tokenStatus === "unauthorized") {
        return json({ error: "unauthorized" }, { status: 401 });
      }

      const body = await req.json<CreateBody>();
      const html = String(body.html ?? "").trim();
      const htmlError = validateHtml(html);
      if (htmlError) {
        return json({ error: htmlError }, { status: htmlError.includes("200KB") ? 413 : 400 });
      }

      let slug = "";
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = randomToken();
        if (ctx.db.pages.where("slug", candidate).limit(1).all().length === 0) {
          slug = candidate;
          break;
        }
      }

      if (!slug) {
        return json({ error: "could not allocate slug" }, { status: 500 });
      }

      const row = ctx.db.pages.insert({
        slug,
        editToken: randomToken(),
        title: cleanTitle(String(body.title ?? slug)),
        html,
        authorId: ctx.auth.userId,
        readOnly: Boolean(body.readOnly),
        expiresAt: expiresAtFor(body.expiresInDays)
      });

      const origin = originFor(req);
      const path = `/p/${encodeURIComponent(row.slug)}`;
      const rawPath = `/raw?slug=${encodeURIComponent(row.slug)}`;
      ctx.log.info("page published", { slug: row.slug, title: row.title, authorId: ctx.auth.userId, readOnly: row.readOnly, expiresAt: row.expiresAt });

      return json({
        slug: row.slug,
        url: `${origin}${path}`,
        path,
        rawUrl: `${origin}${rawPath}`,
        rawPath,
        editToken: row.readOnly ? "" : row.editToken,
        editUrl: `${origin}/api/edit`,
        readOnly: row.readOnly,
        expiresAt: row.expiresAt
      });
    }),

    createPage: endpoint({ method: "POST", path: "/api/pages" }, async (ctx, req) => {
      const tokenStatus = publishTokenStatus(ctx, req);
      if (tokenStatus === "missing") {
        return json({ error: "server is missing PUBLISH_TOKEN" }, { status: 500 });
      }
      if (tokenStatus === "unauthorized") {
        return json({ error: "unauthorized" }, { status: 401 });
      }

      const body = await req.json<CreateBody>();
      const html = String(body.html ?? "").trim();
      const htmlError = validateHtml(html);
      if (htmlError) {
        return json({ error: htmlError }, { status: htmlError.includes("200KB") ? 413 : 400 });
      }

      let slug = "";
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = randomToken();
        if (ctx.db.pages.where("slug", candidate).limit(1).all().length === 0) {
          slug = candidate;
          break;
        }
      }

      if (!slug) {
        return json({ error: "could not allocate slug" }, { status: 500 });
      }

      const row = ctx.db.pages.insert({
        slug,
        editToken: randomToken(),
        title: cleanTitle(String(body.title ?? slug)),
        html,
        authorId: ctx.auth.userId,
        readOnly: Boolean(body.readOnly),
        expiresAt: expiresAtFor(body.expiresInDays)
      });

      const origin = originFor(req);
      const path = `/p/${encodeURIComponent(row.slug)}`;
      const rawPath = `/raw?slug=${encodeURIComponent(row.slug)}`;
      ctx.log.info("page published", { slug: row.slug, title: row.title, authorId: ctx.auth.userId, readOnly: row.readOnly, expiresAt: row.expiresAt });

      return json({
        slug: row.slug,
        url: `${origin}${path}`,
        path,
        rawUrl: `${origin}${rawPath}`,
        rawPath,
        editToken: row.readOnly ? "" : row.editToken,
        editUrl: `${origin}/api/edit`,
        readOnly: row.readOnly,
        expiresAt: row.expiresAt
      });
    }),

    edit: endpoint({ method: "POST", path: "/api/edit" }, async (ctx, req) => {
      const body = await req.json<EditBody>();
      const editToken = cleanToken(String(body.editToken ?? ""));
      if (!editToken) {
        return json({ error: "editToken is required" }, { status: 400 });
      }

      const row = ctx.db.pages.where("editToken", editToken).limit(1).all()[0];
      if (!row) {
        return json({ error: "not found" }, { status: 404 });
      }
      if (isExpired(row)) {
        ctx.db.pages.delete(row.id);
        return json({ error: "not found" }, { status: 404 });
      }
      if (row.readOnly) {
        return json({ error: "page is read-only" }, { status: 403 });
      }

      const html = String(body.html ?? "").trim();
      const htmlError = validateHtml(html);
      if (htmlError) {
        return json({ error: htmlError }, { status: htmlError.includes("200KB") ? 413 : 400 });
      }

      ctx.db.pages.update(row.id, {
        title: cleanTitle(String(body.title ?? row.title)),
        html
      });

      const origin = originFor(req);
      const path = `/p/${encodeURIComponent(row.slug)}`;
      const rawPath = `/raw?slug=${encodeURIComponent(row.slug)}`;
      ctx.log.info("page edited", { slug: row.slug, authorId: ctx.auth.userId });
      return json({ slug: row.slug, url: `${origin}${path}`, path, rawUrl: `${origin}${rawPath}`, rawPath });
    }),

    editPage: endpoint({ method: "POST", path: "/api/pages/edit" }, async (ctx, req) => {
      const body = await req.json<EditBody>();
      const editToken = cleanToken(String(body.editToken ?? ""));
      if (!editToken) {
        return json({ error: "editToken is required" }, { status: 400 });
      }

      const row = ctx.db.pages.where("editToken", editToken).limit(1).all()[0];
      if (!row) {
        return json({ error: "not found" }, { status: 404 });
      }
      if (isExpired(row)) {
        ctx.db.pages.delete(row.id);
        return json({ error: "not found" }, { status: 404 });
      }
      if (row.readOnly) {
        return json({ error: "page is read-only" }, { status: 403 });
      }

      const html = String(body.html ?? "").trim();
      const htmlError = validateHtml(html);
      if (htmlError) {
        return json({ error: htmlError }, { status: htmlError.includes("200KB") ? 413 : 400 });
      }

      ctx.db.pages.update(row.id, {
        title: cleanTitle(String(body.title ?? row.title)),
        html
      });

      const origin = originFor(req);
      const path = `/p/${encodeURIComponent(row.slug)}`;
      const rawPath = `/raw?slug=${encodeURIComponent(row.slug)}`;
      ctx.log.info("page edited", { slug: row.slug, authorId: ctx.auth.userId });
      return json({ slug: row.slug, url: `${origin}${path}`, path, rawUrl: `${origin}${rawPath}`, rawPath });
    }),

    renderPage: endpoint({ method: "GET", path: "/raw" }, (ctx, req) => {
      const slug = cleanToken(queryValue(req, "slug"));
      if (!slug) {
        return text("missing slug", { status: 400 });
      }

      const row = ctx.db.pages.where("slug", slug).limit(1).all()[0];
      if (!row) {
        return text("not found", { status: 404 });
      }
      if (isExpired(row)) {
        ctx.db.pages.delete(row.id);
        return text("not found", { status: 404 });
      }

      return new Response(row.html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": row.expiresAt ? "no-store" : "public, max-age=60",
          "x-content-type-options": "nosniff"
        }
      });
    })
  }
});
