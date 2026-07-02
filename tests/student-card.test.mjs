import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const sourceUrl = new URL("../scripts/student-card.js", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
let id = 0;

const context = vm.createContext({
  console,
  crypto: webcrypto,
  setTimeout,
  clearTimeout,
  Hooks: { once() {}, on() {} },
  CONFIG: {
    DND5E: {
      abilities: { str: { label: "Strength" } },
      skills: { acr: { label: "Acrobatics" } },
      tools: { alch: { label: "Alchemist's Supplies" } }
    }
  },
  game: {
    user: { id: "player", isGM: false },
    settings: { register() {}, get: () => true },
    i18n: {
      localize: (value) => value,
      format: (value, data = {}) => {
        const templates = {
          "SSC.AbilityTestLabel": "{ability} check",
          "SSC.AbilitySaveLabel": "{ability} save"
        };
        const template = templates[value] ?? value;
        return Object.entries(data).reduce((text, [key, item]) => text.replaceAll(`{${key}}`, item), template);
      }
    }
  },
  foundry: {
    applications: { api: {} },
    dice: {},
    documents: {},
    utils: { randomID: () => `test-id-${++id}` }
  }
});

vm.runInContext(`${source}\n;globalThis.__sscTests = {
  applySkillSelection,
  clamp,
  consumeRelationshipInspiration,
  countVisibleYears,
  defaultData,
  defaultExam,
  findSkillOption,
  getActorSkillOptions,
  getRollPromptLabel,
  getSkillSelectionLimit,
  normalizeCardData,
  resetDiceAfterLongRest,
  revealNextYear,
  splitSkills,
  syncExtracurricularDice,
  updateExamDice
};`, context, { filename: sourceUrl.pathname });

const {
  applySkillSelection,
  clamp,
  consumeRelationshipInspiration,
  countVisibleYears,
  defaultData,
  defaultExam,
  findSkillOption,
  getActorSkillOptions,
  getRollPromptLabel,
  getSkillSelectionLimit,
  normalizeCardData,
  resetDiceAfterLongRest,
  revealNextYear,
  splitSkills,
  syncExtracurricularDice,
  updateExamDice
} = context.__sscTests;

const malformed = normalizeCardData({
  relationships: "invalid",
  visibleYears: { 1: true, 2: false },
  exams: { 1: [{ rerolls: 99, d4s: -5, skills: 42, result: "invalid" }] },
  extracurriculars: [{ id: "duplicate", d4: true }, { id: "duplicate", d4: true }],
  job: null,
  dice: [{ id: "die" }, { id: "die" }]
});

assert.equal(malformed.dataVersion, 1);
assert.deepEqual(Array.from(malformed.relationships), []);
assert.equal(malformed.visibleYears[2], false);
assert.equal(malformed.exams[1].length, 3);
assert.equal(malformed.exams[1][0].rerolls, 2);
assert.equal(malformed.exams[1][0].d4s, 0);
assert.equal(malformed.exams[1][0].skills, "42");
assert.equal(malformed.exams[1][0].result, "");
assert.notEqual(malformed.extracurriculars[0].id, malformed.extracurriculars[1].id);
assert.notEqual(malformed.dice[0].id, malformed.dice[1].id);
assert.equal(malformed.visibleYears[3], false);
assert.equal(malformed.visibleYears[4], false);

const linked = normalizeCardData({
  extracurriculars: [{ id: "club", name: "Club", skills: "Acrobatics", d4: true }]
});
syncExtracurricularDice(linked);
assert.equal(linked.dice.length, 1);
assert.equal(linked.dice[0].extraId, "club");
assert.equal(linked.dice[0].source, "Club");
assert.equal(linked.dice[0].skills, "Acrobatics");
assert.equal(linked.dice[0].locked, true);

linked.extracurriculars[0].name = "Updated Club";
linked.extracurriculars[0].skills = "Acrobatics, Alchemist's Supplies";
syncExtracurricularDice(linked);
assert.equal(linked.dice.length, 1);
assert.equal(linked.dice[0].source, "Updated Club");
assert.equal(linked.dice[0].skills, "Acrobatics, Alchemist's Supplies");

linked.extracurriculars[0].d4 = false;
syncExtracurricularDice(linked);
assert.equal(linked.dice.length, 0);

const examData = defaultData();
examData.exams[1][0] = { ...defaultExam(), result: "aced", skills: "Acrobatics, Arcana" };
updateExamDice(examData, 1, 0);
assert.equal(examData.exams[1][0].d4s, 2);
assert.equal(examData.dice.length, 2);
assert.equal(examData.dice[0].examId, "year-1-exam-1");

applySkillSelection(examData, "exams.1.0.skills", ["Acrobatics", "Arcana", "History", "Nature"]);
assert.equal(examData.exams[1][0].skills, "Acrobatics, Arcana, History");
assert.equal(examData.dice[0].skills, "Acrobatics, Arcana, History");

applySkillSelection(examData, "extracurriculars.0.skills", ["Acrobatics", "Arcana", "History", "Nature"]);
assert.equal(getSkillSelectionLimit("extracurriculars.0.skills"), 3);
assert.equal(examData.extracurriculars[0]?.skills ?? "", "");

const extraData = defaultData();
extraData.extracurriculars.push({ id: "club", name: "Club", d4: true, skills: "", member: "" });
applySkillSelection(extraData, "extracurriculars.0.skills", ["Acrobatics", "Arcana", "History", "Nature"]);
assert.equal(extraData.extracurriculars[0].skills, "Acrobatics, Arcana, History");
assert.equal(countVisibleYears(extraData), 1);
assert.equal(revealNextYear(extraData), 2);
assert.equal(countVisibleYears(extraData), 2);

const inspirationData = defaultData();
inspirationData.relationships.push(
  { id: "friend-1", name: "Rosie", points: 0, beloved: false, inspiration: true, boonBane: "" },
  { id: "friend-2", name: "Aurora", points: 0, beloved: false, inspiration: true, boonBane: "" }
);
const spentInspiration = consumeRelationshipInspiration(inspirationData);
assert.equal(spentInspiration?.name, "Rosie");
assert.equal(inspirationData.relationships[0].inspiration, false);
assert.equal(inspirationData.relationships[1].inspiration, true);

assert.deepEqual(Array.from(splitSkills("Acrobatics or Arcana; Nature | History")), ["Acrobatics", "Arcana", "Nature", "History"]);
assert.equal(clamp(5, 1, 3), 3);
assert.equal(clamp(-1, 1, 3), 1);
assert.equal(clamp(2, 1, 3), 2);

const actor = {
  documentName: "Actor",
  type: "character",
  isOwner: true,
  id: "actor",
  flags: normalizeCardData({ dice: [{ id: "rest-die", used: true }] }),
  getFlag() { return this.flags; },
  async setFlag(_module, _key, value) {
    this.flags = value;
    this.updates = (this.updates ?? 0) + 1;
  }
};

await resetDiceAfterLongRest(actor, { type: "short", longRest: false }, { type: "short" });
assert.equal(actor.updates, undefined);
await resetDiceAfterLongRest(actor, { type: "long", longRest: true }, { type: "long" });
assert.equal(actor.updates, 1);
assert.equal(actor.flags.dice[0].used, false);

const skilledActor = {
  system: {
    skills: { acr: { total: 2 } },
    tools: { alch: { proficient: 1, total: 3, label: "Alchemist's Supplies" } },
    attributes: { prof: 2 }
  },
  items: []
};
const options = getActorSkillOptions(skilledActor);
assert.equal(findSkillOption(options, "acr")?.label, "Acrobatics");
assert.equal(findSkillOption(options, "tool:alch")?.label, "Alchemist's Supplies");
assert.equal(getRollPromptLabel(skilledActor, { skill: "acr" }, "skill"), "Acrobatics");
assert.equal(getRollPromptLabel(skilledActor, { tool: "alch" }, "tool"), "Alchemist's Supplies");
assert.equal(getRollPromptLabel(skilledActor, { ability: "str" }, "ability"), "Strength check");
assert.equal(getRollPromptLabel(skilledActor, { ability: "str" }, "save"), "Strength save");

console.log("student-card tests passed");
