const MODULE_ID = "student-card";
const LEGACY_MODULE_ID = "strixhaven-student-card";
const MODULE_VERSION = "1.1.16";
const DATA_VERSION = 1;
const FLAG_KEY = "card";
const MAX_IMPORT_BYTES = 1_000_000;
const MAX_PICKER_SKILLS = 3;
const SETTINGS = {
  SHOW_LAUNCHER: "showLauncher",
  RESET_ON_LONG_REST: "resetOnLongRest",
  PROMPT_STUDENT_DIE: "promptStudentDie"
};

const windows = new Map();
let activeSkillPicker = null;
const STUDENT_DICE_COLLAPSE_KEY = `${MODULE_ID}.studentDiceCollapsed`;

const EXTRACURRICULAR_PRESETS = [
  { name: "Dead Languages Society", skills: "Athletics, History", member: "Drazhomir Yarnask; Quentillius A. Melentor III" },
  { name: "Distinguished Society of Fine Artists", skills: "Performance or Sleight of Hand", member: "Cadoras Damellawar; Nora Ann Wu" },
  { name: "Dragonchess Club", skills: "Deception, Investigation", member: "Bhedum \"Rampart\" Sooviij; Tilana Kapule" },
  { name: "Dragonsguard Historical Society", skills: "Arcana, History", member: "Bhedum \"Rampart\" Sooviij" },
  { name: "Fantastical Horticulture Club", skills: "Nature, Survival", member: "Urzmaktok Grojsh" },
  { name: "Future Entrepreneurs of Strixhaven", skills: "Insight, Persuasion", member: "Grayson Wildemere" },
  { name: "Intramural Gymnastics Club", skills: "Acrobatics, Performance", member: "Zanther Bowen" },
  { name: "Intramural Silkball Club", skills: "Athletics, Intimidation", member: "Javenesh Stoutclaw; Melwythorne; Tilana Kapule" },
  { name: "Intramural Water-Dancing Club", skills: "Athletics, Performance", member: "Larine Arneza" },
  { name: "Live-Action Roleplaying Guild", skills: "Animal Handling, Performance", member: "Cadoras Damellawar; Rosimyffenbip \"Rosie\" Wuzfeddlims" },
  { name: "Mage Tower Cheer Squad", skills: "Perception, Persuasion", member: "Zanther Bowen" },
  { name: "Playactors Drama Guild", skills: "Arcana, Deception", member: "Quentillius A. Melentor III; Rubina Larkingdale" },
  { name: "Strixhaven Iron-Lifters Society", skills: "Athletics, Medicine", member: "Greta Gorunn" },
  { name: "Strixhaven Show Band Association", skills: "Sleight of Hand, Performance", member: "Aurora Luna Wynterstarr; Rubina Larkingdale" },
  { name: "Strixhaven Star", skills: "Investigation, Insight", member: "Grayson Wildemere; Mina Lee" },
  { name: "Student-Mages of Faith", skills: "Insight, Religion", member: "Melwythorne; Shuvadri Glintmantle" }
];

const JOB_PRESETS = [
  { employer: "Biblioplex", positions: "Book clerk; book shelver; cafe worker; cleanup crew member; garden tender; store worker", coworker: "Drazhomir Yarnask" },
  { employer: "Bow's End Tavern", positions: "Assistant manager; cleanup crew member; cook; host; server", coworker: "Javenesh Stoutclaw" },
  { employer: "Campus Grounds", positions: "Graffiti eraser; lawn manicurist; litter retriever; sidewalk sweeper; statuary repairer; trash collector", coworker: "Shuvadri Glintmantle" },
  { employer: "Campus Magic Labs", positions: "Cleanup crew member; specimen preparer; volunteer lab partner", coworker: "Urzmaktok Grojsh" },
  { employer: "Dormitories", positions: "Cleanup crew member; events assistant; front-desk worker; resident assistant", coworker: "Nora Ann Wu" },
  { employer: "Firejolt Cafe", positions: "Barista; cashier; cleanup crew member; server", coworker: "Mina Lee" },
  { employer: "Intramural Fields", positions: "Cleanup crew member; crowd manager; equipment assistant; groundskeeper; referee", coworker: "Rosimyffenbip \"Rosie\" Wuzfeddlims" },
  { employer: "Strixhaven Performing Arts Society", positions: "Cleanup crew member; general assistant; refreshments expert; stagehand; ticket taker; usher", coworker: "Larine Arneza" },
  { employer: "Strixhaven Stadium", positions: "Cleanup crew member; entertainment assistant; equipment assistant; groundskeeper; refreshments expert; ticket taker; usher", coworker: "Aurora Luna Wynterstarr; Greta Gorunn" }
];

const COLLEGES = [
  { id: "", label: "SSC.NoCollege" },
  { id: "lorehold", label: "SSC.Lorehold" },
  { id: "prismari", label: "SSC.Prismari" },
  { id: "quandrix", label: "SSC.Quandrix" },
  { id: "silverquill", label: "SSC.Silverquill" },
  { id: "witherbloom", label: "SSC.Witherbloom" }
];

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.SHOW_LAUNCHER, {
    name: "SSC.SettingShowLauncher",
    hint: "SSC.SettingShowLauncherHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => refreshLauncher()
  });

  game.settings.register(MODULE_ID, SETTINGS.RESET_ON_LONG_REST, {
    name: "SSC.SettingResetOnLongRest",
    hint: "SSC.SettingResetOnLongRestHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.PROMPT_STUDENT_DIE, {
    name: "SSC.SettingPromptStudentDie",
    hint: "SSC.SettingPromptStudentDieHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  refreshLauncher();
  setTimeout(refreshLauncher, 1000);
  setTimeout(refreshLauncher, 3000);
});

Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
  const actor = app?.actor ?? app?.document;
  if (!isCharacterActor(actor) || !canViewActor(actor)) return;
  buttons.unshift({
    label: game.i18n.localize("SSC.SheetButton"),
    class: "student-card-open",
    icon: "fas fa-graduation-cap",
    onclick: () => openStudentCard(actor)
  });
});

Hooks.on("renderActorSheet", injectActorSheetButton);
Hooks.on("renderActorSheetV2", injectActorSheetButton);
Hooks.on("tidy5e-sheet.renderActorSheet", injectActorSheetButton);
Hooks.on("renderActorDirectory", injectDirectoryButton);
Hooks.on("dnd5e.restCompleted", resetDiceAfterLongRest);
Hooks.on("dnd5e.rollSkill", (_rolls, data) => queueRollPrompts(data, "skill"));
Hooks.on("dnd5e.rollToolCheck", (_rolls, data) => queueRollPrompts(data, "tool"));
Hooks.on("dnd5e.rollAbilityTest", (_rolls, data) => queueRollPrompts(data, "ability"));
Hooks.on("dnd5e.rollAbilitySave", (_rolls, data) => queueRollPrompts(data, "save"));
Hooks.on("updateActor", refreshOpenCard);

function refreshLauncher() {
  document.querySelector(".ssc-launcher")?.remove();
  if (game.settings.get(MODULE_ID, SETTINGS.SHOW_LAUNCHER)) addLauncher();
}

function addLauncher() {
  if (document.querySelector(".ssc-launcher")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ssc-launcher";
  button.title = game.i18n.localize("SSC.OpenMyCard");
  button.innerHTML = `<i class="fas fa-graduation-cap"></i><span>${game.i18n.localize("SSC.OpenCard")}</span>`;
  button.addEventListener("click", () => {
    const actor = getCurrentActor();
    if (!actor) return ui.notifications?.warn?.(game.i18n.localize("SSC.NoActor"));
    openStudentCard(actor);
  });
  document.body.append(button);
}

function injectActorSheetButton(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!isCharacterActor(actor) || !canViewActor(actor)) return;

  const root = getHtmlRoot(html) ?? getHtmlRoot(app?.element);
  if (!root) return;

  const rail = findActorSheetRail(root);
  if (rail) {
    if (rail.querySelector(".ssc-sheet-rail-button")) return;
    rail.append(createActorSheetButton(actor, { compact: true }));
    return;
  }

  if (root.querySelector(".ssc-sheet-link")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "ssc-sheet-link";
  wrapper.dataset.actorId = actor.id;
  wrapper.append(createActorSheetButton(actor));
  root.classList.add("ssc-has-sheet-button");
  root.append(wrapper);
}

function createActorSheetButton(actor, { compact = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact ? "ssc-sheet-rail-button" : "ssc-sheet-button";
  button.dataset.sscSheetButton = actor.id;
  button.title = game.i18n.localize("SSC.SheetButton");
  button.setAttribute("aria-label", game.i18n.localize("SSC.SheetButton"));
  button.innerHTML = compact
    ? `<i class="fas fa-graduation-cap"></i>`
    : `<i class="fas fa-graduation-cap"></i> ${game.i18n.localize("SSC.SheetButton")}`;
  button.addEventListener("click", () => openStudentCard(actor));
  return button;
}

function findActorSheetRail(root) {
  return (
    root.querySelector('[data-tidy-sheet-part="sidebar-tabs"]') ??
    root.querySelector('[data-tidy-sheet-part="sheet-tabs"]') ??
    root.querySelector('[data-tidy-sheet-part="tabs"]') ??
    root.querySelector(".window-content .sheet-tabs") ??
    root.querySelector(".window-content .sheet-navigation") ??
    root.querySelector(".window-content nav.tabs") ??
    root.querySelector(".window-content .tabs") ??
    root.querySelector("nav.sheet-tabs") ??
    root.querySelector("nav.tabs") ??
    root.querySelector("aside .tabs") ??
    root.querySelector("[class*='sheet-tabs']") ??
    root.querySelector("[class*='sidebar'] .tabs")
  );
}

function injectDirectoryButton(_app, html) {
  if (!game.user?.isGM) return;
  const root = getHtmlRoot(html);
  if (!root || root.querySelector(".ssc-directory-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ssc-directory-button";
  button.innerHTML = `<i class="fas fa-graduation-cap"></i> ${game.i18n.localize("SSC.GmPanel")}`;
  button.addEventListener("click", openGmPanel);

  const header = root.querySelector(".directory-header, header");
  header?.append(button);
}

function getHtmlRoot(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html?.element instanceof HTMLElement) return html.element;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (Array.isArray(html)) return html.find((item) => item instanceof HTMLElement) ?? null;
  return null;
}

function getCurrentActor() {
  const controlled = canvas?.tokens?.controlled?.[0]?.actor;
  if (isCharacterActor(controlled) && canViewActor(controlled)) return controlled;
  if (isCharacterActor(game.user?.character) && canViewActor(game.user.character)) return game.user.character;
  return game.actors?.find((actor) => isCharacterActor(actor) && canViewActor(actor));
}

function isCharacterActor(actor) {
  return actor?.documentName === "Actor" && actor.type === "character";
}

function canViewActor(actor) {
  return game.user?.isGM || actor?.isOwner;
}

function canEditCard(_actor) {
  return game.user?.isGM;
}

function getSortedCharacterActors() {
  return game.actors
    .filter((actor) => isCharacterActor(actor))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function openGmPanel() {
  if (!game.user?.isGM) return;

  const id = "gm";
  closeWindow(id);
  const actors = getSortedCharacterActors();

  const panel = createWindow(id, game.i18n.localize("SSC.GmPanel"), `
    <section class="ssc-panel ssc-gm-panel">
      <div class="ssc-gm-toolbar">
        <p>${game.i18n.localize("SSC.GmSelectActor")}</p>
        <div class="ssc-actions">
          <button type="button" data-gm-action="export-all"><i class="fas fa-file-export"></i> ${game.i18n.localize("SSC.ExportAll")}</button>
        </div>
      </div>
      <div class="ssc-gm-grid">
        ${actors.map((actor) => renderGmActorCard(actor)).join("") || `<p class="ssc-empty">${game.i18n.localize("SSC.Empty")}</p>`}
      </div>
    </section>
  `);

  panel.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-open-actor], [data-gm-action]");
    if (!button) return;
    if (button.dataset.gmAction === "export-all") {
      exportAllCards();
      return;
    }
    const actor = game.actors.get(button.dataset.openActor);
    if (!actor) return;

    if (!button.dataset.gmAction || button.dataset.gmAction === "open") {
      openStudentCard(actor);
      return;
    }

    const data = getCardData(actor);
    if (button.dataset.gmAction === "reveal-next-year") {
      const revealedYear = revealNextYear(data);
      if (!revealedYear) {
        ui.notifications?.info?.(game.i18n.localize("SSC.AllYearsVisible"));
        return;
      }
      await saveCardData(actor, data);
      ui.notifications?.info?.(game.i18n.format("SSC.YearRevealed", { actor: actor.name, year: revealedYear }));
      refreshGmPanel(panel);
      return;
    }

    if (button.dataset.gmAction === "toggle-graduate") {
      data.graduated = !data.graduated;
      await saveCardData(actor, data);
      ui.notifications?.info?.(game.i18n.localize(data.graduated ? "SSC.GraduationSharedOn" : "SSC.GraduationSharedOff"));
      refreshGmPanel(panel);
      return;
    }

    if (button.dataset.gmAction === "reset-dice") {
      if (!data.dice.some((die) => die.used)) {
        ui.notifications?.info?.(game.i18n.localize("SSC.NoUsedDice"));
        return;
      }
      resetUsedDice(data);
      await saveCardData(actor, data);
      ui.notifications?.info?.(game.i18n.format("SSC.StudentDiceResetActor", { actor: actor.name }));
      refreshGmPanel(panel);
      return;
    }

    if (button.dataset.gmAction === "export") {
      exportCard(actor, data);
    }
  });
}

function renderGmActorCard(actor) {
  const data = getCardData(actor);
  const friends = data.relationships.filter((item) => relationshipStatus(item.points) === "friend").length;
  const rivals = data.relationships.filter((item) => relationshipStatus(item.points) === "rival").length;
  const usedDice = data.dice.filter((die) => die.used).length;
  const nextHiddenYear = [1, 2, 3, 4].find((year) => !data.visibleYears?.[year]);
  return `
    <article class="ssc-gm-actor" data-open-actor="${actor.id}">
      <img src="${escapeAttr(actor.img)}" alt="">
      <span class="ssc-gm-actor-summary">
        <strong>${escapeHtml(actor.name)}</strong>
        <small>${game.i18n.localize("SSC.Friend")}: ${friends} | ${game.i18n.localize("SSC.Rival")}: ${rivals} | ${game.i18n.localize("SSC.StudentDice")}: ${data.dice.length - usedDice}/${data.dice.length}</small>
        <small>${game.i18n.localize("SSC.VisibleYears")}: ${countVisibleYears(data)} / 4 | ${data.graduated ? game.i18n.localize("SSC.Graduated") : game.i18n.localize("SSC.NotGraduated")}</small>
      </span>
      <div class="ssc-gm-actor-actions">
        <button type="button" data-open-actor="${actor.id}" data-gm-action="open"><i class="fas fa-eye"></i> ${game.i18n.localize("SSC.Open")}</button>
        <button type="button" data-open-actor="${actor.id}" data-gm-action="reveal-next-year" ${nextHiddenYear ? "" : "disabled"}><i class="fas fa-unlock-alt"></i> ${nextHiddenYear ? game.i18n.format("SSC.RevealYear", { year: nextHiddenYear }) : game.i18n.localize("SSC.AllYearsVisible")}</button>
        <button type="button" data-open-actor="${actor.id}" data-gm-action="toggle-graduate"><i class="fas fa-user-graduate"></i> ${game.i18n.localize(data.graduated ? "SSC.HideGraduation" : "SSC.ShareGraduation")}</button>
        <button type="button" data-open-actor="${actor.id}" data-gm-action="reset-dice"><i class="fas fa-rotate-left"></i> ${game.i18n.localize("SSC.ResetDiceShort")}</button>
        <button type="button" data-open-actor="${actor.id}" data-gm-action="export"><i class="fas fa-download"></i> ${game.i18n.localize("SSC.Export")}</button>
      </div>
    </article>
  `;
}

function refreshGmPanel(panel) {
  if (panel?.dataset.windowId !== "gm") return;
  const root = panel.querySelector(".ssc-panel.ssc-gm-panel");
  if (!root) return;
  const actors = getSortedCharacterActors();
  root.innerHTML = `
    <div class="ssc-gm-toolbar">
      <p>${game.i18n.localize("SSC.GmSelectActor")}</p>
      <div class="ssc-actions">
        <button type="button" data-gm-action="export-all"><i class="fas fa-file-export"></i> ${game.i18n.localize("SSC.ExportAll")}</button>
      </div>
    </div>
    <div class="ssc-gm-grid">
      ${actors.map((actor) => renderGmActorCard(actor)).join("") || `<p class="ssc-empty">${game.i18n.localize("SSC.Empty")}</p>`}
    </div>
  `;
}

async function openStudentCard(actor) {
  if (!canViewActor(actor)) return ui.notifications?.warn?.(game.i18n.localize("SSC.NoPermission"));

  closeWindow(actor.id);
  const panel = createWindow(actor.id, `${game.i18n.localize("SSC.Title")}: ${actor.name}`, renderCard(actor, getCardData(actor)));
  bindCardEvents(panel, actor);
}

function createWindow(id, title, content) {
  const panel = document.createElement("div");
  panel.className = "ssc-window";
  panel.dataset.windowId = id;
  panel.innerHTML = `
    <header class="ssc-window-header">
      <h2>${escapeHtml(title)}</h2>
      <button type="button" class="ssc-window-close" title="${game.i18n.localize("SSC.Close")}" aria-label="${game.i18n.localize("SSC.Close")}"><i class="fas fa-times"></i></button>
    </header>
    ${content}
  `;

  document.body.append(panel);
  windows.set(id, panel);
  setupWindowControls(panel);
  return panel;
}

function setupWindowControls(panel) {
  makeDraggable(panel);
  panel.querySelector(".ssc-window-close")?.addEventListener("click", () => {
    windows.delete(panel.dataset.windowId);
    panel.remove();
  });
}

function closeWindow(id) {
  windows.get(id)?.remove();
  windows.delete(id);
}

function makeDraggable(panel) {
  const header = panel.querySelector(".ssc-window-header");
  if (!header) return;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let dragging = false;

  header.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    const rect = panel.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;
    header.setPointerCapture(event.pointerId);
  });

  header.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    panel.style.left = `${Math.max(8, originX + event.clientX - startX)}px`;
    panel.style.top = `${Math.max(8, originY + event.clientY - startY)}px`;
    panel.style.right = "auto";
  });

  header.addEventListener("pointerup", () => {
    dragging = false;
  });
}

function getCardData(actor) {
  return normalizeCardData(actor.getFlag(MODULE_ID, FLAG_KEY) ?? actor.getFlag(LEGACY_MODULE_ID, FLAG_KEY));
}

function normalizeCardData(value) {
  const source = isRecord(value) ? value : {};
  const job = isRecord(source.job) ? source.job : {};
  const validCollegeIds = new Set(COLLEGES.map((college) => college.id));
  const relationshipIds = new Set();
  const extracurricularIds = new Set();
  const dieIds = new Set();

  return {
    dataVersion: DATA_VERSION,
    relationships: asArray(source.relationships).map((item) => ({
      id: normalizeId(item?.id, relationshipIds),
      name: normalizeText(item?.name),
      points: normalizeNumber(item?.points),
      beloved: item?.beloved === true,
      inspiration: item?.inspiration === true,
      boonBane: normalizeText(item?.boonBane)
    })),
    college: validCollegeIds.has(source.college) ? source.college : "",
    graduated: source.graduated === true,
    visibleYears: normalizeVisibleYears(source.visibleYears),
    exams: normalizeExams(source.exams),
    extracurriculars: asArray(source.extracurriculars).map((item) => ({
      id: normalizeId(item?.id, extracurricularIds),
      name: normalizeText(item?.name),
      d4: item?.d4 === true,
      skills: normalizeText(item?.skills),
      member: normalizeText(item?.member)
    })),
    job: {
      employer: normalizeText(job.employer),
      position: normalizeText(job.position),
      coworker: normalizeText(job.coworker)
    },
    dice: asArray(source.dice).map((die) => ({
      id: normalizeId(die?.id, dieIds),
      ...(normalizeText(die?.examId) ? { examId: normalizeText(die.examId) } : {}),
      ...(normalizeText(die?.extraId) ? { extraId: normalizeText(die.extraId) } : {}),
      source: normalizeText(die?.source),
      skills: normalizeText(die?.skills),
      used: die?.used === true,
      locked: die?.locked === true
    }))
  };
}

function defaultData() {
  return {
    dataVersion: DATA_VERSION,
    relationships: [],
    college: "",
    graduated: false,
    visibleYears: {
      1: true,
      2: true,
      3: true,
      4: true
    },
    exams: {
      1: defaultExams(3),
      2: defaultExams(3),
      3: defaultExams(3),
      4: defaultExams(3)
    },
    extracurriculars: [],
    job: {
      employer: "",
      position: "",
      coworker: ""
    },
    dice: []
  };
}

function normalizeExams(exams) {
  const source = isRecord(exams) ? exams : {};
  const normalized = {};
  for (const year of [1, 2, 3, 4]) {
    const entries = asArray(source[year]);
    normalized[year] = Array.from({ length: 3 }, (_item, index) => normalizeExam(entries[index]));
  }
  return normalized;
}

function defaultExams(count) {
  return Array.from({ length: count }, () => defaultExam());
}

function normalizeVisibleYears(visibleYears) {
  const source = isRecord(visibleYears) ? visibleYears : defaultData().visibleYears;
  const normalized = {};
  for (const year of [1, 2, 3, 4]) normalized[year] = source[year] !== false;
  return normalized;
}

function defaultExam() {
  return {
    rerolls: 0,
    d4s: 0,
    skills: "",
    result: ""
  };
}

function normalizeExam(exam) {
  if (!isRecord(exam)) return defaultExam();
  const validResults = new Set(["", "failed", "passed", "aced"]);
  const result = normalizeText(exam.result);
  return {
    rerolls: normalizeCount(exam.rerolls, 2),
    d4s: normalizeCount(exam.d4s, 2),
    skills: normalizeText(exam.skills),
    result: validResults.has(result) ? result : ""
  };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeCount(value, maximum) {
  return Math.min(maximum, Math.max(0, Math.trunc(normalizeNumber(value))));
}

function normalizeId(value, usedIds) {
  let id = normalizeText(value).trim();
  while (!id || usedIds?.has(id)) id = randomId();
  usedIds?.add(id);
  return id;
}

function renderCard(actor, data) {
  const editable = canEditCard(actor);
  const mode = editable ? game.i18n.localize("SSC.GmMode") : game.i18n.localize("SSC.PlayerMode");
  const visibleYears = [1, 2, 3, 4].filter((year) => editable || data.visibleYears?.[year]);
  const activeDice = data.dice.filter((die) => !die.used).length;
  const beloveds = data.relationships.filter((item) => item.beloved).length;
  const inspirations = data.relationships.filter((item) => item.inspiration).length;
  const hasExtracurriculars = data.extracurriculars.length > 0;
  const hasJob = Boolean(data.job.employer || data.job.position || data.job.coworker);
  const activityWarning = data.extracurriculars.length > (hasJob ? 1 : 2);
  const failedWarning = Object.values(data.exams).flat().some((exam) => exam.result === "failed");
  const currentCollegeKey = COLLEGES.find((college) => college.id === data.college)?.label ?? "SSC.NoCollege";
  const showGraduation = editable || data.graduated;
  const studentDiceCollapsed = getStudentDiceCollapsed(actor.id);

  return `
    <section class="ssc-panel student-card ssc-college-${escapeAttr(data.college || "none")}${editable ? " is-dense" : ""}" data-actor-id="${actor.id}" data-editable="${editable}">
      <div class="ssc-record-title">
        <span></span>
        <h1>${game.i18n.localize("SSC.StudentRecord")}</h1>
        <span></span>
      </div>

      <div class="ssc-card-top">
        <img src="${escapeAttr(actor.img)}" alt="">
        <div>
          <label>${game.i18n.localize("SSC.Actor")}</label>
          <strong>${escapeHtml(actor.name)}</strong>
          <span class="ssc-mode">${mode}</span>
        </div>
        <div class="ssc-summary">
          ${renderSummaryBadge("fa-dice-d20", `<b>${activeDice}</b> / ${data.dice.length}`, "SSC.StudentDice", "student-dice")}
          ${renderSummaryBadge("fa-heart", `<b>${beloveds}</b>`, "SSC.Beloved", "beloved")}
          ${renderSummaryBadge("fa-star", `<b>${inspirations}</b>`, "SSC.Inspiration", "inspiration")}
          <label class="ssc-college-picker">
            <span>${game.i18n.localize("SSC.College")}</span>
            ${editable
              ? `<select data-path="college">
                  ${COLLEGES.map((college) => `<option value="${college.id}" ${college.id === data.college ? "selected" : ""}>${game.i18n.localize(college.label)}</option>`).join("")}
                </select>`
              : `<strong class="ssc-summary-text">${escapeHtml(game.i18n.localize(currentCollegeKey))}</strong>`}
          </label>
        </div>
      </div>

      ${editable ? renderGmCardToolbar(data) : ""}
      ${activityWarning ? renderWarning("SSC.ActivityLimitWarning") : ""}
      ${failedWarning ? renderWarning("SSC.TutoringWarning") : ""}

      <div class="ssc-layout">
        <section class="ssc-section ssc-section-relationships">
          <div class="ssc-section-title">
            <h3><i class="fas fa-heart"></i> ${game.i18n.localize("SSC.Relationships")}</h3>
            ${editable ? `<button type="button" data-add="relationships"><i class="fas fa-plus"></i> ${game.i18n.localize("SSC.Add")}</button>` : ""}
          </div>
          <div class="ssc-table ssc-relationships">
            <div class="ssc-row ssc-head">
              <span>${game.i18n.localize("SSC.Name")}</span>
              <span>${game.i18n.localize("SSC.Points")}</span>
              <span>${game.i18n.localize("SSC.Relationship")}</span>
              <span><i class="fas fa-star"></i> ${game.i18n.localize("SSC.Inspiration")}</span>
              <span><i class="fas fa-theater-masks"></i> ${game.i18n.localize("SSC.BoonBane")}</span>
              <span></span>
            </div>
            ${data.relationships.map((item, index) => renderRelationship(item, index, editable)).join("") || renderEmptyRow(6)}
          </div>
        </section>

        <section class="ssc-section ssc-section-exams">
          <div class="ssc-section-title">
            <h3><i class="fas fa-scroll"></i> ${game.i18n.localize("SSC.ReportCards")}</h3>
          </div>
          <div class="ssc-exam-legend">
            ${renderExamLegendGroup()}
          </div>
          <div class="ssc-years">
            ${visibleYears.map((year) => renderYear(year, data.exams[year] ?? [], actor, editable)).join("") || `<p class="ssc-empty">${game.i18n.localize("SSC.NoVisibleYears")}</p>`}
          </div>
        </section>

        <section class="ssc-section ssc-section-lower">
          <div class="ssc-lower-grid">
            ${editable || hasExtracurriculars ? renderLowerCard(
              game.i18n.localize("SSC.Extracurriculars"),
              editable
                ? `<div class="ssc-lower-controls">
                    <select data-preset-add="extracurriculars">
                      <option value="">${game.i18n.localize("SSC.ChoosePreset")}</option>
                      ${EXTRACURRICULAR_PRESETS.map((item, index) => `<option value="${index}">${escapeHtml(item.name)}</option>`).join("")}
                    </select>
                    <button type="button" data-add="extracurriculars"><i class="fas fa-plus"></i> ${game.i18n.localize("SSC.AddBlank")}</button>
                  </div>`
                : "",
              `<div class="ssc-table ssc-extras">
                <div class="ssc-row ssc-head">
                  <span>${game.i18n.localize("SSC.Name")}</span>
                  <span>${game.i18n.localize("SSC.D4s")}</span>
                  <span>${game.i18n.localize("SSC.Skills")}</span>
                  <span>${game.i18n.localize("SSC.Member")}</span>
                  <span></span>
                </div>
                ${data.extracurriculars.map((item, index) => renderExtracurricular(item, index, actor, editable)).join("") || renderEmptyRow(5)}
              </div>`,
              "ssc-lower-card"
            ) : ""}
            ${editable || hasJob ? renderLowerCard(
              game.i18n.localize("SSC.Job"),
              editable
                ? `<div class="ssc-lower-controls">
                    <select data-preset-job>
                      <option value="">${game.i18n.localize("SSC.ChooseJob")}</option>
                      ${JOB_PRESETS.map((item, index) => `<option value="${index}">${escapeHtml(item.employer)}</option>`).join("")}
                    </select>
                    <button type="button" class="ssc-delete-button" data-delete="job" title="${game.i18n.localize("SSC.ClearJob")}" aria-label="${game.i18n.localize("SSC.ClearJob")}" ${hasJob ? "" : "disabled"}>
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>`
                : "",
              `<div class="ssc-job-grid">
                ${renderInput("job.employer", data.job.employer, "SSC.Employer", editable)}
                ${renderInput("job.position", data.job.position, "SSC.Position", editable)}
                ${renderInput("job.coworker", data.job.coworker, "SSC.Coworker", editable)}
              </div>`,
              "ssc-lower-card"
            ) : ""}
            ${renderStudentDiceCard(actor, data, editable, studentDiceCollapsed)}
          </div>
        </section>

        ${showGraduation ? `
          <section class="ssc-section ssc-graduation">
            <div class="ssc-graduation-lines">
              <span></span>
              <h3><i class="fas fa-graduation-cap"></i> ${game.i18n.localize("SSC.Graduation")}</h3>
              <span></span>
            </div>
            <div class="ssc-graduated-check">
              ${renderBooleanSquare("graduated", data.graduated, editable, {
                label: data.graduated ? game.i18n.localize("SSC.Graduated") : game.i18n.localize("SSC.MarkGraduated"),
                containerClass: "ssc-check-control-with-label"
              })}
            </div>
          </section>
        ` : ""}
      </div>
    </section>
  `;
}

function renderWarning(key) {
  return `<p class="ssc-warning"><strong>${game.i18n.localize("SSC.Warning")}:</strong> ${game.i18n.localize(key)}</p>`;
}

function getStudentDiceCollapsed(actorId) {
  try {
    return JSON.parse(localStorage.getItem(`${STUDENT_DICE_COLLAPSE_KEY}.${actorId}`) ?? "true") === true;
  } catch {
    return true;
  }
}

function toggleStudentDiceCollapsed(actorId) {
  const current = getStudentDiceCollapsed(actorId);
  localStorage.setItem(`${STUDENT_DICE_COLLAPSE_KEY}.${actorId}`, JSON.stringify(!current));
}

function renderGmCardToolbar(data) {
  return `
    <div class="ssc-gm-card-toolbar">
      <span class="ssc-gm-toolbar-title">${game.i18n.localize("SSC.GmTools")}</span>
      <div class="ssc-gm-toolbar-controls">
        <div class="ssc-visibility-picker">
          <span>${game.i18n.localize("SSC.VisibleYears")}</span>
          ${[1, 2, 3, 4].map((year) => `
            ${renderBooleanSquare(`visibleYears.${year}`, data.visibleYears?.[year], true, {
              label: String(year),
              containerClass: "ssc-check-control-with-label ssc-check-control-compact"
            })}
          `).join("")}
        </div>
        <button type="button" data-action="end-year"><i class="fas fa-calendar-check"></i> ${game.i18n.localize("SSC.EndAcademicYear")}</button>
        <button type="button" data-action="open-prev-actor"><i class="fas fa-arrow-left"></i> ${game.i18n.localize("SSC.Previous")}</button>
        <button type="button" data-action="open-next-actor">${game.i18n.localize("SSC.Next")} <i class="fas fa-arrow-right"></i></button>
        <button type="button" data-action="export-card"><i class="fas fa-download"></i> ${game.i18n.localize("SSC.Export")}</button>
        <button type="button" data-action="import-card"><i class="fas fa-upload"></i> ${game.i18n.localize("SSC.Import")}</button>
      </div>
    </div>
  `;
}

function renderExamLegendGroup() {
  return `
    <div class="ssc-exam-legend-group ssc-report-head">
      <span>#</span>
      <span>RR</span>
      <span>d4</span>
      <span>${game.i18n.localize("SSC.Skills")}</span>
      <span>${game.i18n.localize("SSC.Result")}</span>
    </div>
  `;
}

function renderLowerCard(title, controls, content, classes = "") {
  return `
    <div class="ssc-year ssc-lower-year ${classes}">
      <div class="ssc-lower-header">
        <h4>${escapeHtml(title)}</h4>
        ${controls || ""}
      </div>
      ${content}
    </div>
  `;
}

function renderStudentDiceCard(actor, data, editable, collapsed) {
  const body = `
    <div class="ssc-table ssc-dice">
      <div class="ssc-row ssc-head">
        <span>${game.i18n.localize("SSC.Source")}</span>
        <span>${game.i18n.localize("SSC.Skills")}</span>
        <span>${game.i18n.localize("SSC.Used")}</span>
        <span></span>
      </div>
      ${data.dice.map((item, index) => renderDie(item, index, actor, editable)).join("") || renderEmptyRow(4)}
    </div>
  `;

  return `
    <div class="ssc-year ssc-lower-year ssc-lower-card-wide ssc-student-dice-section ${collapsed ? "is-collapsed" : ""}" data-collapsible="student-dice">
      <div class="ssc-lower-header ssc-student-dice-header">
        <button type="button" class="ssc-lower-toggle" data-action="toggle-student-dice" aria-expanded="${collapsed ? "false" : "true"}" aria-label="${collapsed ? game.i18n.localize("SSC.Open") : game.i18n.localize("SSC.Close")}">
          <i class="fas ${collapsed ? "fa-chevron-down" : "fa-chevron-up"}"></i>
          <span>${game.i18n.localize("SSC.StudentDice")}</span>
        </button>
        <div class="ssc-lower-controls">
          ${editable ? `<button type="button" data-action="reset-dice"><i class="fas fa-rotate-left"></i> ${game.i18n.localize("SSC.ResetUsedDice")}</button>` : ""}
        </div>
      </div>
      <div class="ssc-student-dice-body">
        ${body}
      </div>
    </div>
  `;
}

function renderRelationship(item, index, editable) {
  const status = item.beloved ? "beloved" : relationshipStatus(item.points);
  return `
    <div class="ssc-row" data-index="${index}">
      <input data-path="relationships.${index}.name" value="${escapeAttr(item.name)}" placeholder="${game.i18n.localize("SSC.Name")}" ${textInputAttrs(editable)}>
      <div class="ssc-point-control">
        ${editable ? `<button type="button" data-action="relationship-point" data-index="${index}" data-delta="-1">-</button>` : `<span class="ssc-static-button">-</span>`}
        <input type="number" data-path="relationships.${index}.points" value="${Number(item.points) || 0}" ${editable ? "" : "readonly disabled"}>
        ${editable ? `<button type="button" data-action="relationship-point" data-index="${index}" data-delta="1">+</button>` : `<span class="ssc-static-button">+</span>`}
      </div>
      <div class="ssc-status">
        <span class="ssc-status-pill ssc-status-${status}">${relationshipLabel(status)}</span>
        ${renderBooleanSquare(`relationships.${index}.beloved`, item.beloved, editable, {
          label: game.i18n.localize("SSC.Beloved"),
          containerClass: "ssc-check-control-with-label"
        })}
      </div>
      ${renderBooleanSquare(`relationships.${index}.inspiration`, item.inspiration, editable, {
        containerClass: "ssc-check-control-center"
      })}
      <input data-path="relationships.${index}.boonBane" value="${escapeAttr(item.boonBane)}" placeholder="${game.i18n.localize("SSC.BoonBane")}" ${textInputAttrs(editable)}>
      ${editable ? `<button type="button" data-delete="relationships" data-index="${index}" title="${game.i18n.localize("SSC.Delete")}"><i class="fas fa-trash"></i></button>` : `<span></span>`}
    </div>
  `;
}

function renderYear(year, exams, actor, editable) {
  return `
    <div class="ssc-year">
      <h4>${game.i18n.localize("SSC.Year")} ${year}</h4>
      ${exams.map((exam, index) => `
        <div class="ssc-exam ${splitSkills(exam.skills).length ? "has-skills" : ""}">
          <strong>#${index + 1}</strong>
          ${renderBoxGroup("rerolls", year, index, Number(exam.rerolls) || 0, 2, editable)}
          ${renderBoxGroup("d4s", year, index, Number(exam.d4s) || 0, 2, editable)}
          <div class="ssc-skill-cell">${renderExamSkillList(`exams.${year}.${index}.skills`, exam.skills, actor, editable)}</div>
          <select class="ssc-result-badge ssc-result-${escapeAttr(exam.result || "empty")}" data-path="exams.${year}.${index}.result" data-kind="exam-result" data-year="${year}" data-index="${index}" ${editable ? "" : "disabled"}>
            ${option("", "SSC.Result", exam.result)}
            ${option("failed", "SSC.Failed", exam.result)}
            ${option("passed", "SSC.Passed", exam.result)}
            ${option("aced", "SSC.Aced", exam.result)}
          </select>
        </div>
      `).join("")}
    </div>
  `;
}

function renderExamSkillList(path, value, actor, editable) {
  const selected = splitSkills(value);
  const skills = getActorSkillOptions(actor);
  const visible = selected.slice(0, 3);
  const lines = visible.map((skill) => {
    const option = findSkillOption(skills, skill);
    const label = option?.label ?? skill;
    const bonus = option ? formatSkillBonus(option.bonus) : "";
    return `
      <span class="ssc-exam-skill-line">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(bonus)}</strong>
      </span>
    `;
  }).join("");

  if (!editable) {
    return `
      <div class="ssc-exam-skill-list ${selected.length ? "" : "is-empty"}">
        ${selected.length ? lines : `<span>${game.i18n.localize("SSC.Empty")}</span>`}
      </div>
    `;
  }

  return `
    <button type="button" class="ssc-exam-skill-list ${selected.length ? "" : "is-empty"}" data-action="open-skill-picker" data-skill-path="${escapeAttr(path)}">
      ${selected.length ? `${lines}<i class="fas fa-chevron-down ssc-exam-skill-caret"></i>` : `<span>${game.i18n.localize("SSC.ChooseSkill")}</span>`}
    </button>
  `;
}

function renderBoxGroup(field, year, index, value, max, editable) {
  if (!editable) {
    return `
      <div class="ssc-box-group is-readonly" data-field="${field}">
        ${Array.from({ length: max }, (_item, boxIndex) => `
          <span class="ssc-use-box ${value >= boxIndex + 1 ? "is-checked" : ""}" title="${field}">
            <span></span>
          </span>
        `).join("")}
      </div>
    `;
  }

  return `
    <div class="ssc-box-group" data-field="${field}">
      ${Array.from({ length: max }, (_item, boxIndex) => `
        <label class="ssc-use-box" data-action="exam-count" data-field="${field}" data-year="${year}" data-index="${index}" data-value="${boxIndex + 1}" title="${field}">
          <input type="checkbox" data-action="exam-count" data-field="${field}" data-year="${year}" data-index="${index}" data-value="${boxIndex + 1}" ${value >= boxIndex + 1 ? "checked" : ""}>
          <span></span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderBooleanSquare(path, checked, editable, { label = "", containerClass = "" } = {}) {
  const text = label ? `<span class="ssc-check-control-label">${escapeHtml(label)}</span>` : "";
  if (!editable) {
    return `
      <span class="ssc-check-control ${containerClass} is-readonly">
        <span class="ssc-use-box ${checked ? "is-checked" : ""}">
          <span></span>
        </span>
        ${text}
      </span>
    `;
  }

  return `
    <label class="ssc-check-control ${containerClass}">
      <span class="ssc-use-box">
        <input type="checkbox" data-path="${escapeAttr(path)}" ${checked ? "checked" : ""}>
        <span></span>
      </span>
      ${text}
    </label>
  `;
}

function renderExtracurricular(item, index, actor, editable) {
  return `
    <div class="ssc-row" data-index="${index}">
      <input data-path="extracurriculars.${index}.name" value="${escapeAttr(item.name)}" placeholder="${game.i18n.localize("SSC.Name")}" ${textInputAttrs(editable)}>
      ${renderBooleanSquare(`extracurriculars.${index}.d4`, item.d4, editable, {
        containerClass: "ssc-check-control-center"
      })}
      <div class="ssc-skill-cell">${renderExamSkillList(`extracurriculars.${index}.skills`, item.skills, actor, editable)}</div>
      <input data-path="extracurriculars.${index}.member" value="${escapeAttr(item.member)}" placeholder="${game.i18n.localize("SSC.Member")}" ${textInputAttrs(editable)}>
      ${editable ? `<button type="button" class="ssc-delete-button" data-delete="extracurriculars" data-index="${index}" title="${game.i18n.localize("SSC.Delete")}"><i class="fas fa-trash"></i></button>` : `<span></span>`}
    </div>
  `;
}

function renderDie(item, index, actor, editable) {
  return `
    <div class="ssc-row ssc-dice-row" data-index="${index}">
      <input class="ssc-dice-source" data-path="dice.${index}.source" value="${escapeAttr(item.source)}" placeholder="${game.i18n.localize("SSC.Source")}" ${item.locked || !editable ? "readonly" : ""} ${!editable ? "disabled" : ""}>
      <div class="ssc-dice-skills">${renderSkillTags(item.skills, actor, "ssc-dice-skill-chip")}</div>
      ${renderBooleanSquare(`dice.${index}.used`, item.used, editable, {
        containerClass: "ssc-check-control-center"
      })}
      ${editable ? `<button type="button" class="ssc-delete-button" data-delete="dice" data-index="${index}" title="${game.i18n.localize("SSC.Delete")}"><i class="fas fa-trash"></i></button>` : `<span></span>`}
    </div>
  `;
}

function renderSkillTags(value, actor, tagClass = "ssc-skill-tag") {
  const skills = getActorSkillOptions(actor);
  const selected = splitSkills(value);

  return `
    <div class="ssc-skill-tags">
      ${selected.map((skill) => {
        const option = findSkillOption(skills, skill);
        return `<span class="${escapeAttr(tagClass)}">${escapeHtml(option?.label ?? skill)}</span>`;
      }).join("") || `<span class="ssc-skill-empty">${game.i18n.localize("SSC.Empty")}</span>`}
    </div>
  `;
}

function renderSummaryBadge(icon, content, labelKey, kind) {
  const label = game.i18n.localize(labelKey);
  return `
    <span class="ssc-summary-badge" data-summary="${escapeAttr(kind)}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">
      <i class="fas ${escapeAttr(icon)}"></i>
      ${content}
    </span>
  `;
}

function renderInput(path, value, labelKey, editable) {
  return `
    <label>
      <span>${game.i18n.localize(labelKey)}</span>
      <input data-path="${path}" value="${escapeAttr(value)}" ${textInputAttrs(editable)}>
    </label>
  `;
}

function textInputAttrs(editable) {
  return editable ? "" : "readonly disabled";
}

function renderEmptyRow(columns) {
  return `<div class="ssc-empty-row" style="grid-column: span ${columns};">${game.i18n.localize("SSC.Empty")}</div>`;
}

function option(value, labelKey, current) {
  return `<option value="${value}" ${value === current ? "selected" : ""}>${game.i18n.localize(labelKey)}</option>`;
}

function relationshipLabel(status) {
  if (status === "beloved") return game.i18n.localize("SSC.Beloved");
  if (status === "friend") return game.i18n.localize("SSC.Friend");
  if (status === "rival") return game.i18n.localize("SSC.Rival");
  return game.i18n.localize("SSC.Neutral");
}

function bindCardEvents(panel, actor) {
  if (panel.dataset.cardBound === "true") return;
  panel.dataset.cardBound = "true";

  panel.addEventListener("change", async (event) => {
    if (!canEditCard(actor)) return;
    const presetExtra = event.target.closest("[data-preset-add='extracurriculars']");
    const presetJob = event.target.closest("[data-preset-job]");
    if (presetExtra || presetJob) {
      const data = getCardData(actor);
      if (presetExtra && presetExtra.value !== "") addExtracurricularPreset(data, Number(presetExtra.value), actor);
      if (presetJob && presetJob.value !== "") applyJobPreset(data, Number(presetJob.value));
      await saveAndRerender(panel, actor, data);
      return;
    }

    const input = event.target.closest("[data-path]");
    if (!input) return;
    const data = getCardData(actor);
    setPath(data, input.dataset.path, readInputValue(input));

    if (input.dataset.kind === "exam-result") {
      const year = Number(input.dataset.year);
      const index = Number(input.dataset.index);
      updateExamDice(data, year, index);
    }

    if (input.dataset.path?.startsWith("exams.") && input.dataset.path?.endsWith(".skills")) {
      const [, year, index] = input.dataset.path.split(".");
      updateExamDice(data, Number(year), Number(index));
    }

    await saveAndRerender(panel, actor, data);
  });

  panel.addEventListener("click", async (event) => {
    const toggleButton = event.target.closest("[data-action='toggle-student-dice']");
    if (toggleButton) {
      event.preventDefault();
      toggleStudentDiceCollapsed(actor.id);
      renderStudentCardWindow(panel, actor);
      return;
    }

    if (!canEditCard(actor)) return;
    const addButton = event.target.closest("[data-add]");
    const deleteButton = event.target.closest("[data-delete]");
    const actionButton = event.target.closest("[data-action]");
    if (!addButton && !deleteButton && !actionButton) return;

    const data = getCardData(actor);

    if (actionButton?.dataset.action === "open-skill-picker") {
      await openSkillPicker(panel, actor, actionButton.dataset.skillPath, actionButton);
      return;
    }
    if (addButton) addItem(data, addButton.dataset.add);
    if (deleteButton) deleteItem(data, deleteButton.dataset.delete, Number(deleteButton.dataset.index));
    if (actionButton?.dataset.action === "relationship-point") {
      const item = data.relationships[Number(actionButton.dataset.index)];
      item.points = (Number(item.points) || 0) + Number(actionButton.dataset.delta);
    }
    if (actionButton?.dataset.action === "exam-count") {
      event.preventDefault();
      const year = Number(actionButton.dataset.year);
      const index = Number(actionButton.dataset.index);
      const field = actionButton.dataset.field;
      const value = Number(actionButton.dataset.value);
      const exam = data.exams?.[year]?.[index];
      if (exam) {
        exam[field] = Number(exam[field]) === value ? value - 1 : value;
        if (field === "d4s") syncManualExamDice(data, year, index);
      }
    }
    if (actionButton?.dataset.action === "reset-dice") resetUsedDice(data);
    if (actionButton?.dataset.action === "open-prev-actor") {
      const adjacent = getAdjacentActor(actor, -1);
      if (adjacent) openStudentCard(adjacent);
      return;
    }
    if (actionButton?.dataset.action === "open-next-actor") {
      const adjacent = getAdjacentActor(actor, 1);
      if (adjacent) openStudentCard(adjacent);
      return;
    }
    if (actionButton?.dataset.action === "export-card") {
      exportCard(actor, data);
      return;
    }
    if (actionButton?.dataset.action === "import-card") {
      importCard(panel, actor);
      return;
    }
    if (actionButton?.dataset.action === "end-year") {
      const confirmed = await confirmAction("SSC.EndAcademicYearConfirm");
      if (!confirmed) return;
      endAcademicYear(data);
    }

    await saveAndRerender(panel, actor, data);
  });
}

async function saveAndRerender(panel, actor, data) {
  const saved = await saveCardData(actor, data);
  renderStudentCardWindow(panel, actor, saved);
  return saved;
}

async function saveCardData(actor, data) {
  const normalized = normalizeCardData(data);
  syncExtracurricularDice(normalized);
  await actor.setFlag(MODULE_ID, FLAG_KEY, normalized);
  await syncActorInspiration(actor, normalized);
  return normalized;
}

function renderStudentCardWindow(panel, actor, data = getCardData(actor)) {
  if (!panel?.isConnected) return;
  panel.innerHTML = `
    <header class="ssc-window-header">
      <h2>${game.i18n.localize("SSC.Title")}: ${escapeHtml(actor.name)}</h2>
      <button type="button" class="ssc-window-close" title="${game.i18n.localize("SSC.Close")}" aria-label="${game.i18n.localize("SSC.Close")}"><i class="fas fa-times"></i></button>
    </header>
    ${renderCard(actor, data)}
  `;
  setupWindowControls(panel);
}

function refreshOpenCard(actor, changes) {
  const path = `flags.${MODULE_ID}.${FLAG_KEY}`;
  const legacyPath = `flags.${LEGACY_MODULE_ID}.${FLAG_KEY}`;
  const moduleChanges = changes?.flags?.[MODULE_ID];
  const cardChanged =
    Object.prototype.hasOwnProperty.call(changes ?? {}, path) ||
    Object.prototype.hasOwnProperty.call(changes ?? {}, legacyPath) ||
    Object.prototype.hasOwnProperty.call(moduleChanges ?? {}, FLAG_KEY) ||
    Object.prototype.hasOwnProperty.call(moduleChanges ?? {}, `-=${FLAG_KEY}`);
  if (!cardChanged) return;

  const panel = windows.get(actor.id);
  if (panel) renderStudentCardWindow(panel, actor);
}

function addItem(data, type) {
  if (type === "relationships") {
    data.relationships.push({ id: randomId(), name: "", points: 0, beloved: false, inspiration: false, boonBane: "" });
  }
  if (type === "extracurriculars") {
    data.extracurriculars.push({ id: randomId(), name: "", d4: true, skills: "", member: "" });
  }
}

function deleteItem(data, type, index) {
  if (type === "job") {
    data.job = { employer: "", position: "", coworker: "" };
    return;
  }
  if (!Array.isArray(data[type]) || index < 0 || index >= data[type].length) return;
  if (type === "extracurriculars") {
    const removed = data.extracurriculars[index];
    data.extracurriculars.splice(index, 1);
    if (removed?.id) data.dice = data.dice.filter((die) => die.extraId !== removed.id);
    return;
  }
  data[type].splice(index, 1);
}

function addExtracurricularPreset(data, index, actor) {
  const preset = EXTRACURRICULAR_PRESETS[index];
  if (!preset) return;
  const extraId = randomId();
  const skills = localizePresetSkills(preset.skills, actor);
  data.extracurriculars.push({
    id: extraId,
    name: preset.name,
    d4: true,
    skills,
    member: preset.member
  });
  data.dice.push({
    id: randomId(),
    extraId,
    source: preset.name,
    skills,
    used: false,
    locked: false
  });
}

function applyJobPreset(data, index) {
  const preset = JOB_PRESETS[index];
  if (!preset) return;
  data.job = {
    employer: preset.employer,
    position: preset.positions,
    coworker: preset.coworker
  };
}

function relationshipStatus(points) {
  const value = Number(points) || 0;
  if (value >= 2) return "friend";
  if (value <= -2) return "rival";
  return "neutral";
}

function updateExamDice(data, year, index) {
  const exam = data.exams?.[year]?.[index];
  if (!exam) return;

  const count = exam.result === "aced" ? 2 : exam.result === "passed" ? 1 : 0;
  exam.d4s = count;
  replaceExamDice(data, year, index, count, exam.skills ?? "");
}

function syncManualExamDice(data, year, index) {
  const exam = data.exams?.[year]?.[index];
  if (!exam) return;

  const count = Number(exam.d4s) || 0;
  replaceExamDice(data, year, index, count, exam.skills ?? "");
}

function replaceExamDice(data, year, index, count, skills) {
  const examId = examDieId(year, index);
  const source = `${game.i18n.localize("SSC.Year")} ${year} ${game.i18n.localize("SSC.Exam")} #${index + 1}`;
  data.dice = data.dice.filter((die) => die.examId !== examId);

  for (let i = 0; i < count; i += 1) {
    data.dice.push({
      id: randomId(),
      examId,
      source,
      skills,
      used: false,
      locked: true
    });
  }
}

function syncExtracurricularDice(data) {
  const extrasById = new Map(data.extracurriculars.map((extra) => [extra.id, extra]));
  const linked = new Set();

  data.dice = data.dice.filter((die) => {
    if (!die.extraId) return true;
    const extra = extrasById.get(die.extraId);
    if (!extra?.d4 || linked.has(extra.id)) return false;

    die.source = extra.name;
    die.skills = extra.skills;
    die.locked = true;
    linked.add(extra.id);
    return true;
  });

  for (const extra of data.extracurriculars) {
    if (!extra.d4 || linked.has(extra.id)) continue;
    data.dice.push({
      id: randomId(),
      extraId: extra.id,
      source: extra.name,
      skills: extra.skills,
      used: false,
      locked: true
    });
  }
}

function countVisibleYears(data) {
  return [1, 2, 3, 4].filter((year) => data.visibleYears?.[year]).length;
}

function revealNextYear(data) {
  const nextYear = [1, 2, 3, 4].find((year) => !data.visibleYears?.[year]);
  if (!nextYear) return null;
  data.visibleYears[nextYear] = true;
  return nextYear;
}

function getAdjacentActor(actor, delta) {
  const actors = getSortedCharacterActors();
  const index = actors.findIndex((item) => item.id === actor.id);
  if (index < 0) return null;
  return actors[(index + delta + actors.length) % actors.length] ?? null;
}

function queueRollPrompts(data, type) {
  void promptRollEnhancements(data, type).catch((error) => {
    console.error(`${MODULE_ID} | Roll prompt failed`, error);
  });
}

async function promptRollEnhancements(rollData, type) {
  await promptInspirationForCheck(rollData, type);
  await promptStudentDieForCheck(rollData, type);
}

async function promptInspirationForCheck(rollData, type) {
  const actor = rollData?.subject;
  if (!isCharacterActor(actor) || !canViewActor(actor)) return;

  const data = getCardData(actor);
  const available = getAvailableRelationshipInspirations(data);
  if (!available.length) return;

  const rollLabel = getRollPromptLabel(actor, rollData, type);
  const selectedId = await promptInspirationReroll(actor, rollLabel, available);
  if (!selectedId) return;

  const consumed = consumeRelationshipInspiration(data, selectedId);
  if (!consumed) return;

  const panel = windows.get(actor.id);
  if (panel) await saveAndRerender(panel, actor, data);
  else await saveCardData(actor, data);

  const RollClass = foundry.dice?.Roll ?? globalThis.Roll;
  const ChatMessageClass = foundry.documents?.ChatMessage ?? globalThis.ChatMessage;
  const roll = new RollClass("1d20");
  await roll.evaluate();
  await roll.toMessage({
    speaker: ChatMessageClass.getSpeaker({ actor }),
    flavor: consumed.name
      ? game.i18n.format("SSC.InspirationRerollFlavorSource", {
          roll: escapeHtml(rollLabel),
          source: escapeHtml(consumed.name)
        })
      : game.i18n.format("SSC.InspirationRerollFlavor", {
          roll: escapeHtml(rollLabel)
        }),
    flags: {
      [MODULE_ID]: {
        inspirationReroll: true,
        rollType: type,
        relationshipId: consumed.id
      }
    }
  });
}

async function promptStudentDieForCheck(rollData, type) {
  if (type !== "skill" && type !== "tool") return;
  if (!game.settings.get(MODULE_ID, SETTINGS.PROMPT_STUDENT_DIE)) return;
  const actor = rollData?.subject;
  if (!isCharacterActor(actor) || !canViewActor(actor)) return;

  const id = type === "tool" ? rollData?.tool : rollData?.skill;
  if (!id) return;
  const lookupId = type === "tool" ? `tool:${id}` : id;
  const skill = findSkillOption(getActorSkillOptions(actor), lookupId);
  if (!skill) return;

  const data = getCardData(actor);
  const availableDice = data.dice
    .map((die, index) => ({ die, index }))
    .filter(({ die }) => !die.used && dieMatchesSkill(die, skill));
  if (!availableDice.length) return;

  const chosenDieId = await confirmStudentDie(actor, skill, availableDice.map(({ die }) => die));
  if (!chosenDieId) return;
  const chosen = availableDice.find(({ die }) => die.id === chosenDieId);
  if (!chosen) return;

  const { die } = chosen;
  die.used = true;
  const panel = windows.get(actor.id);
  if (panel) await saveAndRerender(panel, actor, data);
  else await saveCardData(actor, data);

  const RollClass = foundry.dice?.Roll ?? globalThis.Roll;
  const ChatMessageClass = foundry.documents?.ChatMessage ?? globalThis.ChatMessage;
  const roll = new RollClass("1d4");
  await roll.evaluate();
  await roll.toMessage({
    speaker: ChatMessageClass.getSpeaker({ actor }),
    flavor: `${game.i18n.localize("SSC.StudentDiePromptTitle")}: ${escapeHtml(skill.label)} (${escapeHtml(die.source ?? "")})`,
    flags: {
      [MODULE_ID]: {
        studentDieRoll: true,
        skill: skill.id,
        dieId: die.id
      }
    }
  });
}

function dieMatchesSkill(die, skill) {
  return splitSkills(die.skills).some((item) => sameSkill(item, skill.label, skill.id));
}

async function confirmStudentDie(actor, skill, die) {
  const dice = Array.isArray(die) ? die : [die];
  if (dice.length === 1) return confirmSingleStudentDie(actor, skill, dice[0]);
  return chooseStudentDie(actor, skill, dice);
}

async function confirmSingleStudentDie(actor, skill, die) {
  const option = `
    <label class="ssc-choice-option">
      <input type="radio" name="ssc-student-die-choice" value="${escapeAttr(die.id)}" checked>
      <span>
        <strong>${escapeHtml(die.source ?? game.i18n.localize("SSC.StudentDice"))}</strong>
        <small>${escapeHtml(formatDieSkillSummary(die.skills))}</small>
      </span>
    </label>
  `;

  const chosen = await promptSelectionModal({
    title: game.i18n.localize("SSC.StudentDiePromptTitle"),
    icon: "fa-dice-d4",
    intro: game.i18n.format("SSC.StudentDiePrompt", {
      actor: escapeHtml(actor.name),
      skill: escapeHtml(skill.label),
      source: escapeHtml(die.source ?? game.i18n.localize("SSC.StudentDice"))
    }),
    options: option,
    confirmLabel: game.i18n.localize("SSC.UseDie"),
    cancelLabel: game.i18n.localize("SSC.Cancel"),
    choiceName: "ssc-student-die-choice",
    className: "ssc-inline-choice ssc-inline-student-die"
  });
  return chosen ? die.id : null;
}

function getAvailableRelationshipInspirations(data) {
  return data.relationships
    .map((item, index) => ({ ...item, index }))
    .filter((item) => item.inspiration === true);
}

function consumeRelationshipInspiration(data, relationshipId = null) {
  const relationship = relationshipId
    ? data.relationships.find((item) => item.id === relationshipId && item.inspiration === true)
    : data.relationships.find((item) => item.inspiration === true);
  if (!relationship) return null;
  relationship.inspiration = false;
  return relationship;
}

async function syncActorInspiration(actor, data) {
  if (!isCharacterActor(actor)) return;
  const desired = getAvailableRelationshipInspirations(data).length > 0;
  const current = actor?.system?.attributes?.inspiration === true;
  if (current === desired) return;
  await actor.update({ "system.attributes.inspiration": desired });
}

function getRollPromptLabel(actor, rollData, type) {
  if (type === "skill") {
    const skillId = normalizeText(rollData?.skill);
    return findSkillOption(getActorSkillOptions(actor), skillId)?.label ?? game.i18n.localize("SSC.D20Roll");
  }

  if (type === "tool") {
    const toolId = normalizeText(rollData?.tool);
    return findSkillOption(getActorSkillOptions(actor), `tool:${toolId}`)?.label ?? game.i18n.localize("SSC.D20Roll");
  }

  const abilityId = normalizeText(rollData?.ability ?? rollData?.abilityId ?? rollData?.abl);
  const abilityLabel = getAbilityLabel(abilityId);
  if (type === "save") return game.i18n.format("SSC.AbilitySaveLabel", { ability: abilityLabel });
  if (type === "ability") return game.i18n.format("SSC.AbilityTestLabel", { ability: abilityLabel });
  return game.i18n.localize("SSC.D20Roll");
}

function getAbilityLabel(abilityId) {
  if (!abilityId) return game.i18n.localize("SSC.D20Roll");
  const config = CONFIG?.DND5E?.abilities?.[abilityId];
  return game.i18n.localize(config?.label ?? config?.labelKey ?? config ?? abilityId.toUpperCase());
}

async function promptInspirationReroll(actor, rollLabel, available) {
  const options = available.map((item, index) => `
    <label class="ssc-choice-option">
      <input type="radio" name="ssc-inspiration-choice" value="${escapeAttr(item.id)}" ${index === 0 ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(item.name?.trim() || game.i18n.localize("SSC.Inspiration"))}</strong>
        <small>${escapeHtml(item.boonBane?.trim() || game.i18n.localize("SSC.Inspiration"))}</small>
      </span>
    </label>
  `).join("");

  return promptSelectionModal({
    title: game.i18n.localize("SSC.InspirationPromptTitle"),
    icon: "fa-star",
    intro: game.i18n.format("SSC.InspirationPrompt", {
      actor: escapeHtml(actor.name),
      roll: escapeHtml(rollLabel)
    }),
    options,
    confirmLabel: game.i18n.localize("SSC.UseInspiration"),
    cancelLabel: game.i18n.localize("SSC.Cancel"),
    choiceName: "ssc-inspiration-choice",
    className: "ssc-inline-choice ssc-inline-inspiration"
  });
}

async function chooseStudentDie(actor, skill, dice) {
  const options = dice.map((die) => `
    <label class="ssc-choice-option">
      <input type="radio" name="ssc-student-die-choice" value="${escapeAttr(die.id)}" ${die === dice[0] ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(die.source ?? game.i18n.localize("SSC.StudentDice"))}</strong>
        <small>${escapeHtml(formatDieSkillSummary(die.skills))}</small>
      </span>
    </label>
  `).join("");

  return promptStudentDieChoice({
    title: game.i18n.localize("SSC.StudentDiePromptTitle"),
    intro: game.i18n.format("SSC.StudentDiePromptMulti", {
      actor: escapeHtml(actor.name),
      skill: escapeHtml(skill.label),
      count: dice.length
    }),
    options
  });
}

function promptStudentDieChoice({ title, intro, options }) {
  return promptSelectionModal({
    title,
    icon: "fa-dice-d4",
    intro,
    options,
    confirmLabel: game.i18n.localize("SSC.UseDie"),
    cancelLabel: game.i18n.localize("SSC.Cancel"),
    choiceName: "ssc-student-die-choice",
    className: "ssc-inline-choice ssc-inline-student-die"
  });
}

function promptSelectionModal({ title, icon = "fa-star", intro, options, confirmLabel, cancelLabel, choiceName, className }) {
  return new Promise((resolve) => {
    const prompt = document.createElement("div");
    prompt.className = className;
    prompt.innerHTML = `
      <div class="ssc-inline-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="ssc-choice-title">
        <div class="ssc-inline-choice-header">
          <h5 id="ssc-choice-title"><i class="fas ${escapeHtml(icon)}"></i> ${escapeHtml(title)}</h5>
          <button type="button" data-action="close-choice-prompt" aria-label="${game.i18n.localize("SSC.Close")}"><i class="fas fa-times"></i></button>
        </div>
        <div class="ssc-inline-choice-body">
          <p>${intro}</p>
          <form class="ssc-inline-choice-list">
            ${options}
          </form>
          <div class="ssc-inline-choice-actions">
            <button type="button" data-action="cancel-choice">${cancelLabel}</button>
            <button type="button" data-action="confirm-choice">${confirmLabel}</button>
          </div>
        </div>
      </div>
    `;
    document.body.append(prompt);

    const finalize = (value) => {
      document.removeEventListener("mousedown", outsideHandler);
      prompt.remove();
      resolve(value);
    };

    const outsideHandler = (event) => {
      if (prompt.contains(event.target)) return;
      finalize(null);
    };

    setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);

    prompt.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      event.preventDefault();
      if (button.dataset.action === "close-choice-prompt" || button.dataset.action === "cancel-choice") {
        finalize(null);
        return;
      }
      if (button.dataset.action === "confirm-choice") {
        const selected = prompt.querySelector(`input[name='${choiceName}']:checked`);
        finalize(selected?.value ?? null);
      }
    });

    prompt.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finalize(null);
      }
    });

    prompt.querySelector(`input[name='${choiceName}']`)?.focus?.();
  });
}

function formatDieSkillSummary(value) {
  const skills = splitSkills(value);
  return skills.length ? skills.join(", ") : game.i18n.localize("SSC.Empty");
}

function examDieId(year, index) {
  return `year-${year}-exam-${index + 1}`;
}

function resetUsedDice(data) {
  data.dice.forEach((die) => {
    die.used = false;
  });
}

function endAcademicYear(data) {
  Object.values(data.exams).flat().forEach((exam) => {
    exam.d4s = 0;
  });
  data.dice = data.dice.filter((die) => !die.examId);
}

function exportCard(actor, data) {
  const payload = {
    module: MODULE_ID,
    version: MODULE_VERSION,
    actor: actor.name,
    exportedAt: new Date().toISOString(),
    data
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeFileName(actor.name || actor.id)}-student-card.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportAllCards() {
  const payload = {
    module: MODULE_ID,
    version: MODULE_VERSION,
    exportedAt: new Date().toISOString(),
    actors: getSortedCharacterActors().map((actor) => ({
      id: actor.id,
      name: actor.name,
      data: getCardData(actor)
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `student-cards-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function importCard(panel, actor) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("Import file exceeds the size limit.");
      const parsed = await parseImportFile(file);
      const data = normalizeCardData(parsed.data);
      const confirmed = await confirmImportPreview(actor, parsed.meta);
      if (!confirmed) return;
      await saveAndRerender(panel, actor, data);
      ui.notifications?.info?.(game.i18n.localize("SSC.ImportDone"));
    } catch (error) {
      console.error(`${MODULE_ID} | Import failed`, error);
      ui.notifications?.error?.(game.i18n.localize("SSC.ImportFailed"));
    }
  });
  input.click();
}

async function parseImportFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error("Import root must be an object.");
  if (parsed.module && parsed.module !== MODULE_ID) throw new Error("Import belongs to another module.");
  const imported = parsed?.data ?? parsed;
  if (!isRecord(imported)) throw new Error("Import data must be an object.");
  return {
    data: imported,
    meta: {
      actor: parsed.actor ?? "",
      exportedAt: parsed.exportedAt ?? "",
      version: parsed.version ?? ""
    }
  };
}

async function confirmImportPreview(actor, meta = {}) {
  const content = [
    `<p>${game.i18n.format("SSC.ImportPreview", { actor: escapeHtml(actor.name) })}</p>`,
    meta.actor ? `<p><strong>${game.i18n.localize("SSC.Actor")}:</strong> ${escapeHtml(meta.actor)}</p>` : "",
    meta.version ? `<p><strong>${game.i18n.localize("SSC.Version")}:</strong> ${escapeHtml(meta.version)}</p>` : "",
    meta.exportedAt ? `<p><strong>${game.i18n.localize("SSC.ExportedAt")}:</strong> ${escapeHtml(meta.exportedAt)}</p>` : ""
  ].filter(Boolean).join("");
  const dialog = globalThis.Dialog;
  if (!foundry.applications?.api?.DialogV2 && !dialog?.confirm) return window.confirm(stripHtml(content));
  if (foundry.applications?.api?.DialogV2) {
    return foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("SSC.Import") },
      content
    });
  }
  return dialog.confirm({
    title: game.i18n.localize("SSC.Import"),
    content
  });
}

async function resetDiceAfterLongRest(actor, result = {}, config = {}) {
  if (!game.settings.get(MODULE_ID, SETTINGS.RESET_ON_LONG_REST)) return;
  if (!isCharacterActor(actor) || (!game.user?.isGM && !actor.isOwner)) return;

  const isLongRest =
    result?.longRest === true ||
    result?.type === "long" ||
    config?.type === "long";
  if (!isLongRest) return;

  const data = getCardData(actor);
  if (!data.dice.some((die) => die.used)) return;
  resetUsedDice(data);

  const panel = windows.get(actor.id);
  if (panel) await saveAndRerender(panel, actor, data);
  else await saveCardData(actor, data);
}

async function confirmAction(contentKey) {
  const dialog = globalThis.Dialog;
  if (!foundry.applications?.api?.DialogV2 && !dialog?.confirm) return window.confirm(game.i18n.localize(contentKey));
  if (foundry.applications?.api?.DialogV2) {
    return foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("SSC.Title") },
      content: `<p>${game.i18n.localize(contentKey)}</p>`
    });
  }
  return dialog.confirm({
    title: game.i18n.localize("SSC.Title"),
    content: `<p>${game.i18n.localize(contentKey)}</p>`
  });
}

function readInputValue(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "number") return Number(input.value) || 0;
  return input.value;
}

function setPath(object, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  let target = object;
  for (const part of parts) target = target[part];
  target[last] = value;
}

function getPath(object, path) {
  return path.split(".").reduce((target, part) => target?.[part], object);
}

function getActorSkillOptions(actor) {
  const actorSkills = actor?.system?.skills ?? {};
  const configSkills = CONFIG?.DND5E?.skills ?? {};
  const ids = Object.keys(actorSkills).length ? Object.keys(actorSkills) : Object.keys(configSkills);
  const fallback = [
    ["acr", "Acrobatics"],
    ["ani", "Animal Handling"],
    ["arc", "Arcana"],
    ["ath", "Athletics"],
    ["dec", "Deception"],
    ["his", "History"],
    ["ins", "Insight"],
    ["itm", "Intimidation"],
    ["inv", "Investigation"],
    ["med", "Medicine"],
    ["nat", "Nature"],
    ["prc", "Perception"],
    ["prf", "Performance"],
    ["per", "Persuasion"],
    ["rel", "Religion"],
    ["slt", "Sleight of Hand"],
    ["ste", "Stealth"],
    ["sur", "Survival"]
  ];

  const fromActor = ids.map((id) => {
    const config = configSkills[id];
    const label = game.i18n.localize(config?.label ?? config?.labelKey ?? config ?? id);
    return { id, label, bonus: getActorSkillBonus(actor, id), type: "skill" };
  }).filter((skill) => skill.label && skill.label !== skill.id);

  const skillOptions = fromActor.length ? fromActor : fallback.map(([id, label]) => ({ id, label, bonus: 0, type: "skill" }));
  const options = [...skillOptions, ...getActorToolOptions(actor)];
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function getActorSkillBonus(actor, id) {
  const skill = actor?.system?.skills?.[id];
  const value = skill?.total ?? skill?.mod ?? skill?.value ?? 0;
  return Number(value) || 0;
}

function formatSkillBonus(value) {
  const number = Number(value) || 0;
  return number >= 0 ? `+${number}` : `${number}`;
}

function getActorToolOptions(actor) {
  const options = [];
  const seen = new Set();

  const addTool = (id, label, bonus) => {
    const normalized = normalizeSkill(label || id);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    options.push({ id: `tool:${id || normalized}`, label, bonus, type: "tool" });
  };

  for (const [id, tool] of Object.entries(actor?.system?.tools ?? {})) {
    if (!hasToolProficiency(tool)) continue;
    const config = CONFIG?.DND5E?.tools?.[id];
    const label = game.i18n.localize(tool?.label ?? config?.label ?? config?.labelKey ?? id);
    addTool(id, label, getToolBonus(actor, tool));
  }

  for (const item of actor?.items ?? []) {
    if (!isToolItem(item) || !hasToolProficiency(item.system)) continue;
    addTool(item.id ?? item.name, item.name, getToolBonus(actor, item.system));
  }

  return options;
}

function isToolItem(item) {
  return item?.type === "tool" || item?.system?.type?.value === "tool" || item?.system?.toolType;
}

function hasToolProficiency(source) {
  if (!source) return false;
  const value =
    source.proficient?.value ??
    source.proficient ??
    source.prof?.hasProficiency ??
    source.prof?.proficient ??
    source.prof?.value ??
    source.value;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return value !== "" && value !== "0" && value !== "false";

  return true;
}

function getToolBonus(actor, source) {
  const value =
    source?.total ??
    source?.mod ??
    source?.bonus ??
    source?.ability?.mod ??
    actor?.system?.attributes?.prof;

  return Number(value) || 0;
}

function findSkillOption(skills, value) {
  return skills.find((skill) => sameSkill(value, skill.label, skill.id));
}

function splitSkills(value) {
  return String(value ?? "")
    .replace(/\s+or\s+/gi, ",")
    .split(/[,;/|]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function sameSkill(value, label, id) {
  const normalized = normalizeSkill(value);
  return normalized === normalizeSkill(label) || normalized === normalizeSkill(id);
}

function normalizeSkill(value) {
  return String(value ?? "").trim().toLowerCase();
}

function localizePresetSkills(value, actor) {
  const options = getActorSkillOptions(actor);
  return splitSkills(value)
    .map((skill) => findSkillOption(options, skill)?.label ?? skill)
    .join(", ");
}

function closeSkillPicker({ restoreFocus = true } = {}) {
  activeSkillPicker?.removeListeners?.();
  activeSkillPicker?.root?.remove();
  if (restoreFocus) activeSkillPicker?.returnFocus?.focus?.();
  activeSkillPicker = null;
}

async function openSkillPicker(panel, actor, path, anchor) {
  closeSkillPicker({ restoreFocus: false });
  const data = getCardData(actor);
  const selected = splitSkills(getPath(data, path));
  const skills = getActorSkillOptions(actor);
  const selectionLimit = getSkillSelectionLimit(path);
  panel?.classList.add("ssc-picker-open");
  const picker = document.createElement("div");
  picker.className = "ssc-inline-skill-picker";
  picker.innerHTML = `
    <div class="ssc-inline-skill-picker-header">
      <h5>${game.i18n.localize("SSC.ChooseSkill")}</h5>
      <button type="button" data-action="close-inline-skill-picker" aria-label="${game.i18n.localize("SSC.Close")}"><i class="fas fa-times"></i></button>
    </div>
    <form class="ssc-skill-picker-form">
      <div class="ssc-skill-picker-list">
        ${skills.map((skill) => `
          <label>
            <input type="checkbox" value="${escapeAttr(skill.label)}" ${selected.some((item) => sameSkill(item, skill.label, skill.id)) ? "checked" : ""}>
            <span>${escapeHtml(skill.label)}</span>
            <strong>${escapeHtml(formatSkillBonus(skill.bonus))}</strong>
          </label>
        `).join("")}
      </div>
      <div class="ssc-inline-skill-picker-actions">
        <button type="button" data-action="clear-inline-skill-picker">${game.i18n.localize("SSC.Clear")}</button>
        <button type="button" data-action="save-inline-skill-picker">${game.i18n.localize("SSC.Save")}</button>
      </div>
    </form>
  `;
  document.body.append(picker);

  const positionPicker = () => positionSkillPicker(picker, anchor);
  positionPicker();

  const checkboxInputs = Array.from(picker.querySelectorAll("input[type='checkbox']"));
  const refreshSelectionLimit = () => {
    if (!selectionLimit) return;
    const checkedCount = checkboxInputs.filter((input) => input.checked).length;
    for (const input of checkboxInputs) input.disabled = !input.checked && checkedCount >= selectionLimit;
  };
  refreshSelectionLimit();

  const saveSelection = async () => {
    const checked = Array.from(picker.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
    closeSkillPicker();
    panel?.classList.remove("ssc-picker-open");
    applySkillSelection(data, path, checked);
    await saveAndRerender(panel, actor, data);
  };

  const clearSelection = async () => {
    closeSkillPicker();
    panel?.classList.remove("ssc-picker-open");
    applySkillSelection(data, path, []);
    await saveAndRerender(panel, actor, data);
  };

  const cancelSelection = () => {
    closeSkillPicker();
    panel?.classList.remove("ssc-picker-open");
  };

  picker.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();
    if (button.dataset.action === "save-inline-skill-picker") await saveSelection();
    if (button.dataset.action === "clear-inline-skill-picker") await clearSelection();
    if (button.dataset.action === "close-inline-skill-picker") cancelSelection();
  });

  picker.addEventListener("change", (event) => {
    if (!event.target.matches?.("input[type='checkbox']")) return;
    refreshSelectionLimit();
  });

  picker.addEventListener("keydown", async (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelSelection();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      await saveSelection();
    }
  });

  const outsideHandler = (event) => {
    if (picker.contains(event.target) || anchor?.contains?.(event.target)) return;
    cancelSelection();
  };
  const resizeHandler = () => positionPicker();
  setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);
  window.addEventListener("resize", resizeHandler);
  window.addEventListener("scroll", resizeHandler, true);
  activeSkillPicker = {
    root: picker,
    returnFocus: anchor ?? document.activeElement,
    removeListeners: () => {
      document.removeEventListener("mousedown", outsideHandler);
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("scroll", resizeHandler, true);
    }
  };

  const initialFocus =
    picker.querySelector("input[type='checkbox']:checked") ??
    picker.querySelector("input[type='checkbox']") ??
    picker.querySelector("button[data-action='close-inline-skill-picker']");
  initialFocus?.focus?.();
}

function getSkillSelectionLimit(path) {
  return path?.endsWith(".skills") ? MAX_PICKER_SKILLS : null;
}

function applySkillSelection(data, path, values) {
  const limit = getSkillSelectionLimit(path);
  const selected = Array.isArray(values) ? values.slice(0, limit ?? values.length) : [];
  setPath(data, path, selected.join(", "));
  if (path.startsWith("exams.") && path.endsWith(".skills")) {
    const [, year, index] = path.split(".");
    updateExamDice(data, Number(year), Number(index));
  }
}

function positionSkillPicker(picker, anchor) {
  const margin = 16;
  const maxWidth = Math.min(340, Math.max(280, window.innerWidth - (margin * 2)));
  picker.style.width = `${maxWidth}px`;
  const anchorRect = anchor?.getBoundingClientRect?.();
  const pickerRect = picker.getBoundingClientRect();
  const leftBase = anchorRect ? anchorRect.left : (window.innerWidth - maxWidth) / 2;
  const topBase = anchorRect ? anchorRect.bottom + 8 : (window.innerHeight - pickerRect.height) / 2;
  const maxLeft = window.innerWidth - pickerRect.width - margin;
  const maxTop = window.innerHeight - pickerRect.height - margin;
  picker.style.left = `${clamp(leftBase, margin, Math.max(margin, maxLeft))}px`;
  picker.style.top = `${clamp(topBase, margin, Math.max(margin, maxTop))}px`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function stripHtml(value) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = value;
  return wrapper.textContent ?? "";
}

function randomId() {
  return foundry.utils.randomID?.() ?? crypto.randomUUID();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function safeFileName(value) {
  return String(value ?? "student")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "student";
}

