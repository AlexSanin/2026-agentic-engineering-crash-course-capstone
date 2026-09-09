#!/usr/bin/env node
// Самоперевірка capstone перед здачею. Працює в будь-якому репозиторії і на будь-якому стеку:
// чистий Node, без залежностей, без мережі.
//
//   node scripts/capstone-check.mjs [шлях-до-репозиторію]
//
// Чотири пункти — ті самі, що в RUBRIC.md. Скрипт перевіряє ФОРМУ, а не зміст: він бачить,
// що журнал є і що в ньому є зміна рівня, але не бачить, чи вона чесна. Зелений вивід —
// необхідна умова приймання, не достатня.
// Вихідний код 0, якщо всі чотири пункти пройдені, інакше 1.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

const root = resolve(process.cwd(), process.argv[2] ?? "."); // resolve, не join: аргумент може бути абсолютним шляхом
const has = (p) => existsSync(join(root, p));
const read = (p) => (has(p) ? readFileSync(join(root, p), "utf8") : null); // "" для порожнього файла, null — якщо немає

// git: що саме закомічено, а не просто лежить на диску
const git = spawnSync("git", ["-C", root, "ls-files"], { encoding: "utf8" });
const tracked = git.status === 0 ? git.stdout.split(/\r?\n/).filter(Boolean) : null;
const isTracked = (p) => (tracked ? tracked.includes(p) : has(p));
const trackedUnder = (pre) => (tracked ? tracked.filter((f) => f.startsWith(pre)) : []);

const results = [];
const notes = [];
const req = (name, ok, lines) => results.push({ kind: "req", name, ok, lines: [].concat(lines) });
const bonus = (name, ok, detail) => results.push({ kind: "bonus", name, ok, detail });

// ── 1 · Репозиторій із харнесом у git ─────────────────────────────────────────
// Чотири шари з таблиці рубрики: статичний контекст · межі · спостережуваність · валюта довіри.
let logStats = { entries: 0, executed: 0, blocked: 0, sessions: 0 };
{
  const layers = [];
  const add = (ok, label, detail) => layers.push({ ok, label, detail });

  if (!tracked) notes.push("git не знайдено або це не git-репозиторій — перевіряю файли на диску, а не в комітах");

  const context = ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"].filter(isTracked);
  add(context.length > 0, "контекст", context.join(", ") || "немає AGENTS.md / CLAUDE.md у git");

  const toolFiles = [".claude/", ".cursor/", ".codex/"].flatMap(trackedUnder);
  const tools = [...new Set(toolFiles.map((f) => f.split("/")[0]))];
  add(tools.length > 0, "межі", tools.length ? `${tools.join(", ")} — ${toolFiles.length} файл(ів) у git` : "немає закомічених .claude/ .cursor/ .codex/");

  const rawLog = read(".agent-log/actions.jsonl");
  if (rawLog === null) {
    add(false, "журнал", "немає .agent-log/actions.jsonl — не видно жодної дії агента");
  } else {
    const lines = rawLog
      .split(/\r?\n/)
      .filter(Boolean)
      .flatMap((l) => {
        try {
          return [JSON.parse(l)];
        } catch {
          return [];
        }
      });
    const done = new Set(lines.filter((e) => e.event && !/^pre(ToolUse)?$/i.test(e.event) && e.event !== "PreToolUse" && e.id).map((e) => e.id));
    const blocked = lines.filter((e) => (e.event === "PreToolUse" || e.event === "preToolUse") && e.id && !done.has(e.id));
    logStats = {
      entries: lines.length,
      executed: lines.filter((e) => e.event && e.event !== "PreToolUse" && e.event !== "preToolUse").length,
      blocked: blocked.length,
      sessions: new Set(lines.map((e) => e.session ?? e.session_id).filter(Boolean)).size,
    };
    const ok = lines.length >= 10;
    add(
      ok,
      "журнал",
      lines.length === 0
        ? ".agent-log/actions.jsonl порожній — hooks не спрацювали жодного разу"
        : `${lines.length} записів · ${logStats.executed} виконано · ${logStats.blocked} не виконано · ${logStats.sessions} сесій` + (ok ? "" : " — замало (потрібно ≥ 10)"),
    );
    if (ok && logStats.blocked === 0)
      notes.push("у журналі немає жодної дії, яку зупинили — рубрика вимагає показати хоча б один такий випадок (якщо ви відкотили вручну, покажіть коміт)");
    if (lines.length && !isTracked(".agent-log/actions.jsonl")) notes.push(".agent-log/actions.jsonl не закомічений — рецензент його не побачить");
  }

  let gate = null;
  const pkgRaw = read("package.json");
  if (pkgRaw) {
    try {
      const s = JSON.parse(pkgRaw).scripts ?? {};
      const hit = ["check", "verify", "ci", "test"].find((k) => s[k]);
      if (hit) gate = `package.json → "${hit}": ${String(s[hit]).slice(0, 55)}`;
    } catch {
      notes.push("package.json не читається як JSON");
    }
  }
  if (!gate && has(".github/workflows")) {
    const wf = readdirSync(join(root, ".github/workflows")).filter((f) => /\.ya?ml$/.test(f));
    if (wf.length) gate = `.github/workflows/${wf[0]}`;
  }
  if (!gate) for (const f of ["Makefile", "justfile", "Taskfile.yml", "noxfile.py", "tox.ini"]) if (has(f)) gate = f;
  add(!!gate, "гейт", gate ?? "не видно однієї команди перевірки (package.json scripts, CI або Makefile)");

  req(
    "1 · Репозиторій із харнесом у git",
    layers.every((l) => l.ok),
    layers.map((l) => `${l.ok ? "+" : "-"} ${l.label.padEnd(9)} ${l.detail}`),
  );
}

// ── 2 · PR і 4 · Відео (обидва з docs/capstone.md) ────────────────────────────
{
  const md = read("docs/capstone.md") ?? read("CAPSTONE.md") ?? read("SUBMISSION.md");
  const placeholder = (u) => /[<>]|TODO|example\.com/i.test(u);
  if (md === null) {
    req("2 · PR, зроблений агентом", false, "немає docs/capstone.md — саме там посилання на PR (шаблон у репозиторії курсу)");
    req("4 · Відео 1–2 хв", false, "немає docs/capstone.md — саме там посилання на відео");
  } else {
    const pr = [...md.matchAll(/https?:\/\/\S+/g)]
      .map((m) => m[0])
      .find((u) => /(github\.com\/.+\/pull\/\d+|gitlab\.com\/.+\/merge_requests\/\d+|bitbucket\.org\/.+\/pull-requests\/\d+)/.test(u) && !placeholder(u));
    req("2 · PR, зроблений агентом", !!pr, pr ?? "у docs/capstone.md немає справжнього посилання на pull request (лишився шаблон)");

    const video = [...md.matchAll(/https?:\/\/[^\s)<>\]]+/g)]
      .map((m) => m[0])
      .find((u) => !placeholder(u) && /youtu\.?be|youtube\.com|loom\.com|drive\.google|vimeo\.com|dropbox\.com|screen\.studio|veed\.io|zoom\.us\/rec|\.mp4($|\?)/i.test(u));
    req("4 · Відео 1–2 хв", !!video, video ?? "у docs/capstone.md немає посилання на відео (YouTube unlisted, Loom, Drive…)");

    const claimed = [...md.matchAll(/^\s*-\s*\[[xX]\]\s*(.+)$/gm)].map((m) => m[1].split("—")[0].trim());
    if (claimed.length) notes.push(`заявлені бонуси (перевіряє людина, не скрипт): ${claimed.join(" · ")}`);
    if (/\bTODO\b/.test(md)) notes.push("у docs/capstone.md лишилися TODO");
  }
}

// ── 3 · Журнал автономності зі зміною рівня ───────────────────────────────────
{
  const md = read("docs/autonomy-log.md");
  if (md === null) {
    req("3 · docs/autonomy-log.md зі зміною рівня", false, "файл не знайдено (шаблон — docs/autonomy-log.md у репозиторії курсу)");
  } else {
    const rows = md
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith("|"))
      .map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
    const header = rows.find((r) => r.some((c) => /^рівень$|^level$/i.test(c)) && r.length >= 4);
    const col = header ? header.findIndex((c) => /^рівень$|^level$/i.test(c)) : -1;
    const data = header
      ? rows.filter(
          (r) =>
            r !== header &&
            r.length === header.length &&
            !r.every((c) => /^:?-{2,}:?$/.test(c) || c === "") &&
            !/приклад|TODO/i.test(r.join(" ")) &&
            r.filter(Boolean).length >= 3,
        )
      : [];
    const levels = new Set(data.map((r) => (r[col].match(/[1-5]/) ?? [])[0]).filter(Boolean));
    const bad = [];
    if (col < 0) bad.push('у таблиці немає колонки "Рівень" (лишіть шапку шаблону без змін)');
    else if (data.length < 3) bad.push(`заповнено ${data.length} рядк(ів), потрібно ≥ 3 — рядки з «приклад» не рахуються`);
    else if (levels.size < 2) bad.push(`усі рядки на рівні ${[...levels].join(", ") || "?"} — потрібна щонайменше одна явна зміна рівня`);
    req("3 · docs/autonomy-log.md зі зміною рівня", bad.length === 0, bad.length ? bad : `${data.length} рядків · рівні: ${[...levels].sort().join(" → ")}`);

    const sec = /##\s*Зміни рівня([\s\S]*?)(?=\n##\s|$)/.exec(md);
    const prose = sec ? sec[1].replace(/^\s*>.*приклад[\s\S]*?(?=\n\s*\n|$)/gim, "").replace(/[#>_\s*-]/g, "") : "";
    if (levels.size >= 2 && prose.length < 80) notes.push('секція "Зміни рівня" порожня або лишилися самі приклади — саме там пояснюють, ЧОМУ рівень змінили');
  }
}

// ── Бонуси ────────────────────────────────────────────────────────────────────
{
  const hookScripts = [...trackedUnder(".claude/hooks"), ...trackedUnder(".cursor/hooks"), ...trackedUnder(".codex/hooks")];
  const cfg = (read(".claude/settings.json") ?? "") + (read(".cursor/hooks.json") ?? "") + (read(".codex/hooks.json") ?? "");
  const stop = /"(Stop|stop|SubagentStop|subagentStop)"\s*:/.test(cfg) && hookScripts.length > 0;
  bonus("Блокуючий Stop hook", stop, stop ? `подія Stop у конфігу + ${hookScripts.length} hook-скрипт(ів)` : "не видно події Stop у конфігу hooks");

  const traceDoc = ["docs/requirements.md", "docs/traceability.md", "docs/trace.md"].find(has);
  const traceTable = /вимог\w*\s*(→|->|\|)\s*тест/i.test((read("docs/autonomy-log.md") ?? "") + (read("docs/capstone.md") ?? ""));
  bonus("Трасування вимог", !!traceDoc || traceTable, traceDoc ?? (traceTable ? "таблиця «вимога → тест» у docs/" : "не знайдено таблиці «вимога → тест»"));

  bonus("maker ≠ checker", logStats.sessions >= 2, `${logStats.sessions} сесій у журналі дій${logStats.sessions >= 2 ? "" : " — потрібні щонайменше дві"}`);

  const nums = /\d+\s*(запропон|proposed|виконан|executed|не виконан)/i.test((read("docs/capstone.md") ?? "") + (read("docs/autonomy-log.md") ?? ""));
  bonus("Спостережуваність: точні цифри", nums, nums ? "цифри з журналу вставлені в документи" : "у docs/ немає цифр із agent-log");
}

// ── Вивід ─────────────────────────────────────────────────────────────────────
const isTemplate = has("RUBRIC.md") && (read("docs/capstone.md") ?? "").includes("Скопіюйте у свій репозиторій");
console.log(`\nCapstone · самоперевірка · ${relative(process.cwd(), root) || "."}\n`);
if (isTemplate) console.log("  (це шаблонний репозиторій курсу — запускайте скрипт у СВОЄМУ проєкті)\n");

const required = results.filter((r) => r.kind === "req").sort((a, b) => a.name.localeCompare(b.name)); // 1..4 у порядку рубрики
for (const r of required) {
  console.log(`  ${r.ok ? "OK" : "НІ"}  ${r.name}`);
  for (const l of r.lines) console.log(`      ${l}`);
}
console.log("\n  Бонуси (на приймання не впливають):");
for (const r of results.filter((r) => r.kind === "bonus")) console.log(`  ${r.ok ? " +" : "  "}  ${r.name} — ${r.detail}`);
if (notes.length) {
  console.log("\n  Зверніть увагу:");
  for (const n of notes) console.log(`   !  ${n}`);
}
const failed = required.filter((r) => !r.ok);
console.log(
  failed.length
    ? `\n  ${required.length - failed.length}/${required.length} пунктів рубрики. Не вистачає: ${failed.map((f) => f.name.split(" · ")[0]).join(", ")}.\n`
    : `\n  ${required.length}/${required.length} пунктів рубрики — форма в порядку.\n  Далі рецензент дивиться на зміст: чи чесний журнал і чи справді ви щось зупинили.\n`,
);
process.exit(failed.length ? 1 : 0);
