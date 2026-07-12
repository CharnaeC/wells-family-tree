"use strict";

const defaultPhoto =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <rect width="180" height="180" fill="#e9e1cf"/>
      <circle cx="90" cy="67" r="34" fill="#b38b2d"/>
      <path d="M32 164c8-42 32-63 58-63s50 21 58 63" fill="#234b34"/>
    </svg>
  `);

const treeContainer = document.getElementById("familyTree");
const searchInput = document.getElementById("familySearch");
const searchButton = document.getElementById("searchButton");
const clearSearchButton = document.getElementById("clearSearchButton");
const searchMessage = document.getElementById("searchMessage");
const expandAllButton = document.getElementById("expandAllButton");

const profileModal = document.getElementById("profileModal");
const closeProfileButton = document.getElementById("closeProfileButton");
const profilePhoto = document.getElementById("profilePhoto");
const profileStatus = document.getElementById("profileStatus");
const profileName = document.getElementById("profileName");
const profileBiography = document.getElementById("profileBiography");
const profileConnections = document.getElementById("profileConnections");

let familyData = null;
let peopleById = new Map();
let isEverythingExpanded = true;
const ROOT_PERSON_IDS = [
  "I500071",
  "I500194"
];
async function loadFamilyData() {
  try {
    const response = await fetch("data/family.json", {
      cache: "no-store"
    });

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

    renderTree();
    searchMessage.textContent =
      `${familyData.people.length} relatives are currently displayed.`;
  } catch (error) {
    console.error(error);

    treeContainer.innerHTML = `
      <p class="tree-error">
        The family data could not be loaded. Confirm that
        <strong>data/family.json</strong> exists in the repository.
      </p>
    `;

    searchMessage.textContent = error.message;
  }
}

function getPersonName(personId) {
  return peopleById.get(personId)?.displayName || "Unknown relative";
}

function findRootPeople() {
  const selectedRoots = ROOT_PERSON_IDS
    .map((personId) => peopleById.get(personId))
    .filter(Boolean);

  if (selectedRoots.length > 0) {
    return selectedRoots;
  }

  console.warn(
    "The selected root relatives were not found. Showing the first available relative."
  );

  return familyData.people.slice(0, 1);
}

function createPersonNode(person, visited = new Set()) {
  const listItem = document.createElement("li");
  listItem.className = "tree-person-item";
  listItem.dataset.personId = person.id;
  listItem.dataset.searchName =
    `${person.displayName} ${person.profileName || ""}`.toLowerCase();

  const nodeRow = document.createElement("div");
  nodeRow.className = "tree-node-row";

  const childPeople = (person.children || [])
    .map((childId) => peopleById.get(childId))
    .filter(Boolean)
    .filter((child) => !visited.has(child.id));

  const hasChildren = childPeople.length > 0;

  if (hasChildren) {
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "branch-toggle";
    toggleButton.textContent = "−";
    toggleButton.setAttribute("aria-expanded", "true");
    toggleButton.setAttribute(
      "aria-label",
      `Collapse the branch under ${person.displayName}`
    );

    nodeRow.appendChild(toggleButton);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "branch-toggle-placeholder";
    nodeRow.appendChild(placeholder);
  }

  const personButton = document.createElement("button");
  personButton.type = "button";
  personButton.className = "person-node";

  const photo = document.createElement("img");
  photo.src = person.photo || defaultPhoto;
  photo.alt = `${person.displayName} profile`;
  photo.className = "tree-person-photo";

  const textContainer = document.createElement("span");
  textContainer.className = "person-node-text";

  const name = document.createElement("strong");
  name.textContent = person.displayName;

  const status = document.createElement("small");
  status.textContent = person.living
    ? "Living relative"
    : "Family ancestor";

  textContainer.append(name, status);
  personButton.append(photo, textContainer);
  nodeRow.appendChild(personButton);
  listItem.appendChild(nodeRow);

  personButton.addEventListener("click", () => openProfile(person));

  if (hasChildren) {
    const childList = document.createElement("ul");
    childList.className = "tree-children";

    const nextVisited = new Set(visited);
    nextVisited.add(person.id);

    childPeople.forEach((child) => {
      childList.appendChild(createPersonNode(child, nextVisited));
    });

    listItem.appendChild(childList);

    const toggleButton = nodeRow.querySelector(".branch-toggle");

    toggleButton.addEventListener("click", () => {
      const expanded =
        toggleButton.getAttribute("aria-expanded") === "true";

      childList.hidden = expanded;
      toggleButton.textContent = expanded ? "+" : "−";
      toggleButton.setAttribute("aria-expanded", String(!expanded));
    });
  }

  return listItem;
}

function renderTree() {
  treeContainer.innerHTML = "";

  const rootList = document.createElement("ul");
  rootList.className = "tree-root";

  findRootPeople().forEach((rootPerson) => {
    rootList.appendChild(createPersonNode(rootPerson));
  });

  treeContainer.appendChild(rootList);
}

function clearHighlights() {
  document.querySelectorAll(".person-node.search-match").forEach((node) => {
    node.classList.remove("search-match");
  });
}

function expandAncestorBranches(element) {
  let current = element.parentElement;

  while (current && current !== treeContainer) {
    if (current.classList.contains("tree-children")) {
      current.hidden = false;

      const parentItem = current.closest(".tree-person-item");
      const toggle = parentItem?.querySelector(
        ":scope > .tree-node-row .branch-toggle"
      );

      if (toggle) {
        toggle.textContent = "−";
        toggle.setAttribute("aria-expanded", "true");
      }
    }

    current = current.parentElement;
  }
}

function searchFamily() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  clearHighlights();

  if (!searchTerm) {
    searchMessage.textContent = "Enter a name to search.";
    return;
  }

  const matches = Array.from(
    document.querySelectorAll(".tree-person-item")
  ).filter((item) => item.dataset.searchName.includes(searchTerm));

  if (matches.length === 0) {
    searchMessage.textContent =
      `No relatives were found for “${searchInput.value.trim()}.”`;
    return;
  }

  matches.forEach((item) => {
    expandAncestorBranches(item);

    const personNode = item.querySelector(
      ":scope > .tree-node-row .person-node"
    );

    personNode?.classList.add("search-match");
  });

  matches[0]
    ?.querySelector(":scope > .tree-node-row .person-node")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  searchMessage.textContent =
    `${matches.length} relative${matches.length === 1 ? "" : "s"} found.`;
}

function clearSearch() {
  searchInput.value = "";
  searchMessage.textContent =
    `${familyData?.people?.length || 0} relatives are currently displayed.`;
  clearHighlights();
  searchInput.focus();
}

function addConnection(label, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;

  const row = document.createElement("p");
  const strong = document.createElement("strong");

  strong.textContent = `${label}: `;

  row.appendChild(strong);
  row.appendChild(
    document.createTextNode(ids.map(getPersonName).join(", "))
  );

  profileConnections.appendChild(row);
}

function openProfile(person) {
  profilePhoto.src = person.photo || defaultPhoto;
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
    if (person.birth?.date || person.birth?.place) {
      const birthDetails = [
        person.birth?.date,
        person.birth?.place
      ].filter(Boolean);

      addTextDetail("Born", birthDetails.join(" — "));
    }

    if (person.death?.date || person.death?.place) {
      const deathDetails = [
        person.death?.date,
        person.death?.place
      ].filter(Boolean);

      addTextDetail("Died", deathDetails.join(" — "));
    }
  }

  profileModal.hidden = false;
  document.body.classList.add("modal-open");
  closeProfileButton.focus();
}

function addTextDetail(label, text) {
  if (!text) return;

  const row = document.createElement("p");
  const strong = document.createElement("strong");

  strong.textContent = `${label}: `;
  row.append(strong, document.createTextNode(text));

  profileConnections.appendChild(row);
}

function closeProfile() {
  profileModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function toggleAllBranches() {
  isEverythingExpanded = !isEverythingExpanded;

  document.querySelectorAll(".tree-children").forEach((list) => {
    list.hidden = !isEverythingExpanded;
  });

  document.querySelectorAll(".branch-toggle").forEach((button) => {
    button.textContent = isEverythingExpanded ? "−" : "+";
    button.setAttribute(
      "aria-expanded",
      String(isEverythingExpanded)
    );
  });

  expandAllButton.textContent = isEverythingExpanded
    ? "Collapse all"
    : "Expand all";
}

searchButton.addEventListener("click", searchFamily);
clearSearchButton.addEventListener("click", clearSearch);
expandAllButton.addEventListener("click", toggleAllBranches);
closeProfileButton.addEventListener("click", closeProfile);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchFamily();
});

profileModal.addEventListener("click", (event) => {
  if (event.target === profileModal) closeProfile();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !profileModal.hidden) {
    closeProfile();
  }
});

loadFamilyData();
