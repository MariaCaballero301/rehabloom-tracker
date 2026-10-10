export const PROFILE_PHOTO_BUCKET = "profile-photos";
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function profilePhotoError(file: { type: string; size: number }): string | null {
  if (!PHOTO_EXTENSIONS[file.type]) return "Choose a JPG, PNG or WebP photo.";
  if (file.size <= 0) return "This photo is empty. Choose another photo.";
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return "Choose a photo smaller than 5 MB.";
  return null;
}

export function profilePhotoPath(userId: string, type: string, id: string): string {
  const extension = PHOTO_EXTENSIONS[type];
  if (!extension) throw new Error("Unsupported photo format.");
  return `${userId}/${id}.${extension}`;
}