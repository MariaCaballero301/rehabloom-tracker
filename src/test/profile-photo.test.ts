import { describe, expect, it } from "vitest";
import { MAX_PROFILE_PHOTO_BYTES, profilePhotoError, profilePhotoPath } from "@/lib/profile-photo";

describe("profile photos", () => {
  it("accepts supported images up to the storage limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(profilePhotoError({ type, size: MAX_PROFILE_PHOTO_BYTES })).toBeNull();
    }
  });
  it("rejects files exceeding the bucket limit", () => {
    expect(profilePhotoError({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
  });
  it("rejects active content and empty files", () => {
    expect(profilePhotoError({ type: "image/svg+xml", size: 500 })).not.toBeNull();
    expect(profilePhotoError({ type: "image/jpeg", size: 0 })).not.toBeNull();
  });
  it("places uploads under the signed-in owner's folder with a safe extension", () => {
    expect(profilePhotoPath("owner-id", "image/jpeg", "photo-id")).toBe("owner-id/photo-id.jpg");
    expect(() => profilePhotoPath("owner-id", "text/html", "photo-id")).toThrow();
  });
});