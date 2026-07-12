export function parseGedcom(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const people = new Map();
  const families = [];

  let currentRecord = null;
  let currentEvent = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const recordMatch = line.match(
      /^0\s+(@[^@]+@)\s+(INDI|FAM)$/
    );

    if (recordMatch) {
      const gedcomId = cleanId(recordMatch[1]);
      const recordType = recordMatch[2];

      currentEvent = null;

      if (recordType === "INDI") {
        currentRecord = {
          type: "INDI",
          gedcomId,
          displayName: "Unknown",
          firstName: "",
          middleName: "",
          lastName: "",
          suffix: "",
          sex: "",
          birthDateText: "",
          birthPlace: "",
          deathDateText: "",
          deathPlace: "",
          deceased: false
        };

        people.set(gedcomId, currentRecord);
      } else {
        currentRecord = {
          type: "FAM",
          gedcomId,
          husbandId: null,
          wifeId: null,
          childIds: []
        };

        families.push(currentRecord);
      }

      continue;
    }

    if (!currentRecord) {
      continue;
    }

    if (currentRecord.type === "INDI") {
      parseIndividualLine(
        line,
        currentRecord,
        event => {
          currentEvent = event;
        },
        () => currentEvent
      );
    }

    if (currentRecord.type === "FAM") {
      parseFamilyLine(
        line,
        currentRecord
      );
    }
  }

  const relationships =
    buildRelationships(families);

  return {
    people: Array.from(
      people.values()
    ).map(person => ({
      ...person,
      isLiving: !person.deceased
    })),

    families,

    relationships
  };
}

function parseIndividualLine(
  line,
  person,
  setEvent,
  getEvent
) {
  const nameMatch =
    line.match(/^1\s+NAME\s+(.+)$/);

  if (nameMatch) {
    const parsedName =
      parseName(nameMatch[1]);

    person.displayName =
      parsedName.displayName;

    person.firstName =
      parsedName.firstName;

    person.middleName =
      parsedName.middleName;

    person.lastName =
      parsedName.lastName;

    person.suffix =
      parsedName.suffix;

    setEvent(null);
    return;
  }

  const sexMatch =
    line.match(/^1\s+SEX\s+(.+)$/);

  if (sexMatch) {
    person.sex =
      sexMatch[1].trim();

    setEvent(null);
    return;
  }

  if (/^1\s+BIRT$/.test(line)) {
    setEvent("birth");
    return;
  }

  if (/^1\s+DEAT(?:\s+Y)?$/.test(line)) {
    person.deceased = true;
    setEvent("death");
    return;
  }

  const dateMatch =
    line.match(/^2\s+DATE\s+(.+)$/);

  if (dateMatch) {
    if (getEvent() === "birth") {
      person.birthDateText =
        dateMatch[1].trim();
    }

    if (getEvent() === "death") {
      person.deathDateText =
        dateMatch[1].trim();

      person.deceased = true;
    }

    return;
  }

  const placeMatch =
    line.match(/^2\s+PLAC\s+(.+)$/);

  if (placeMatch) {
    if (getEvent() === "birth") {
      person.birthPlace =
        placeMatch[1].trim();
    }

    if (getEvent() === "death") {
      person.deathPlace =
        placeMatch[1].trim();

      person.deceased = true;
    }
  }
}

function parseFamilyLine(
  line,
  family
) {
  const husbandMatch =
    line.match(
      /^1\s+HUSB\s+(@[^@]+@)$/
    );

  if (husbandMatch) {
    family.husbandId =
      cleanId(husbandMatch[1]);

    return;
  }

  const wifeMatch =
    line.match(
      /^1\s+WIFE\s+(@[^@]+@)$/
    );

  if (wifeMatch) {
    family.wifeId =
      cleanId(wifeMatch[1]);

    return;
  }

  const childMatch =
    line.match(
      /^1\s+CHIL\s+(@[^@]+@)$/
    );

  if (childMatch) {
    family.childIds.push(
      cleanId(childMatch[1])
    );
  }
}

function buildRelationships(
  families
) {
  const relationships = [];
  const seen = new Set();

  function addRelationship(
    personGedcomId,
    relatedPersonGedcomId,
    relationshipType
  ) {
    if (
      !personGedcomId ||
      !relatedPersonGedcomId
    ) {
      return;
    }

    const key =
      `${personGedcomId}|` +
      `${relatedPersonGedcomId}|` +
      `${relationshipType}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    relationships.push({
      personGedcomId,
      relatedPersonGedcomId,
      relationshipType
    });
  }

  families.forEach(family => {
    if (
      family.husbandId &&
      family.wifeId
    ) {
      addRelationship(
        family.husbandId,
        family.wifeId,
        "spouse"
      );

      addRelationship(
        family.wifeId,
        family.husbandId,
        "spouse"
      );
    }

    family.childIds.forEach(
      childId => {
        if (family.husbandId) {
          /*
            On the father's profile,
            the related person is his child.
          */
          addRelationship(
            family.husbandId,
            childId,
            "child"
          );

          /*
            On the child's profile,
            the related person is their parent.
          */
          addRelationship(
            childId,
            family.husbandId,
            "parent"
          );
        }

        if (family.wifeId) {
          /*
            On the mother's profile,
            the related person is her child.
          */
          addRelationship(
            family.wifeId,
            childId,
            "child"
          );

          /*
            On the child's profile,
            the related person is their parent.
          */
          addRelationship(
            childId,
            family.wifeId,
            "parent"
          );
        }
      }
    );
  });

  return relationships;
}

function parseName(rawName) {
  const normalized = rawName
    .replace(/\s+/g, " ")
    .trim();

  const surnameMatch =
    normalized.match(/\/([^/]+)\//);

  const lastName = surnameMatch
    ? surnameMatch[1].trim()
    : "";

  const withoutSurnameMarkers =
    normalized
      .replace(
        /\/[^/]+\//,
        lastName
      )
      .replace(/\s+/g, " ")
      .trim();

  const parts =
    withoutSurnameMarkers
      .split(" ")
      .filter(Boolean);

  const firstName =
    parts[0] || "";

  const suffixes = new Set([
    "Jr.",
    "Jr",
    "Sr.",
    "Sr",
    "II",
    "III",
    "IV"
  ]);

  let suffix = "";

  if (
    parts.length &&
    suffixes.has(
      parts[parts.length - 1]
    )
  ) {
    suffix = parts.pop();
  }

  const middleParts =
    parts.slice(1);

  if (
    lastName &&
    middleParts[
      middleParts.length - 1
    ] === lastName
  ) {
    middleParts.pop();
  }

  return {
    displayName:
      withoutSurnameMarkers ||
      "Unknown",

    firstName,

    middleName:
      middleParts.join(" "),

    lastName,

    suffix
  };
}

function cleanId(value) {
  return value
    .replaceAll("@", "")
    .trim();
}
