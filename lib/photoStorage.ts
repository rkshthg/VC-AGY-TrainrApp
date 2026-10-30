/**
 * Photo storage for Trainr (meal photos, check-in photos, avatars).
 *
 * Photos are uploaded to the private Supabase Storage bucket `trainr-media`
 * under `<userId>/<kind>/<uuid>.<ext>`. The database stores a reference of
 * the form `storage://<path>`; screens get a short-lived signed URL for it.
 * Storage policies (supabase_policies_recreate.sql) let a user read their
 * own files, their active clients' files and their active trainer's files.
 */
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import logger from './logger';

export const MEDIA_BUCKET = 'trainr-media';
const PREFIX = 'storage://';
const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

export type MediaKind = 'meals' | 'checkins' | 'avatars';

/** True for a `storage://` reference saved in the database. */
export function isStoredMedia(u?: string | null): u is string {
  return !!u && u.startsWith(PREFIX);
}

function isRemoteUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

/** True for an on-device image (file:, content:, ph:, blob:, data:) that must be uploaded. */
export function needsUpload(u?: string | null): u is string {
  return !!u && !isStoredMedia(u) && !isRemoteUrl(u);
}

const pathOf = (ref: string) => ref.slice(PREFIX.length);

// --- Upload -------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : -1;
    bytes[p++] = (a << 2) | (b >> 4);
    if (c >= 0) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes.subarray(0, p);
}

async function readAsBase64(uri: string): Promise<{ base64: string; mime: string }> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(blob);
  });
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Unexpected image encoding');
  return { mime: match[1] || 'image/jpeg', base64: match[2] };
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

// Same local photo used by two callers (e.g. a check-in and its feed card)
// is uploaded once.
const inFlight = new Map<string, Promise<string>>();

/** Upload an on-device image; resolves to its `storage://` reference. */
export function uploadMedia(localUri: string, kind: MediaKind): Promise<string> {
  const existing = inFlight.get(localUri);
  if (existing) return existing;

  const job = (async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) throw new Error('Not signed in');

    const { base64, mime } = await readAsBase64(localUri);
    const bytes = base64ToBytes(base64);
    const path = `${uid}/${kind}/${Crypto.randomUUID()}.${EXT[mime] || 'jpg'}`;

    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, bytes.buffer as ArrayBuffer, { contentType: mime, upsert: false });
    if (error) throw error;
    const ref = PREFIX + path;
    // The screen may keep showing the local file; let lookups find the upload.
    displayToRef.set(localUri, ref);
    return ref;
  })();

  inFlight.set(localUri, job);
  job.catch(() => inFlight.delete(localUri));
  return job;
}

/**
 * Returns a value safe to save in the database: uploads on-device images,
 * passes through `storage://` refs and https URLs. Throws if the upload fails.
 */
export async function ensureUploaded(uri: string | undefined | null, kind: MediaKind): Promise<string | undefined> {
  if (!uri) return undefined;
  if (needsUpload(uri)) return uploadMedia(uri, kind);
  return storedRefFor(uri);
}

// --- Display ------------------------------------------------------------

const signed = new Map<string, { url: string; expiresAt: number }>();
const displayToRef = new Map<string, string>();

/** Fetch signed URLs for any `storage://` refs not already cached. */
export async function resolveMediaUrls(refs: (string | null | undefined)[]): Promise<void> {
  const now = Date.now();
  const missing = Array.from(
    new Set(
      refs.filter(
        (r): r is string => isStoredMedia(r) && !((signed.get(r)?.expiresAt ?? 0) - REFRESH_MARGIN_MS > now)
      )
    )
  );
  if (missing.length === 0) return;

  try {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(missing.map(pathOf), SIGNED_URL_TTL_SEC);
    if (error) throw error;
    (data || []).forEach((item, i) => {
      if (item.signedUrl) {
        const ref = missing[i];
        signed.set(ref, { url: item.signedUrl, expiresAt: now + SIGNED_URL_TTL_SEC * 1000 });
        displayToRef.set(item.signedUrl, ref);
      }
    });
  } catch (e) {
    logger.warn('Failed to sign media URLs:', e);
  }
}

/** URL to show for a stored value (signed URL, https URL, or local file). */
export function displayUrl(ref: string | null | undefined): string | undefined {
  if (!ref) return undefined;
  if (isStoredMedia(ref)) return signed.get(ref)?.url;
  return ref;
}

/** Resolve refs and map each to its display URL in one step. */
export async function toDisplayUrls(refs: (string | null | undefined)[]): Promise<(string | undefined)[]> {
  await resolveMediaUrls(refs);
  return refs.map(displayUrl);
}

/** The value stored in the database for a URL currently on screen. */
export function storedRefFor(displayed: string): string {
  return displayToRef.get(displayed) ?? displayed;
}

/** Best-effort removal of an uploaded file. */
export async function deleteMedia(refOrDisplayed: string | null | undefined): Promise<void> {
  if (!refOrDisplayed) return;
  const ref = storedRefFor(refOrDisplayed);
  if (!isStoredMedia(ref)) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([pathOf(ref)]);
  if (error) logger.warn('Failed to delete media file:', error.message);
}

/** Remove every file the signed-in user uploaded (used by account deletion). */
export async function deleteAllMyMedia(userId: string): Promise<void> {
  for (const kind of ['meals', 'checkins', 'avatars'] as MediaKind[]) {
    const folder = `${userId}/${kind}`;
    for (;;) {
      const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(folder, { limit: 100 });
      if (error) throw error;
      if (!data || data.length === 0) break;
      const { error: rmError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .remove(data.map((f) => `${folder}/${f.name}`));
      if (rmError) throw rmError;
      if (data.length < 100) break;
    }
  }
}

/** Forget cached signed URLs (on logout). */
export function clearMediaCache(): void {
  signed.clear();
  displayToRef.clear();
  inFlight.clear();
}
