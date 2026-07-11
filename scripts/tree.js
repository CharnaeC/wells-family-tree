"use strict";

/*
  Stage 2 uses fictional sample information.

  During Stage 3, this sample data will be replaced with a
  privacy-safe version of the Wells family information.
*/

const defaultPhoto =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <rect width="180" height="180" fill="#e9e1cf"/>
      <circle cx="90" cy="67" r="34" fill="#b38b2d"/>
      <path d="M32 164c8-42 32-63 58-63s50 21 58 63" fill="#234b34"/>
    </svg>
  `);

const familyData = {
  id: "james-wells",
  displayName: "James Wells",
  fullName: "James Wells",
  living: false,
  biography:
    "This is sample information used to demonstrate the Wells Family Tree website.",
  photo: defaultPhoto,
  spouse: "Margaret Wells",
  parents: [],
  childrenNames: ["Robert Wells", "Linda Wells"],
  children: [
    {
      id: "robert-wells",
      displayName: "Robert Wells",
      fullName: "Robert Wells",
      living: false,
      biography:
        "Robert’s sample profile demonstrates how biographies and family connections will appear.",
      photo: defaultPhoto,
      spouse: "Denise Wells",
      parents: ["James Wells", "Margaret Wells"],
      childrenNames: ["Charnae C.", "Michael W."],
      children: [
        {
          id: "charnae-c",
          displayName: "Charnae C.",
          fullName: "Charnae Carr",
          living: true,
          biography:
            "This sample biography shows where an approved biography for a living relative can appear.",
          photo: defaultPhoto,
          spouse: "",
          parents: ["Robert Wells", "Denise Wells"],
          childrenNames: [],
          children: []
        },
        {
          id: "michael-w",
          displayName: "Michael W.",
          fullName: "Michael Wells",
          living: true,
          biography:
            "This is another sample profile for a living family member.",
          photo: defaultPhoto,
          spouse: "",
          parents: ["Robert Wells", "Denise Wells"],
          childrenNames: [],
          children: []
        }
      ]
    },
    {
      id: "linda-wells",
      displayName: "Linda Wells",
      fullName: "Linda Wells",
      living: false,
      biography:
        "Linda’s sample profile illustrates another branch of the family tree.",
      photo: defaultPhoto,
      spouse: "",
      parents: ["James Wells", "Margaret Wells"],
      childrenNames: [],
      children: []
    }
  ]
};

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

let isEverythingExpanded = true;

function createPersonNode(person) {
  const listItem = document.createElement("li");
  listItem.className = "tree-person-item";
  listItem.dataset.personId = person.id;
  listItem.dataset.searchName =
    `${person.displayName} ${person.fullName}`.toLowerCase();

  const nodeRow = document.createElement("div");
  nodeRow.className = "tree-node-row";

  const hasChildren =
    Array.isArray(person.children) && person.children.length > 0;

  if (hasChildren) {
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "branch-toggle";
    toggleButton.textContent = "−";
    toggleButton.setAttribute(
      "aria-label",
      `Collapse the branch under ${person.displayName}`
    );
    toggleButton.setAttribute("aria-expanded", "true");

    nodeRow.appendChild(toggleButton);
  } else {
    const togglePlaceholder = document.createElement("span");
    togglePlaceholder.className = "branch-toggle-placeholder";
    nodeRow.appendChild(togglePlaceholder);
  }

  const personButton = document.createElement("button");
  personButton.type = "button";
  personButton.className = "person-node";
  personButton.dataset.personId = person.id;

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

  personButton.addEventListener("click", () => {
    openProfile(person);
  });

  if (hasChildren) {
    const childList = document.createElement("ul");
    childList.className = "tree-children";

    person.children.forEach((child) => {
      childList.appendChild(createPersonNode(child));
    });

    listItem.appendChild(childList);

    const toggleButton = nodeRow.querySelector(".branch-toggle");

    toggleButton.addEventListener("click", () => {
      const currentlyExpanded =
        toggleButton.getAttribute("aria-expanded") === "true";

      childList.hidden = currentlyExpanded;
      toggleButton.textContent = currentlyExpanded ? "+" : "−";
      toggleButton.setAttribute(
        "aria-expanded",
        String(!currentlyExpanded)
      );
      toggleButton.setAttribute(
        "aria-label",
        `${currentlyExpanded ? "Expand" : "Collapse"} the branch under ${
          person.displayName
        }`
      );
    });
  }

  return listItem;
}

function renderTree() {
  treeContainer.innerHTML = "";

  const rootList = document.createElement("ul");
  rootList.className = "tree-root";
  rootList.appendChild(createPersonNode(familyData));

  treeContainer.appendChild(rootList);
}

function flattenFamily(person, results = []) {
  results.push(person);

  if (Array.isArray(person.children)) {
    person.children.forEach((child) => {
      flattenFamily(child, results);
    });
  }

  return results;
}

function expandAncestorBranches(element) {
  let currentElement = element.parentElement;

  while (currentElement && currentElement !== treeContainer) {
    if (currentElement.classList.contains("tree-children")) {
      currentElement.hidden = false;

      const parentItem = currentElement.closest(".tree-person-item");

      if (parentItem) {
        const toggle = parentItem.querySelector(
          ":scope > .tree-node-row .branch-toggle"
        );

        if (toggle) {
          toggle.textContent = "−";
          toggle.setAttribute("aria-expanded", "true");
        }
      }
    }

    currentElement = currentElement.parentElement;
  }
}

function clearHighlights() {
  document.querySelectorAll(".person-node.search-match").forEach((node) => {
    node.classList.remove("search-match");
  });
}

function searchFamily() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  clearHighlights();

  if (!searchTerm) {
    searchMessage.textContent = "Enter a name to search.";
    searchInput.focus();
    return;
  }

  const matchingItems = Array.from(
    document.querySelectorAll(".tree-person-item")
  ).filter((item) => {
    return item.dataset.searchName.includes(searchTerm);
  });

  if (matchingItems.length === 0) {
    searchMessage.textContent =
      `No relatives were found for “${searchInput.value.trim()}.”`;
    return;
  }

  matchingItems.forEach((item) => {
    expandAncestorBranches(item);

    const personNode = item.querySelector(
      ":scope > .tree-node-row .person-node"
    );

    if (personNode) {
      personNode.classList.add("search-match");
    }
  });

  const firstMatch = matchingItems[0].querySelector(
    ":scope > .tree-node-row .person-node"
  );

  firstMatch?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  searchMessage.textContent =
    `${matchingItems.length} relative${
      matchingItems.length === 1 ? "" : "s"
    } found.`;
}

function clearSearch() {
  searchInput.value = "";
  searchMessage.textContent = "";
  clearHighlights();
  searchInput.focus();
}

function openProfile(person) {
  profilePhoto.src = person.photo || defaultPhoto;
  profilePhoto.alt = `${person.displayName} profile`;

  /*
    Living relatives use the privacy-safe display name.

    Their legal/full last name is not displayed in this public
    sample profile.
  */
  profileName.textContent = person.living
    ? person.displayName
    : person.fullName;

  profileStatus.textContent = person.living
    ? "Living family member"
    : "Remembered family member";

  profileBiography.textContent =
    person.biography || "A biography has not been added yet.";

  profileConnections.innerHTML = "";

  addConnection("Parents", person.parents);
  addConnection(
    "Spouse",
    person.spouse ? [person.spouse] : []
  );
  addConnection("Children", person.childrenNames);

  profileModal.hidden = false;
  document.body.classList.add("modal-open");
  closeProfileButton.focus();
}

function addConnection(label, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return;
  }

  const connectionRow = document.createElement("p");
  const labelElement = document.createElement("strong");

  labelElement.textContent = `${label}: `;
  connectionRow.appendChild(labelElement);
  connectionRow.appendChild(
    document.createTextNode(values.join(", "))
  );

  profileConnections.appendChild(connectionRow);
}

function closeProfile() {
  profileModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function toggleAllBranches() {
  const childLists = document.querySelectorAll(".tree-children");
  const toggleButtons = document.querySelectorAll(".branch-toggle");

  isEverythingExpanded = !isEverythingExpanded;

  childLists.forEach((list) => {
    list.hidden = !isEverythingExpanded;
  });

  toggleButtons.forEach((button) => {
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
  if (event.key === "Enter") {
    searchFamily();
  }
});

profileModal.addEventListener("click", (event) => {
  if (event.target === profileModal) {
    closeProfile();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !profileModal.hidden) {
    closeProfile();
  }
});

renderTree();

const allPeople = flattenFamily(familyData);
searchMessage.textContent =
  `${allPeople.length} sample relatives are currently displayed.`;
