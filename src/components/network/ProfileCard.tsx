// "Profile": phone, name, therapy areas, languages, availability, buddy/mentor opt-ins.
// Collapses to a green saved summary; the pencil reopens the form.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, Pencil, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_PHOTO_BUCKET, profilePhotoError, profilePhotoPath } from "@/lib/profile-photo";
import { ProfileAvatar } from "./ProfileAvatar";
import { normalizePhone } from "@/lib/alerts";
import { AVAILABILITY, LANGUAGES, MAX_BIO_LENGTH, REHAB_AREAS, toggleIn } from "@/lib/network";
import { db, type MyProfile } from "./useNetwork";
import { PROFILE_SAVED_EVENT } from "@/components/AccountProfile";

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${on ? "bg-primary text-primary-foreground" : "bg-card"}`}
    >
      {label}
    </button>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full border transition ${on ? "bg-success" : "bg-muted"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all ${on ? "left-7" : "left-0.5"}`}
      />
    </button>
  );
}

const EVERY_DAY = AVAILABILITY.map((a) => a.value as string);
type Full = MyProfile & { rehab_areas?: string[] };

export function ProfileCard({ profile, saved, onSaved }: { profile: MyProfile; saved: boolean; onSaved: () => void }) {
  const profileAreas = (profile as Full).rehab_areas;
  const initialAreas = profileAreas?.length ? profileAreas : profile.rehab_area !== "other" ? [profile.rehab_area] : [];
  const [p, setP] = useState(profile);
  const [areas, setAreas] = useState<string[]>(initialAreas);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(!saved);
  const picker = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  useEffect(() => setP(profile), [profile]);
  useEffect(() => setEditing(!saved), [saved]);
  useEffect(() => {
    void db.from("support_profiles").select("phone").eq("user_id", profile.user_id).maybeSingle()
      .then(({ data }) => setPhone((data as { phone?: string } | null)?.phone ?? ""));
  }, [profile.user_id]);
  const everyDay = EVERY_DAY.every((v) => p.availability.includes(v));

  const set = <K extends keyof MyProfile>(key: K, value: MyProfile[K]) =>
    setP((prev) => ({ ...prev, [key]: value }));

  async function save() {
    if (!p.display_name.trim()) return void toast.error("Add your name so others know who you are.");
    setSaving(true);
    const oldPath = profile.photo_path ?? null;
    let photoPath = removePhoto ? null : oldPath;
    let uploadedPath: string | null = null;
    try {
    if (photo) {
      try {
        const path = profilePhotoPath(p.user_id, photo.type, crypto.randomUUID());
        const { error: uploadError } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(path, photo, { contentType: photo.type });
        if (uploadError) throw uploadError;
        uploadedPath = path;
        photoPath = path;
      } catch {
        toast.error("Your photo couldn't be uploaded. Your other profile changes will still be saved.");
      }
    }
    const { error } = await db.from("network_profiles").upsert({
      user_id: p.user_id,
      display_name: p.display_name.trim(),
      rehab_area: areas[0] ?? "other",
      rehab_areas: areas,
      languages: p.languages,
      availability: p.availability,
      discoverable: p.discoverable,
      finished_therapy: p.finished_therapy,
      is_mentor: p.finished_therapy && p.is_mentor,
      mentor_bio: p.mentor_bio.trim(),
      photo_path: photoPath,
      share_exercise_counts: p.share_exercise_counts ?? false,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      if (uploadedPath) await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([uploadedPath]);
      throw new Error(error.message);
    }
    window.dispatchEvent(new Event(PROFILE_SAVED_EVENT));
    if (oldPath && photoPath !== oldPath) {
      await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([oldPath]).catch(() => {});
    }
    const clean = normalizePhone(phone);
    const ph = error ? null : await db.from("support_profiles").upsert({ user_id: p.user_id, phone: clean, updated_at: new Date().toISOString() });
    if (ph?.error) throw new Error(ph.error.message);
    setPhone(clean);
    setEditing(false);
    setPhoto(null);
    setRemovePhoto(false);
    toast.success("Profile saved");
    onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Your profile couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <section className="glass border-success bg-accent p-4 text-accent-foreground" aria-labelledby="profile-h">
        <div className="flex items-center gap-3">
          <ProfileAvatar userId={profile.user_id} name={profile.display_name} path={profile.photo_path ?? null} />
          <div className="min-w-0 flex-1">
            <h2 id="profile-h" className="text-lg">Profile</h2>
            <p className="truncate font-semibold">{profile.display_name}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-bold text-success"><Check className="h-4 w-4" /> Saved</span>
          <button className="btn-soft shrink-0" aria-label="Edit profile" title="Edit profile" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass p-5" aria-labelledby="profile-h">
      <h2 id="profile-h" className="flex items-center gap-2 text-xl">
        <UserRound className="h-5 w-5" /> Profile
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Others can see your photo, name, rehab areas, languages and availability, but never your
        exercise instructions or pain. Completed exercise totals are shared with connected buddies only if you choose below.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ProfileAvatar userId={profile.user_id} name={p.display_name} path={removePhoto ? null : profile.photo_path ?? null} preview={preview} large />
        <div className="space-y-2">
          <p className="text-sm font-semibold">Profile photo</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="btn-soft rounded-full" disabled={saving} onClick={() => picker.current?.click()}>
              <Camera /> {photo || (!removePhoto && profile.photo_path) ? "Change photo" : "Add photo"}
            </Button>
            {(photo || (!removePhoto && profile.photo_path)) && <Button variant="ghost" size="icon" className="btn-soft rounded-full" title="Remove photo" aria-label="Remove photo" disabled={saving} onClick={() => { setPhoto(null); setRemovePhoto(true); }}><Trash2 /></Button>}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG or WebP · Up to 5 MB</p>
        </div>
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose profile photo" disabled={saving} onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const error = profilePhotoError(file);
          if (error) return void toast.error(error);
          setPhoto(file);
          setRemovePhoto(false);
        }} />
      </div>

      <label className="mt-3 block text-sm font-semibold">
        Phone (so your support network can call you)
        <input type="tel" className="field mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 919 555 0100" />
      </label>

      <label className="mt-3 block text-sm font-semibold">
        Your name
        <input
          className="field mt-1"
          maxLength={60}
          value={p.display_name}
          onChange={(e) => set("display_name", e.target.value)}
          placeholder="e.g. Ana"
        />
      </label>

      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">Areas for therapy</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {REHAB_AREAS.map((a) => (
            <Chip key={a.value} label={a.label} on={areas.includes(a.value)} onClick={() => setAreas(toggleIn(areas, a.value))} />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">Languages</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Chip
              key={l}
              label={l}
              on={p.languages.includes(l)}
              onClick={() => set("languages", toggleIn(p.languages, l))}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">When are you usually free?</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {AVAILABILITY.map((a) => (
            <Chip
              key={a.value}
              label={a.label}
              on={p.availability.includes(a.value)}
              onClick={() => set("availability", toggleIn(p.availability, a.value))}
            />
          ))}
          <Chip
            label="Every day"
            on={everyDay}
            onClick={() => set("availability", everyDay ? [] : EVERY_DAY)}
          />
        </div>
      </fieldset>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold">
        <span>
          Let others find me as a rehab buddy
          <span className="block text-xs font-normal text-muted-foreground">
            Off by default. You can turn it off any time.
          </span>
        </span>
        <Switch
          on={p.discoverable}
          onChange={(v) => set("discoverable", v)}
          label="Let others find me as a rehab buddy"
        />
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm font-semibold">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={p.share_exercise_counts ?? false} onChange={(e) => set("share_exercise_counts", e.target.checked)} />
        <span>Share my completed exercise totals with rehab buddies
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Today, this week and all-time. Optional; off by default.</span>
        </span>
      </label>

      <div className="mt-4 rounded-2xl border bg-popover p-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={p.finished_therapy}
            onChange={(e) =>
              setP((prev) => ({
                ...prev,
                finished_therapy: e.target.checked,
                is_mentor: e.target.checked && prev.is_mentor,
              }))
            }
          />
          I've finished my physical therapy 🎓
        </label>
        {p.finished_therapy && (
          <>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold">
              <span>
                Volunteer as a mentor
                <span className="block text-xs font-normal text-muted-foreground">
                  Share your experience with people who are just starting.
                </span>
              </span>
              <Switch
                on={p.is_mentor}
                onChange={(v) => set("is_mentor", v)}
                label="Volunteer as a mentor"
              />
            </div>
            {p.is_mentor && (
              <label className="mt-3 block text-sm font-semibold">
                A few words about your recovery
                <textarea
                  className="field mt-1"
                  rows={3}
                  maxLength={MAX_BIO_LENGTH}
                  value={p.mentor_bio}
                  onChange={(e) => set("mentor_bio", e.target.value)}
                  placeholder="Knee surgery in 2024 — happy to share what helped me stay motivated."
                />
              </label>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn-aqua" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved && <button className="btn-soft" disabled={saving} onClick={() => { setP(profile); setPhoto(null); setRemovePhoto(false); setEditing(false); }}>Cancel</button>}
      </div>
    </section>
  );
}
