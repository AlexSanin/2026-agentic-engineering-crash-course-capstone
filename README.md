# Crash Course: Agentic Engineering — Capstone

Завдання, рубрика і шаблони фінального проєкту курсу **fwdays · Crash Course: Agentic Engineering**
(вересень 2026). Це **не** проєкт, який треба форкнути: ваш capstone живе у **вашому** репозиторії,
а звідси ви берете рубрику і три файли-шаблони.

Слайди курсу: <https://koldovsky.github.io/2026-agentic-engineering-crash-course/>
Демо-репозиторій із харнесом (шаблон, не проєкт): [`…-day01`](https://github.com/koldovsky/2026-agentic-engineering-crash-course-day01)

## Завдання одним абзацом

Візьміть свій проєкт — будь-який стек. Поставте в нього харнес: статичний контекст, межі, журнал дій,
одну команду перевірки. Зробіть агентом **один PR** під своїм наглядом. Ведіть журнал автономності,
у якому є щонайменше **одна явна зміна рівня довіри** з причиною. Запишіть **1–2 хвилини відео**:
що робив агент, що ви зупинили. Здайте посилання на репозиторій.

Рубрика оцінює не обсяг коду, а чесність журналу.

## Чотири пункти приймання

| # | Пункт | Де доказ |
|---|-------|----------|
| 1 | Репозиторій із харнесом у git: контекст · межі · журнал · гейт | `git ls-files` |
| 2 | Один PR, зроблений агентом під вашим наглядом | `docs/capstone.md` |
| 3 | `docs/autonomy-log.md` зі щонайменше однією явною зміною рівня | сам файл |
| 4 | Відео 1–2 хв: що робив агент, що ви зупинили | `docs/capstone.md` |

Повний текст із поясненнями, що саме приймається, — **[RUBRIC.md](./RUBRIC.md)**.
Бонуси (на приймання не впливають): блокуючий Stop hook · трасування вимог · maker ≠ checker · спостережуваність.

Сертифікат — після прийнятого capstone.

## Як цим користуватися

Скопіюйте у свій репозиторій три файли:

```bash
# з кореня СВОГО проєкту
git clone https://github.com/koldovsky/2026-agentic-engineering-crash-course-capstone ../capstone-template
mkdir -p docs scripts .github
cp ../capstone-template/docs/autonomy-log.md          docs/
cp ../capstone-template/docs/capstone.md              docs/
cp ../capstone-template/scripts/capstone-check.mjs    scripts/
cp ../capstone-template/.github/PULL_REQUEST_TEMPLATE.md .github/
```

| Файл | Навіщо |
|---|---|
| [`docs/autonomy-log.md`](./docs/autonomy-log.md) | шаблон журналу автономності — заповнюєте **під час** роботи |
| [`docs/capstone.md`](./docs/capstone.md) | здача: посилання на PR, на відео, заявлені бонуси |
| [`scripts/capstone-check.mjs`](./scripts/capstone-check.mjs) | самоперевірка перед здачею |
| [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md) | GitHub підставить його в кожен новий PR |

Харнес (`.claude/` або `.cursor/`, hooks, `scripts/agent-log-summary.mjs`) беріть із
[демо-репозиторію](https://github.com/koldovsky/2026-agentic-engineering-crash-course-day01) — там він
уже зібраний і потребує лише Node.

## Самоперевірка

```bash
node scripts/capstone-check.mjs
```

Чистий Node, без залежностей і без мережі; працює на будь-якому стеку. Виводить чотири пункти рубрики
з поясненням, чого бракує, і виходить з кодом 1, поки хоч один пункт не закритий.

Скрипт перевіряє **форму**, а не зміст: він бачить, що журнал є і що в ньому є зміна рівня, — але не
бачить, чи вона чесна. Зелений вивід — необхідна умова, не достатня.

## Здача

Посилання на репозиторій — у чат курсу (fwdays). Дедлайн — оголошується в чаті курсу.
