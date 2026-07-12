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

const PHOTO_BUCKET =
  "public-family-media";

export async function loadPublicProfileMap() {
  const { data, error } =
    await supabase.rpc(
      "get_public_tree_profiles"
    );

  if (error) {
    throw error;
  }

  const profileMap = new Map();

  (data || []).forEach(person => {
    if (!person.gedcom_id) {
      return;
    }

    profileMap.set(
      person.gedcom_id,
      {
        personId: person.person_id,
        gedcomId: person.gedcom_id,
        displayName: person.display_name,
        isLiving: person.is_living,

        profilePhotoUrl:
          person.profile_storage_path
            ? getPublicPhotoUrl(
                person.profile_storage_path
              )
            : null,

        profileUrl:
          `people/profile.html?id=${encodeURIComponent(
            person.person_id
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
