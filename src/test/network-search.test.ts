import { describe, it, expect } from "vitest";
import { searchByName, type DirectoryProfile } from "@/lib/network";

const person = (name: string): DirectoryProfile => ({
  user_id: name,
  display_name: name,
  rehab_area: "knee",
  languages: [],
  availability: [],
  discoverable: true,
  is_mentor: false,
  mentor_bio: "",
});

const people = [person("Maria"), person("Jaiden"), person("Zoé")];

describe("searchByName", () => {
  it("returns everyone when the search box is empty", () => {
    expect(searchByName(people, "")).toEqual(people);
    expect(searchByName(people, "   ")).toEqual(people);
  });

  it("matches a name regardless of case or stray spaces", () => {
    expect(searchByName(people, "mArIa").map((p) => p.display_name)).toEqual(["Maria"]);
    expect(searchByName(people, "  maria  ").map((p) => p.display_name)).toEqual(["Maria"]);
  });

  it("matches accents either way", () => {
    expect(searchByName(people, "zoe").map((p) => p.display_name)).toEqual(["Zoé"]);
    expect(searchByName(people, "Zoé").map((p) => p.display_name)).toEqual(["Zoé"]);
  });

  it("finds a person by part of their name", () => {
    expect(searchByName(people, "ria").map((p) => p.display_name)).toEqual(["Maria"]);
  });

  it("returns nobody when the name doesn't match", () => {
    expect(searchByName(people, "Ines")).toEqual([]);
  });
});
