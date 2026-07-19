import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const DRIVE_SCOPE =
  "openid email https://www.googleapis.com/auth/drive.readonly";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function tokenKey() {
  return createHash("sha256")
    .update(`ledgerly-drive:${required("SUPABASE_SERVICE_ROLE_KEY")}`)
    .digest();
}

export function driveRedirectUri(origin: string) {
  return (
    process.env.GOOGLE_DRIVE_REDIRECT_URI || `${origin}/api/drive/callback`
  );
}

export function createDriveState(userId: string) {
  const body = Buffer.from(
    JSON.stringify({ userId, expires: Date.now() + 10 * 60_000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", tokenKey())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyDriveState(state: string, userId: string) {
  try {
    const [body, supplied] = state.split(".");
    if (!body || !supplied) return false;
    const expected = createHmac("sha256", tokenKey()).update(body).digest();
    const signature = Buffer.from(supplied, "base64url");
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      return false;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      userId?: string;
      expires?: number;
    };
    return parsed.userId === userId && Number(parsed.expires) > Date.now();
  } catch {
    return false;
  }
}

export function driveAuthorizationUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: required("GOOGLE_DRIVE_CLIENT_ID"),
    redirect_uri: driveRedirectUri(origin),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(params: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  };
  if (!response.ok || !body.access_token)
    throw new Error(body.error_description || "Google token exchange failed");
  return body;
}

export async function exchangeDriveCode(code: string, origin: string) {
  return tokenRequest(
    new URLSearchParams({
      code,
      client_id: required("GOOGLE_DRIVE_CLIENT_ID"),
      client_secret: required("GOOGLE_DRIVE_CLIENT_SECRET"),
      redirect_uri: driveRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  );
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decrypt(value: string) {
  const [iv, tag, encrypted] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted)
    throw new Error("Stored Drive credential is invalid");
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

export async function saveDriveCredential(
  refreshToken: string,
  accessToken: string,
) {
  const userResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  const googleUser = (await userResponse.json()) as { email?: string };
  if (!userResponse.ok || !googleUser.email)
    throw new Error("Could not identify the connected Google account");
  const { error } = await createAdminClient()
    .from("revenue_drive_credentials")
    .upsert({
      id: true,
      google_email: googleUser.email,
      refresh_token_encrypted: encrypt(refreshToken),
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
  return googleUser.email;
}

export async function getDriveAccessToken() {
  const { data, error } = await createAdminClient()
    .from("revenue_drive_credentials")
    .select("refresh_token_encrypted")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Google Drive is not connected");
  const token = await tokenRequest(
    new URLSearchParams({
      refresh_token: decrypt(data.refresh_token_encrypted),
      client_id: required("GOOGLE_DRIVE_CLIENT_ID"),
      client_secret: required("GOOGLE_DRIVE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  );
  return token.access_token!;
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
};

export async function listDriveFolder(accessToken: string, folderId: string) {
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${folderId.replaceAll("'", "\\'")}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,parents)",
      pageSize: "1000",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const body = (await response.json()) as {
      files?: DriveFile[];
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(
        body.error?.message || "Could not list Google Drive folder",
      );
    files.push(...(body.files ?? []));
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return files;
}

export async function downloadDriveFile(accessToken: string, fileId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    } | null;
    if (
      body?.error?.errors?.some(
        (error) => error.reason === "cannotDownloadFile",
      )
    )
      throw new Error(
        "The Drive owner has disabled downloads for this file. Ask the owner to allow downloads or replace it with a downloadable copy.",
      );
    throw new Error(
      body?.error?.message ||
        `Google Drive download failed (${response.status})`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}
