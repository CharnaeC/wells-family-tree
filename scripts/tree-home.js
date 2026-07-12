"use strict";

const FOUNDERS = [
  { id: "I500071", label: "Nathaniel Wells", childIds: ["I500124","I500296","I500320","I500321","I500093","I500125","I500010","I500073","I500123","I500311","I500177"] },
  { id: "I500194", label: "William Wells", childIds: ["I500197","I500239","I500198","I500235","I500196"] }
];

const DEFAULT_PHOTO = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#e9e1cf"/><circle cx="90" cy="67" r="34" fill="#b38b2d"/><path d="M32 164c8-42 32-63 58-63s50 21 58 63" fill="#234b34"/></svg>`);

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
let openBranchId = null;

async function loadFamilyData() {
  try {
    const response = await fetch("data/family.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load family.json (${response.status})`);
    familyData = await response.json();
    if (!Array.isArray(familyData.people)) throw new Error("family.json does not contain a people list.");
    peopleById = new Map(familyData.people.map(person => [person.id, person]));
    renderFounderBranches();
    searchMessage.textContent = `${familyData.people.length} relatives are available to search.`;
  } catch (error) {
    console.error(error);
    founderContainer.innerHTML = `<p class="tree-error">The family tree could not be loaded. Confirm that <strong>data/family.json</strong> exists.</p>`;
  }
}

function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join("");
}

function photoElement(person, className) {
  if (person?.photo) {
    const img = document.createElement("img");
    img.className = className;
    img.src = person.photo;
    img.alt = `${person.displayName} profile`;
    img.addEventListener("error", () => { img.src = DEFAULT_PHOTO; });
    return img;
  }
  const span = document.createElement("span");
  span.className = `${className} person-initials`;
  span.textContent = initials(person?.displayName);
  return span;
}

function renderFounderBranches() {
  founderContainer.innerHTML = "";
  FOUNDERS.forEach(config => {
    const founder = peopleById.get(config.id) || { id: config.id, displayName: config.label, photo: "" };
    const section = document.createElement("article");
    section.className = "inline-founder-section";

    const founderButton = document.createElement("button");
    founderButton.type = "button";
    founderButton.className = "inline-founder-card";
    founderButton.append(photoElement(founder, "founder-photo"));
    const founderName = document.createElement("strong");
    founderName.textContent = founder.displayName;
    founderButton.append(founderName);
    founderButton.addEventListener("click", () => openProfile(founder));

    const stem = document.createElement("div");
    stem.className = "founder-stem";

    const childGrid = document.createElement("div");
    childGrid.className = "inline-child-grid";
    config.childIds.forEach(id => {
      const person = peopleById.get(id);
      if (person) childGrid.appendChild(createChildButton(person));
    });

    const expansion = document.createElement("div");
    expansion.className = "inline-branch-expansion";
    expansion.hidden = true;

    section.append(founderButton, stem, childGrid, expansion);
    founderContainer.appendChild(section);
  });
}

function createChildButton(person) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-child-card";
  button.dataset.personId = person.id;
  button.setAttribute("aria-expanded", "false");
  button.append(photoElement(person, "branch-child-photo"));
  const name = document.createElement("strong");
  name.textContent = person.displayName;
  const label = document.createElement("span");
  label.className = "branch-action-label";
  label.textContent = "Show descendants +";
  button.append(name, label);
  button.addEventListener("click", () => toggleBranch(person, button));
  return button;
}

function toggleBranch(person, button) {
  if (openBranchId === person.id) return closeAllBranches();
  closeAllBranches();
  const section = button.closest(".inline-founder-section");
  const expansion = section.querySelector(".inline-branch-expansion");
  expansion.innerHTML = "";
  expansion.appendChild(buildBranchPanel(person));
  expansion.hidden = false;
  button.classList.add("active-child-branch");
  button.setAttribute("aria-expanded", "true");
  button.querySelector(".branch-action-label").textContent = "Hide descendants −";
  openBranchId = person.id;
  expansion.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeAllBranches() {
  document.querySelectorAll(".inline-branch-expansion").forEach(panel => { panel.hidden = true; panel.innerHTML = ""; });
  document.querySelectorAll(".inline-child-card").forEach(button => {
    button.classList.remove("active-child-branch");
    button.setAttribute("aria-expanded", "false");
    const label = button.querySelector(".branch-action-label");
    if (label) label.textContent = "Show descendants +";
  });
  openBranchId = null;
}

function collectGenerations(rootId) {
  const generations = [];
  let currentIds = [rootId];
  const visited = new Set();
  while (currentIds.length) {
    const currentPeople = currentIds.filter(id => !visited.has(id)).map(id => peopleById.get(id)).filter(Boolean);
    if (!currentPeople.length) break;
    currentPeople.forEach(person => visited.add(person.id));
    generations.push(currentPeople);
    currentIds = [...new Set(currentPeople.flatMap(person => person.children || []))];
  }
  return generations;
}

function buildBranchPanel(rootPerson) {
  const panel = document.createElement("section");
  panel.className = "expanded-branch-panel";
  const heading = document.createElement("div");
  heading.className = "expanded-branch-heading";
  const wrap = document.createElement("div");
  wrap.innerHTML = `<p class="eyebrow">Expanded family line</p><h3>${rootPerson.displayName} Descendants</h3>`;
  const collapse = document.createElement("button");
  collapse.type = "button";
  collapse.className = "secondary-button";
  collapse.textContent = "Collapse branch";
  collapse.addEventListener("click", closeAllBranches);
  heading.append(wrap, collapse);
  panel.appendChild(heading);

  const generations = collectGenerations(rootPerson.id);
  generations.forEach((people, index) => {
    const row = document.createElement("section");
    row.className = "generation-row";
    const h4 = document.createElement("h4");
    h4.textContent = index === 0 ? "Selected branch" : `Generation ${index + 1}`;
    const grid = document.createElement("div");
    grid.className = "generation-card-grid";
    people.forEach(person => grid.appendChild(createGenerationCard(person)));
    row.append(h4, grid);
    panel.appendChild(row);
  });
  return panel;
}

function createGenerationCard(person) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "generation-person-card";
  card.dataset.personId = person.id;
  card.append(photoElement(person, "generation-person-photo"));
  const text = document.createElement("span");
  text.className = "generation-person-text";
  const name = document.createElement("strong");
  name.textContent = person.displayName;
  const detail = document.createElement("small");
  const count = (person.children || []).filter(id => peopleById.has(id)).length;
  detail.textContent = person.living ? "Living relative" : `${count} child${count === 1 ? "" : "ren"}`;
  text.append(name, detail);
  card.append(text);
  card.addEventListener("click", () => openProfile(person));
  return card;
}

function collectDescendantIds(rootId, result = new Set()) {
  if (result.has(rootId)) return result;
  result.add(rootId);
  const person = peopleById.get(rootId);
  (person?.children || []).forEach(id => collectDescendantIds(id, result));
  return result;
}

function findBranchChild(personId) {
  for (const founder of FOUNDERS) {
    if (founder.childIds.includes(personId)) return personId;
    for (const childId of founder.childIds) {
      if (collectDescendantIds(childId).has(personId)) return childId;
    }
  }
  return null;
}

function clearHighlights() {
  document.querySelectorAll(".tree-search-match").forEach(el => el.classList.remove("tree-search-match"));
}

function searchFamily() {
  const term = searchInput.value.trim().toLowerCase();
  clearHighlights();
  if (!term) { searchMessage.textContent = "Enter a name to search."; return; }
  const matches = familyData.people.filter(person => `${person.displayName} ${person.profileName || ""}`.toLowerCase().includes(term));
  if (!matches.length) { searchMessage.textContent = `No relative was found for “${searchInput.value.trim()}.”`; return; }
  const match = matches[0];
  const branchId = findBranchChild(match.id);
  if (branchId) {
    const button = document.querySelector(`.inline-child-card[data-person-id="${branchId}"]`);
    if (button && openBranchId !== branchId) toggleBranch(peopleById.get(branchId), button);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-person-id="${match.id}"].generation-person-card`) || document.querySelector(`[data-person-id="${match.id}"].inline-child-card`);
      if (el) { el.classList.add("tree-search-match"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
    });
  }
  searchMessage.textContent = `${matches.length} relative${matches.length === 1 ? "" : "s"} found.`;
}

function clearSearch() {
  searchInput.value = "";
  clearHighlights();
  searchMessage.textContent = `${familyData?.people?.length || 0} relatives are available to search.`;
}

function addConnection(label, ids) {
  if (!Array.isArray(ids) || !ids.length) return;
  const p = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  p.append(strong, document.createTextNode(ids.map(id => peopleById.get(id)?.displayName || "Unknown relative").join(", ")));
  profileConnections.appendChild(p);
}

function addText(label, text) {
  if (!text) return;
  const p = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  p.append(strong, document.createTextNode(text));
  profileConnections.appendChild(p);
}

function openProfile(person) {
  profilePhoto.src = person.photo || DEFAULT_PHOTO;
  profilePhoto.alt = `${person.displayName} profile`;
  profileName.textContent = person.profileName || person.displayName;
  profileStatus.textContent = person.living ? "Living family member" : "Remembered family member";
  profileBiography.textContent = person.biography || "A biography has not been added yet.";
  profileConnections.innerHTML = "";
  addConnection("Parents", person.parents);
  addConnection("Spouse", person.spouses);
  addConnection("Children", person.children);
  if (!person.living) {
    addText("Born", [person.birth?.date, person.birth?.place].filter(Boolean).join(" — "));
    addText("Died", [person.death?.date, person.death?.place].filter(Boolean).join(" — "));
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
searchInput.addEventListener("keydown", event => { if (event.key === "Enter") searchFamily(); });
profileModal.addEventListener("click", event => { if (event.target === profileModal) closeProfile(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !profileModal.hidden) closeProfile(); });
loadFamilyData();
