import { supabaseAdmin } from "./_supabase-admin.js";
import { requireAdmin, logAdminAction } from "./_admin-guard.js";

/// POST /api/admin-mission-poster-upload
/// Body: {
///   missionId: string,       // used only to shape the filename
///   filename: string,        // original filename (for extension)
///   contentType: string,     // e.g. "image/png"
///   dataBase64: string,      // raw file bytes, base64-encoded
/// }
///
/// Returns: { publicUrl: string }
///
/// Uploads to the `mission-posters` public bucket. Files are named
/// `<missionId>-<timestampMs>.<ext>` so re-uploading a poster
/// doesn't collide with the prior version (both files stay in
/// storage; the DB just tracks the latest URL).
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// Bumping the body limit because base64 inflates payload ~4/3×.
// Vercel default is 4.5 MB; images encoded to base64 blow past it
// almost immediately.
export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const guard = await requireAdmin(req, res);
  if (!guard.ok) return;

  const { missionId, filename, contentType, dataBase64 } = req.body ?? {};
  if (typeof missionId !== "string" || !missionId) {
    return res.status(400).json({ error: "Missing missionId" });
  }
  if (typeof contentType !== "string" || !ALLOWED_TYPES.has(contentType)) {
    return res
      .status(400)
      .json({ error: "contentType must be image/png, image/jpeg, or image/webp" });
  }
  if (typeof dataBase64 !== "string" || !dataBase64) {
    return res.status(400).json({ error: "Missing dataBase64" });
  }

  let bytes;
  try {
    bytes = Buffer.from(dataBase64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64" });
  }
  if (bytes.length === 0) {
    return res.status(400).json({ error: "Empty file" });
  }
  if (bytes.length > MAX_BYTES) {
    return res.status(400).json({
      error: `File too large — max ${Math.round(MAX_BYTES / 1024 / 1024)} MB`,
    });
  }

  const ext =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/webp"
        ? "webp"
        : "png";
  const safeMissionId = missionId.replace(/[^a-z0-9_]/gi, "_");
  const path = `${safeMissionId}-${Date.now()}.${ext}`;

  const sb = supabaseAdmin();
  const { error: upErr } = await sb.storage
    .from("mission-posters")
    .upload(path, bytes, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });
  if (upErr) {
    return res
      .status(500)
      .json({ error: `Upload failed: ${upErr.message}` });
  }

  const { data: publicRow } = sb.storage
    .from("mission-posters")
    .getPublicUrl(path);

  const publicUrl = publicRow?.publicUrl ?? null;

  await logAdminAction({
    adminId: guard.adminId,
    action: "mission_poster_upload",
    details: {
      mission_id: missionId,
      path,
      bytes: bytes.length,
      content_type: contentType,
      original_filename: typeof filename === "string" ? filename : null,
    },
  });

  return res.status(200).json({ publicUrl, path });
}
