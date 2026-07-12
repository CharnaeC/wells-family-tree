const TREE_STATE_KEY = "wells-tree-expanded-branches";

export function saveExpandedTreeState() {
  const expandedIds = Array.from(
    document.querySelectorAll(
      ".person-card[aria-expanded='true']"
    )
  )
    .map(card => card.dataset.personId)
    .filter(Boolean);

  sessionStorage.setItem(
    TREE_STATE_KEY,
    JSON.stringify(expandedIds)
  );
}

export function restoreExpandedTreeState() {
  const rawState =
    sessionStorage.getItem(TREE_STATE_KEY);

  if (!rawState) {
    return;
  }

  let expandedIds;

  try {
    expandedIds = JSON.parse(rawState);
  } catch (error) {
    console.warn(
      "The saved tree state could not be read.",
      error
    );

    sessionStorage.removeItem(TREE_STATE_KEY);
    return;
  }

  if (!Array.isArray(expandedIds)) {
    return;
  }

  expandedIds.forEach(personId => {
    const card = document.querySelector(
      `.person-card[data-person-id="${personId}"]`
    );

    if (!card) {
      return;
    }

    const panel = card
      .closest(".branch-node")
      ?.querySelector(
        ":scope > .descendant-panel"
      );

    if (!panel) {
      return;
    }

    panel.hidden = false;
    card.setAttribute(
      "aria-expanded",
      "true"
    );

    card.classList.add(
      "expanded-card"
    );

    const label =
      card.querySelector(
        ".expand-label"
      );

    if (label) {
      label.textContent =
        "Hide children −";
    }
  });
}
