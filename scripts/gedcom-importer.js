"use strict";

const fileInput = document.getElementById("gedcomFile");
const convertButton = document.getElementById("convertButton");
const downloadButton = document.getElementById("downloadButton");
const statusElement = document.getElementById("importStatus");
const summaryElement = document.getElementById("importSummary");
const includeLivingNotes = document.getElementById("includeLivingNotes");
const includeDeceasedDetails = document.getElementById("includeDeceasedDetails");

let generatedJson = "";

function normalizeLines(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function parseGedcom(text) {
  const lines = normalizeLines(text);
  const individuals = new Map();
  const families = new Map();

  let currentRecord = null;
  let currentEvent = null;
  let currentNote = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const match = line.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = Number(match[1]);
    const xref = match[2] || "";
    const tag = match[3];
    const value = (match[4] || "").trim();

    if (level === 0) {
      currentEvent = null;
      currentNote = null;

      if (tag === "INDI" && xref) {
        currentRecord = {
          type: "INDI",
          id: xref,
          name: "",
          sex: "",
          birth: {},
          death: {},
          notes: [],
          familyChild: [],
          familySpouse: [],
          mediaRefs: []
        };
        individuals.set(xref, currentRecord);
      } else if (tag === "FAM" && xref) {
        currentRecord = {
          type: "FAM",
          id: xref,
          husband: "",
          wife: "",
          children: [],
          marriage: {}
        };
        families.set(xref, currentRecord);
      } else {
        currentRecord = null;
      }
      continue;
    }

    if (!currentRecord) continue;

    if (currentRecord.type === "INDI") {
      if (level === 1) {
        currentEvent = null;
        currentNote = null;

        if (tag === "NAME") currentRecord.name = value;
        else if (tag === "SEX") currentRecord.sex = value;
        else if (tag === "FAMC") currentRecord.familyChild.push(value);
        else if (tag === "FAMS") currentRecord.familySpouse.push(value);
        else if (tag === "OBJE") currentRecord.mediaRefs.push(value);
        else if (tag === "BIRT") {
          currentEvent = currentRecord.birth;
        } else if (tag === "DEAT") {
          currentRecord.death.confirmed = true;
          currentEvent = currentRecord.death;
        } else if (tag === "NOTE") {
          currentNote = value;
          currentRecord.notes.push(value);
        }
      } else if (level === 2) {
        if (currentEvent && tag === "DATE") currentEvent.date = value;
        else if (currentEvent && tag === "PLAC") currentEvent.place = value;
        else if (tag === "CONT" && currentNote !== null) {
          currentRecord.notes[currentRecord.notes.length - 1] += "\n" + value;
        } else if (tag === "CONC" && currentNote !== null) {
          currentRecord.notes[currentRecord.notes.length - 1] += value;
        }
      }
    }

    if (currentRecord.type === "FAM") {
      if (level === 1) {
        currentEvent = null;

        if (tag === "HUSB") currentRecord.husband = value;
        else if (tag === "WIFE") currentRecord.wife = value;
        else if (tag === "CHIL") currentRecord.children.push(value);
        else if (tag === "MARR") currentEvent = currentRecord.marriage;
      } else if (level === 2 && currentEvent) {
        if (tag === "DATE") currentEvent.date = value;
        else if (tag === "PLAC") currentEvent.place = value;
      }
    }
  }

  return { individuals, families };
}

function cleanName(rawName) {
  const cleaned = (rawName || "Unknown")
    .replace(/\//g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ").filter(Boolean);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  const lastInitial = lastName ? `${lastName.charAt(0).toUpperCase()}.` : "";

  return {
    fullName: cleaned,
    firstName,
    lastName,
    publicLivingName: [firstName, lastInitial].filter(Boolean).join(" ")
  };
}

function determineLiving(person) {
  return !person.death?.confirmed && !person.death?.date;
}

function buildRelations(parsed) {
  const relations = new Map();

  for (const personId of parsed.individuals.keys()) {
    relations.set(personId, {
      parents: [],
      spouses: [],
      children: []
    });
  }

  for (const family of parsed.families.values()) {
    const spouses = [family.husband, family.wife].filter(Boolean);

    if (family.husband && family.wife) {
      relations.get(family.husband)?.spouses.push(family.wife);
      relations.get(family.wife)?.spouses.push(family.husband);
    }

    for (const childId of family.children) {
      const childRelations = relations.get(childId);
      if (childRelations) childRelations.parents.push(...spouses);

      for (const parentId of spouses) {
        relations.get(parentId)?.children.push(childId);
      }
    }
  }

  return relations;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function convertToPublicData(parsed) {
  const relations = buildRelations(parsed);
  const people = [];

  for (const [id, person] of parsed.individuals.entries()) {
    const name = cleanName(person.name);
    const living = determineLiving(person);
    const personRelations = relations.get(id) || {
      parents: [],
      spouses: [],
      children: []
    };

    const biography = person.notes.join("\n\n").trim();

    const output = {
      id: id.replace(/@/g, ""),
      living,
      displayName: living ? name.publicLivingName : name.fullName,
      profileName: living ? name.publicLivingName : name.fullName,
      biography:
        living && !includeLivingNotes.checked
          ? ""
          : biography,
      photo: "",
      parents: unique(personRelations.parents.map(ref => ref.replace(/@/g, ""))),
      spouses: unique(personRelations.spouses.map(ref => ref.replace(/@/g, ""))),
      children: unique(personRelations.children.map(ref => ref.replace(/@/g, "")))
    };

    if (!living && includeDeceasedDetails.checked) {
      output.birth = {
        date: person.birth?.date || "",
        place: person.birth?.place || ""
      };
      output.death = {
        date: person.death?.date || "",
        place: person.death?.place || ""
      };
    }

    people.push(output);
  }

  return {
    siteTitle: "Wells Family Tree",
    generatedAt: new Date().toISOString(),
    privacy: {
      livingDisplay: "First name and last initial",
      livingDatesAndPlacesIncluded: false,
      rawGedcomIncluded: false
    },
    people
  };
}

function downloadJson() {
  if (!generatedJson) return;

  const blob = new Blob([generatedJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "family.json";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

convertButton.addEventListener("click", async () => {
  const file = fileInput.files?.[0];

  if (!file) {
    statusElement.textContent = "Choose your GEDCOM file first.";
    return;
  }

  try {
    statusElement.textContent = "Reading and converting your GEDCOM…";
    summaryElement.hidden = true;
    downloadButton.hidden = true;

    const text = await file.text();
    const parsed = parseGedcom(text);

    if (parsed.individuals.size === 0) {
      throw new Error("No individual records were found in this GEDCOM.");
    }

    const publicData = convertToPublicData(parsed);
    generatedJson = JSON.stringify(publicData, null, 2);

    const livingCount = publicData.people.filter(person => person.living).length;
    const deceasedCount = publicData.people.length - livingCount;

    summaryElement.innerHTML = `
      <h3>Conversion complete</h3>
      <p><strong>Total relatives:</strong> ${publicData.people.length}</p>
      <p><strong>Living relatives:</strong> ${livingCount}</p>
      <p><strong>Deceased relatives:</strong> ${deceasedCount}</p>
      <p>
        Living relatives were converted to first name and last initial.
        Their birth and location details were not included.
      </p>
    `;

    summaryElement.hidden = false;
    downloadButton.hidden = false;
    statusElement.textContent =
      "Review the summary, then download the privacy-safe family.json file.";
  } catch (error) {
    console.error(error);
    statusElement.textContent =
      `The GEDCOM could not be converted: ${error.message}`;
  }
});

downloadButton.addEventListener("click", downloadJson);
