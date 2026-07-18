import { createHash } from "node:crypto";
import { downloadDriveFile, getDriveAccessToken, listDriveFolder, type DriveFile } from "@/lib/google-drive";
import { parseRevenueWorkbook } from "@/lib/revenue-workbook";
import { createAdminClient } from "@/lib/supabase/admin";

const folderMime = "application/vnd.google-apps.folder";
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function discoverWorkbooks(accessToken: string, rootId: string) {
  const folders = [rootId];
  const files: DriveFile[] = [];
  for (let index = 0; index < folders.length; index++) {
    for (const item of await listDriveFolder(accessToken, folders[index])) {
      if (item.mimeType === folderMime) folders.push(item.id);
      else if (item.mimeType === xlsxMime && /p\s*&\s*l/i.test(item.name)) files.push(item);
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function recordFailure(file: DriveFile, message: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("revenue_source_files").upsert({ drive_file_id: file.id, file_name: file.name, modified_at: file.modifiedTime, status: "failed", error_message: message.slice(0, 1000) }, { onConflict: "drive_file_id" }).select("id").single();
  if (data) await admin.from("revenue_import_runs").insert({ source_file_id: data.id, finished_at: new Date().toISOString(), status: "failed", error_message: message.slice(0, 1000) });
}

export async function syncRevenueFolder() {
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is missing");
  const accessToken = await getDriveAccessToken();
  const files = await discoverWorkbooks(accessToken, rootId);
  if (files.length === 0) return { discovered: 0, imported: 0, skipped: 0, failed: 0, errors: [] as { file: string; error: string }[] };
  const admin = createAdminClient();
  const { data: known, error } = await admin.from("revenue_source_files").select("drive_file_id,modified_at,checksum,status").in("drive_file_id", files.map((file) => file.id));
  if (error) throw error;
  const knownById = new Map((known ?? []).map((file) => [file.drive_file_id, file]));
  const result = { discovered: files.length, imported: 0, skipped: 0, failed: 0, errors: [] as { file: string; error: string }[] };

  for (const file of files) {
    const previous = knownById.get(file.id);
    if (previous?.status === "imported" && new Date(previous.modified_at).getTime() === new Date(file.modifiedTime).getTime()) { result.skipped++; continue; }
    try {
      const buffer = await downloadDriveFile(accessToken, file.id);
      const checksum = createHash("sha256").update(buffer).digest("hex");
      if (previous?.status === "imported" && previous.checksum === checksum) {
        await admin.from("revenue_source_files").update({ modified_at: file.modifiedTime }).eq("drive_file_id", file.id);
        result.skipped++;
        continue;
      }
      const parsed = await parseRevenueWorkbook(buffer);
      const payload = { driveFileId: file.id, fileName: file.name, modifiedAt: file.modifiedTime, checksum, ...parsed };
      const { error: importError } = await admin.rpc("revenue_import_workbook", { payload });
      if (importError) throw importError;
      const { error: detailError } = await admin.rpc("revenue_import_workbook_details", { payload });
      if (detailError) throw detailError;
      result.imported++;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      await recordFailure(file, message);
      result.failed++;
      result.errors.push({ file: file.name, error: message });
    }
  }
  return result;
}
