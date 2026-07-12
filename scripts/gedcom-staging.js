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

const BATCH_SIZE = 100;

export async function stageGedcomImport({
  file,
  parsed
}) {
  const user = await requireSignedInUser();

  const importJob = await createImportJob({
    file,
    parsed,
    userId: user.id
  });

  try {
    await insertPeopleInBatches(
      importJob.id,
      parsed.people
    );

    await insertRelationshipsInBatches(
      importJob.id,
      parsed.relationships
    );

    await updateImportJob(importJob.id, {
      status: "ready",
      relationships_added: parsed.relationships.length,
      import_summary: {
        preview_only: false,
        staged_people: parsed.people.length,
        staged_relationships: parsed.relationships.length
      }
    });

    return {
      importJobId: importJob.id,
      peopleCount: parsed.people.length,
      relationshipCount: parsed.relationships.length
    };
  } catch (error) {
    await updateImportJob(importJob.id, {
      status: "failed",
      error_message: error.message
    });

    throw error;
  }
}

async function requireSignedInUser() {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const user = data.session?.user;

  if (!user) {
    window.location.replace("../admin/login.html");

    throw new Error(
      "Your administrator session has expired."
    );
  }

  return user;
}

async function createImportJob({
  file,
  parsed,
  userId
}) {
  const deceasedCount = parsed.people.filter(
    person => person.deceased
  ).length;

  const livingCount =
    parsed.people.length - deceasedCount;

  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      source_name: "MyHeritage",
      original_filename: file.name,
      status: "importing",
      total_people: parsed.people.length,
      total_families: parsed.families.length,
      living_people: livingCount,
      deceased_people: deceasedCount,
      created_by: userId,
      import_summary: {
        staging_started: true
      }
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function insertPeopleInBatches(
  importJobId,
  people
) {
  const rows = people.map(person => ({
    import_job_id: importJobId,
    gedcom_id: person.gedcomId,
    display_name: person.displayName,
    first_name: person.firstName || null,
    middle_name: person.middleName || null,
    last_name: person.lastName || null,
    suffix: person.suffix || null,
    sex: person.sex || null,
    is_living: person.isLiving,
    birth_date_text: person.birthDateText || null,
    birth_place: person.birthPlace || null,
    death_date_text: person.deathDateText || null,
    death_place: person.deathPlace || null,
    raw_record: person
  }));

  for (
    let index = 0;
    index < rows.length;
    index += BATCH_SIZE
  ) {
    const batch = rows.slice(
      index,
      index + BATCH_SIZE
    );

    const { error } = await supabase
      .from("import_people_staging")
      .insert(batch);

    if (error) {
      throw error;
    }
  }
}

async function insertRelationshipsInBatches(
  importJobId,
  relationships
) {
  const rows = relationships.map(
    relationship => ({
      import_job_id: importJobId,
      person_gedcom_id:
        relationship.personGedcomId,
      related_person_gedcom_id:
        relationship.relatedPersonGedcomId,
      relationship_type:
        relationship.relationshipType,
      raw_record: relationship
    })
  );

  for (
    let index = 0;
    index < rows.length;
    index += BATCH_SIZE
  ) {
    const batch = rows.slice(
      index,
      index + BATCH_SIZE
    );

    const { error } = await supabase
      .from("import_relationships_staging")
      .insert(batch);

    if (error) {
      throw error;
    }
  }
}

async function updateImportJob(
  importJobId,
  updates
) {
  const { error } = await supabase
    .from("import_jobs")
    .update(updates)
    .eq("id", importJobId);

  if (error) {
    console.error(
      "Unable to update import job:",
      error
    );
  }
}
