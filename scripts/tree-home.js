import {
  loadPublicProfileMap
} from "./public-family-data.js";

import {
  restoreExpandedTreeState
} from "./tree-state.js";

import {
  openTreeProfile,
  getTreeProfilePhoto
} from "./tree-profiles.js";
"use strict";

const FOUNDERS = [
  {
    id: "I500071",
    label: "Nathaniel Wells",
    childIds: [
      "I500124", "I500296", "I500320", "I500321", "I500093",
      "I500125", "I500010", "I500073", "I500123", "I500311",
      "I500177"
    ]
  },
  {
    id: "I500194",
    label: "William Wells",
    childIds: [
      "I500197", "I500239", "I500198", "I500235", "I500196"
    ]
  }
];

const DEFAULT_PHOTO =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <rect width="180" height="180" fill="#e9e1cf"/>
      <circle cx="90" cy="67" r="34" fill="#b38b2d"/>
      <path d="M32 164c8-42 32-63 58-63s50 21 58 63" fill="#234b34"/>
    </svg>
  `);

const founderContainer = document.getElementById("founderBranches");
const searchInput = document.getElementById("familySearch");
const searchButton = document.getElementById("searchButton");
const clearSearchButton = document.getElementById("clearSearchButton");
const searchMessage = document.getElementById("searchMessage");

const profileModal = document.getElementById("profileModal");
const closeProfileButton = document.getElementById("closeProfileButton");
const profilePhoto = document.getElementById("profilePhoto");
const profileStatus = document.getElementById("profileStatus");
const profileName = document.getElementById("profileName");
const profileBiography = document.getElementById("profileBiography");
const profileConnections = document.getElementById("profileConnections");

let familyData = null;
let peopleById = new Map();

async function loadFamilyData() {
  try {
    const response = await fetch("data/family.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load family.json (${response.status})`);
    }

    familyData = await response.json();
    if (!Array.isArray(familyData.people)) {
      throw new Error("family.json does not contain a people list.");
    }

    peopleById = new Map(
      familyData.people.map((person) => [person.id, person])
    );

    renderFounders();
    searchMessage.textContent =
      `${familyData.people.length} relatives are available to search.`;
  } catch (error) {
    console.error(error);
    founderContainer.innerHTML = `
      <p class="tree-error">
        The family tree could not be loaded. Confirm that
        <strong>data/family.json</strong> exists.
      </p>
    `;
  }
}

function getInitials(name) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function createPhoto(person, className) {
  const wrap = document.createElement("span");
  wrap.className = `${className} person-photo-wrap`;

  if (person?.photo) {
    const image = document.createElement("img");
    image.src = person.photo;
    image.alt = `${person.displayName} profile`;
    image.loading = "lazy";

    image.addEventListener("error", () => {
      wrap.innerHTML = "";
      const initials = document.createElement("span");
      initials.className = "person-initials";
      initials.textContent = getInitials(person.displayName);
      wrap.appendChild(initials);
    });

    wrap.appendChild(image);
  } else {
    const initials = document.createElement("span");
    initials.className = "person-initials";
    initials.textContent = getInitials(person?.displayName);
    wrap.appendChild(initials);
  }

  return wrap;
}

function renderFounders() {
  founderContainer.innerHTML = "";

  FOUNDERS.forEach((config) => {
    const founder = peopleById.get(config.id) || {
      id: config.id,
      displayName: config.label,
      photo: ""
    };

    const section = document.createElement("article");
    section.className = "hybrid-founder-section";

    const founderCard = createCard(founder, {
      type: "founder",
      relationship: "Founding generation",
      expandable: false
    });

    const stem = document.createElement("div");
    stem.className = "founder-stem";

    const childGrid = document.createElement("div");
    childGrid.className = "founder-child-grid";

    config.childIds.forEach((childId) => {
      const child = peopleById.get(childId);
      if (!child) return;

      childGrid.appendChild(
        createBranchNode(child, {
          parent: founder,
          founder,
          depth: 1,
          orientation: "vertical",
          visited: new Set()
        })
      );
    });

    section.append(founderCard, stem, childGrid);
    founderContainer.appendChild(section);
  });
}

function createBranchNode(person, context) {
  const wrapper = document.createElement("div");
  wrapper.className = `branch-node depth-${context.depth}`;
  wrapper.dataset.personId = person.id;

  const visited = new Set(context.visited);
  visited.add(person.id);

  const children = (person.children || [])
    .map((id) => peopleById.get(id))
    .filter(Boolean)
    .filter((child) => !visited.has(child.id));

  const relationship = relationshipLabel(context.depth, context.parent, context.founder);

  const card = createCard(person, {
    type: "person",
    relationship,
    expandable: children.length > 0
  });

  wrapper.appendChild(card);

  if (children.length > 0) {
    const descendants = document.createElement("div");
    descendants.className = `descendant-panel ${context.orientation}`;
    descendants.hidden = true;

    const connector = document.createElement("div");
    connector.className = "relationship-connector";

    const connectorLabel = document.createElement("span");
    connectorLabel.className = "relationship-chip";
    connectorLabel.textContent =
      children.length === 1 ? "1 child" : `${children.length} children`;
    connector.appendChild(connectorLabel);

    const nextOrientation = chooseOrientation(children.length, context.depth + 1);
    const childContainer = document.createElement("div");
    childContainer.className = `descendant-group ${nextOrientation}`;

    children.forEach((child) => {
      childContainer.appendChild(
        createBranchNode(child, {
          parent: person,
          founder: context.founder,
          depth: context.depth + 1,
          orientation: nextOrientation,
          visited
        })
      );
    });

    descendants.append(connector, childContainer);
    wrapper.appendChild(descendants);

    card.addEventListener("click", (event) => {
      if (event.target.closest(".profile-link")) return;

      const expanded = card.getAttribute("aria-expanded") === "true";
      descendants.hidden = expanded;
      card.setAttribute("aria-expanded", String(!expanded));
      card.classList.toggle("expanded-card", !expanded);

      const action = card.querySelector(".expand-label");
      if (action) {
        action.textContent = expanded ? "Show children +" : "Hide children −";
      }
    });
  }

  return wrapper;
}

function chooseOrientation(childCount, depth) {
  if (childCount >= 4) return "vertical";
  if (childCount <= 3 && depth % 2 === 0) return "horizontal";
  return "vertical";
}

function relationshipLabel(depth, parent, founder) {
  if (depth === 1) return `Child of ${founder.displayName}`;
  if (depth === 2) return `Grandchild of ${founder.displayName}`;
  if (depth === 3) return `Great-grandchild of ${founder.displayName}`;
  return `Generation ${depth + 1} descendant`;
}

function createCard(person, options) {
  const card = document.createElement("button");
  card.type = "button";
  card.className =
    options.type === "founder" ? "founder-card" : "person-card";
  card.dataset.personId = person.id;
  card.dataset.searchName =
    `${person.displayName} ${person.profileName || ""}`.toLowerCase();

  if (options.expandable) {
    card.setAttribute("aria-expanded", "false");
  }

  card.appendChild(
    createPhoto(
      person,
      options.type === "founder" ? "founder-photo" : "person-photo"
    )
  );

  const body = document.createElement("span");
  body.className = "card-body";

  const name = document.createElement("strong");
  name.textContent = person.displayName;

  const relation = document.createElement("span");
  relation.className = "relationship-label";
  relation.textContent = options.relationship;

  body.append(name, relation);

  if (options.expandable) {
    const expand = document.createElement("span");
    expand.className = "expand-label";
    expand.textContent = "Show children +";
    body.appendChild(expand);
  } else if (options.type !== "founder") {
    const end = document.createElement("span");
    end.className = "expand-label";
    end.textContent = "End of this line";
    body.appendChild(end);
  }

  card.appendChild(body);

  const profile = document.createElement("span");
  profile.className = "profile-link";
  profile.textContent = "View profile";
  profile.setAttribute("role", "button");
  profile.setAttribute("aria-label", `View ${person.displayName} profile`);
  profile.addEventListener("click", (event) => {
    event.stopPropagation();
    openProfile(person);
  });

  card.appendChild(profile);

  if (!options.expandable) {
    card.addEventListener("click", () => openProfile(person));
  }

  return card;
}

function findPath(currentId, targetId, visited = new Set()) {
  if (visited.has(currentId)) return null;
  visited.add(currentId);

  if (currentId === targetId) return [currentId];

  const person = peopleById.get(currentId);
  for (const childId of person?.children || []) {
    const path = findPath(childId, targetId, new Set(visited));
    if (path) return [currentId, ...path];
  }

  return null;
}

function findFounderPath(targetId) {
  for (const founder of FOUNDERS) {
    if (founder.id === targetId) return [founder.id];

    for (const childId of founder.childIds) {
      const path = findPath(childId, targetId);
      if (path) return [founder.id, ...path];
    }
  }

  return null;
}

function collapseAll() {
  document.querySelectorAll(".descendant-panel").forEach((panel) => {
    panel.hidden = true;
  });

  document.querySelectorAll(".person-card[aria-expanded]").forEach((card) => {
    card.setAttribute("aria-expanded", "false");
    card.classList.remove("expanded-card");
    const label = card.querySelector(".expand-label");
    if (label) label.textContent = "Show children +";
  });
}

function expandPath(targetId) {
  const path = findFounderPath(targetId);
  if (!path) return;

  collapseAll();

  path.slice(1, -1).forEach((id) => {
    const card = document.querySelector(`.person-card[data-person-id="${id}"]`);
    if (!card) return;

    const panel = card.closest(".branch-node")
      ?.querySelector(":scope > .descendant-panel");

    if (panel) {
      panel.hidden = false;
      card.setAttribute("aria-expanded", "true");
      card.classList.add("expanded-card");
      const label = card.querySelector(".expand-label");
      if (label) label.textContent = "Hide children −";
    }
  });
}

function clearHighlights() {
  document.querySelectorAll(".search-match").forEach((element) => {
    element.classList.remove("search-match");
  });
}

function searchFamily() {
  const term = searchInput.value.trim().toLowerCase();
  clearHighlights();

  if (!term) {
    searchMessage.textContent = "Enter a name to search.";
    return;
  }

  const matches = familyData.people.filter((person) =>
    `${person.displayName} ${person.profileName || ""}`
      .toLowerCase()
      .includes(term)
  );

  if (!matches.length) {
    searchMessage.textContent =
      `No relative was found for “${searchInput.value.trim()}.”`;
    return;
  }

  const first = matches[0];
  expandPath(first.id);

  requestAnimationFrame(() => {
    const element = document.querySelector(`[data-person-id="${first.id}"]`);
    if (element) {
      element.classList.add("search-match");
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  searchMessage.textContent =
    `${matches.length} relative${matches.length === 1 ? "" : "s"} found.`;
}

function clearSearch() {
  searchInput.value = "";
  clearHighlights();
  searchMessage.textContent =
    `${familyData?.people?.length || 0} relatives are available to search.`;
}

function addConnection(label, ids) {
  if (!Array.isArray(ids) || !ids.length) return;

  const row = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;

  const names = ids.map(
    (id) => peopleById.get(id)?.displayName || "Unknown relative"
  );

  row.append(strong, document.createTextNode(names.join(", ")));
  profileConnections.appendChild(row);
}

function addTextDetail(label, text) {
  if (!text) return;
  const row = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  row.append(strong, document.createTextNode(text));
  profileConnections.appendChild(row);
}

function openProfile(person) {
  profilePhoto.src = person.photo || DEFAULT_PHOTO;
  profilePhoto.alt = `${person.displayName} profile`;
  profileName.textContent = person.profileName || person.displayName;
  profileStatus.textContent = person.living
    ? "Living family member"
    : "Remembered family member";
  profileBiography.textContent =
    person.biography || "A biography has not been added yet.";

  profileConnections.innerHTML = "";
  addConnection("Parents", person.parents);
  addConnection("Spouse", person.spouses);
  addConnection("Children", person.children);

  if (!person.living) {
    addTextDetail(
      "Born",
      [person.birth?.date, person.birth?.place].filter(Boolean).join(" — ")
    );
    addTextDetail(
      "Died",
      [person.death?.date, person.death?.place].filter(Boolean).join(" — ")
    );
  }

  profileModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeProfile() {
  profileModal.hidden = true;
  document.body.classList.remove("modal-open");
}

searchButton.addEventListener("click", searchFamily);
clearSearchButton.addEventListener("click", clearSearch);
closeProfileButton.addEventListener("click", closeProfile);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchFamily();
});

profileModal.addEventListener("click", (event) => {
  if (event.target === profileModal) closeProfile();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !profileModal.hidden) closeProfile();
});

loadFamilyData();
