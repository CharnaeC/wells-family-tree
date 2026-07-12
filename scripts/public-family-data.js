import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from "./supabase-config.js";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const PHOTO_BUCKET = "public-family-media";

/**
 * Loads public family members and their approved profile photographs.
 *
 * The returned Map uses GEDCOM IDs as keys so the existing tree can
 * connect its family.json records to Supabase without changing IDs.
 */
export async function loadPublicProfileMap() {
  const { data: people, error: peopleError } =
    await supabase
      .from("people")
      .select(`
        id,
        gedcom_id,
        display_name,
        is_living,
        profile_media_id
      `)
      .order("display_name", {
        ascending: true
      });

  if (peopleError) {
    throw peopleError;
  }

  const profileMediaIds = [
    ...new Set(
      (people || [])
        .map(person => person.profile_media_id)
        .filter(Boolean)
    )
  ];

  let mediaById = new Map();

  if (profileMediaIds.length) {
    const { data: media, error: mediaError } =
      await supabase
        .from("media")
        .select(`
          id,
          storage_path,
          is_public,
          is_approved
        `)
        .in("id", profileMediaIds)
        .eq("is_public", true)
        .eq("is_approved", true);

    if (mediaError) {
      throw mediaError;
    }

    mediaById = new Map(
      (media || []).map(item => [
        item.id,
        item
      ])
    );
  }

  const profileMap = new Map();

  (people || []).forEach(person => {
    if (!person.gedcom_id) {
      return;
    }

    const profileMedia =
      mediaById.get(
        person.profile_media_id
      );

    profileMap.set(
      person.gedcom_id,
      {
        personId: person.id,
        gedcomId: person.gedcom_id,
        displayName: person.display_name,
        isLiving: person.is_living,
        profilePhotoUrl:
          profileMedia?.storage_path
            ? getPublicPhotoUrl(
                profileMedia.storage_path
              )
            : null,
        profileUrl:
          `people/profile.html?id=${encodeURIComponent(
            person.id
          )}`
      }
    );
  });

  return profileMap;
}

export function getPublicPhotoUrl(
  storagePath
) {
  if (!storagePath) {
    return null;
  }

  const { data } = supabase.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
