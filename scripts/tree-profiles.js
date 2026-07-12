import {
  saveExpandedTreeState
} from "./tree-state.js";

export function openTreeProfile({
  person,
  publicProfileMap,
  fallback
}) {
  const publicProfile =
    publicProfileMap.get(person.id);

  if (publicProfile?.profileUrl) {
    saveExpandedTreeState();

    window.location.href =
      publicProfile.profileUrl;

    return;
  }

  if (typeof fallback === "function") {
    fallback(person);
  }
}

export function getTreeProfilePhoto(
  person,
  publicProfileMap
) {
  const publicProfile =
    publicProfileMap.get(person?.id);

  return (
    publicProfile?.profilePhotoUrl ||
    person?.photo ||
    null
  );
}
