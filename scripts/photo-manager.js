import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from "./supabase-config.js";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

const PHOTO_BUCKET = "public-family-media";

export async function requireArchiveAdmin() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const user = sessionData.session?.user;

  if (!user) {
    window.location.replace("../admin/login.html");

    throw new Error(
      "Your administrator session has expired."
    );
  }

  const { data: admin, error: adminError } =
    await supabase
      .from("admin_profiles")
      .select("display_name, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

  if (adminError) {
    throw adminError;
  }

  if (!admin) {
    throw new Error(
      "This account is not an active archive administrator."
    );
  }

  return {
    user,
    admin
  };
}

export async function searchPeople(searchTerm = "") {
  let query = supabase
    .from("people")
    .select(
      "id, gedcom_id, display_name, full_name, is_living, profile_media_id"
    )
    .order("display_name", {
      ascending: true
    })
    .limit(100);

  const cleanTerm = searchTerm.trim();

  if (cleanTerm) {
    query = query.ilike(
      "display_name",
      `%${cleanTerm}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function uploadPhoto({
  file,
  title,
  caption,
  personIds,
  profilePersonId = null
}) {
  const { user } = await requireArchiveAdmin();

  validatePhoto(file);

  const storagePath = createStoragePath(file);

  const { error: uploadError } =
    await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false
      });

  if (uploadError) {
    throw uploadError;
  }

  try {
    const { data: media, error: mediaError } =
      await supabase
        .from("media")
        .insert({
          media_type: "photo",
          title:
            title?.trim() ||
            removeFileExtension(file.name),
          caption: caption?.trim() || null,
          storage_path: storagePath,
          is_public: true,
          is_approved: true,
          uploaded_by: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .select("id")
        .single();

    if (mediaError) {
      throw mediaError;
    }

    await tagPhotoToPeople(
      media.id,
      personIds,
      profilePersonId
    );

    if (profilePersonId) {
      await setProfilePhoto(
        profilePersonId,
        media.id
      );
    }

    return {
      mediaId: media.id,
      storagePath
    };
  } catch (error) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([storagePath]);

    throw error;
  }
}

async function tagPhotoToPeople(
  mediaId,
  personIds,
  profilePersonId
) {
  const uniquePersonIds =
    [...new Set(personIds || [])];

  if (!uniquePersonIds.length) {
    return;
  }

  const rows = uniquePersonIds.map(
    personId => ({
      media_id: mediaId,
      person_id: personId,
      is_profile_photo:
        personId === profilePersonId
    })
  );

  const { error } = await supabase
    .from("media_people")
    .insert(rows);

  if (error) {
    throw error;
  }
}

async function setProfilePhoto(
  personId,
  mediaId
) {
  const { error: clearError } =
    await supabase
      .from("media_people")
      .update({
        is_profile_photo: false
      })
      .eq("person_id", personId);

  if (clearError) {
    throw clearError;
  }

  const { error: tagError } =
    await supabase
      .from("media_people")
      .update({
        is_profile_photo: true
      })
      .eq("person_id", personId)
      .eq("media_id", mediaId);

  if (tagError) {
    throw tagError;
  }

  const { error: personError } =
    await supabase
      .from("people")
      .update({
        profile_media_id: mediaId
      })
      .eq("id", personId);

  if (personError) {
    throw personError;
  }
}

export function getPublicPhotoUrl(
  storagePath
) {
  const { data } = supabase.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

function validatePhoto(file) {
  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);

  if (!allowedTypes.has(file.type)) {
    throw new Error(
      `${file.name} is not a supported image format.`
    );
  }

  const maximumBytes = 10 * 1024 * 1024;

  if (file.size > maximumBytes) {
    throw new Error(
      `${file.name} is larger than 10 MB.`
    );
  }
}

function createStoragePath(file) {
  const dateFolder =
    new Date().toISOString().slice(0, 10);

  const safeFilename =
    sanitizeFilename(file.name);

  return (
    `approved/${dateFolder}/` +
    `${crypto.randomUUID()}-${safeFilename}`
  );
}

function sanitizeFilename(filename) {
  const extension =
    filename.includes(".")
      ? filename.split(".").pop().toLowerCase()
      : "jpg";

  const base = removeFileExtension(filename)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80) || "family-photo";

  return `${base}.${extension}`;
}

function removeFileExtension(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}
