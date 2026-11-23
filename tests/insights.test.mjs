import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/app/_lib/insights.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2017 } }).outputText;
const { groupRounds, getStreaks, getHallOfFame, getOfficeRivalry, getAwards, getBadges, getGalleryEntries, createRecapText } =
  await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const result = (name, round, date, votes, office = "North") =>
  ({ Namn: name, Runda: round, Datum: date, Röster: votes, Kontor: office });

test("latest round includes tied winners without mutating input", () => {
  const data = [
    result("Alex", 4, "2026-01-09", 8),
    result("Bea", 5, "2026-01-16", 9),
    result("Alex", 5, "2026-01-16", 9),
    result("Old", 1, "N/A", 3),
  ];
  const original = JSON.stringify(data);
  const rounds = groupRounds(data);
  assert.equal(rounds[0].round, 5);
  assert.deepEqual(rounds[0].winners.map((row) => row.Namn), ["Bea", "Alex"]);
  assert.equal(JSON.stringify(data), original);
  assert.deepEqual(groupRounds([result("New", "N/A", "2026-02-01", 3)])[0].date, "2026-02-01");
});

test("streaks use distinct consecutive rounds, including ties and excluding unknown names", () => {
  const data = [
    result("Alex", 1, null, 2), result("Alex", 2, null, 4), result("Alex", 2, null, 4),
    result("Bea", 2, null, 4), result("Alex", 5, null, 5), result("Bea", 5, null, 5),
    result("Unknown", 3, null, 4), result("Unknown", 4, null, 4),
    result("No round", "N/A", null, 8),
  ];
  const streaks = getStreaks(data);
  assert.deepEqual(streaks.map(({ name, longest, current, comeback }) => ({ name, longest, current, comeback })), [
    { name: "Alex", longest: 2, current: 1, comeback: 2 },
    { name: "Bea", longest: 1, current: 1, comeback: 2 },
  ]);
});

test("does not claim a current streak when the newest result has no round number", () => {
  const data = [
    result("Alex", 1, "2026-01-09", 2),
    result("Alex", 2, "2026-01-16", 4),
    result("Bea", "N/A", "2026-01-23", 5),
  ];
  assert.equal(getStreaks(data)[0].current, 0);
});

test("hall and awards include joint records and do not infer participation", () => {
  const data = [
    result("Alex", 1, null, 5), result("Bea", 1, null, 5),
    result("Alex", 4, "2026-01-01", 8), result("Bea", 4, "2026-01-01", 8),
    result("Unknown", 3, null, 100),
  ];
  const hall = getHallOfFame(data);
  assert.deepEqual(hall.mostWins.sort(), ["Alex", "Bea"]);
  assert.equal(hall.maxWins, 2);
  assert.equal(hall.maxVotes, 8);
  assert.deepEqual(hall.topVotes.map((row) => row.Namn).sort(), ["Alex", "Bea"]);
  assert.equal(hall.sharedRounds, 2);
  const awards = getAwards(data);
  assert.deepEqual(awards.comeback.names.sort(), ["Alex", "Bea"]);
  assert.equal(awards.comeback.value, 2);
  assert.equal(awards.shared.value, 2);
  assert.deepEqual(awards.shared.names.sort(), ["Alex", "Bea"]);
});

test("office rankings count shared wins and filter only known dates", () => {
  const data = [
    result("Alex", 1, "N/A", 5, "North"),
    result("Alex", 2, "2026-01-01", 5, "North"),
    result("Bea", 2, "2026-01-01", 5, "West"),
    result("Cleo", 3, "2025-01-01", 5, "N/A"),
  ];
  assert.deepEqual(getOfficeRivalry(data, "2026"), [{ office: "North", wins: 1 }, { office: "West", wins: 1 }]);
  assert.deepEqual(getOfficeRivalry(data, "all"), [{ office: "North", wins: 2 }, { office: "Okänt", wins: 1 }, { office: "West", wins: 1 }]);
  assert.deepEqual(getOfficeRivalry(data, "2027"), []);
});

test("badges recognize win, streak and vote milestones without awarding unknown winners", () => {
  const data = [
    result("Alex", 1, null, 20), result("Alex", 2, null, 8), result("Alex", 3, null, 50),
    result("Alex", 5, null, 5), result("Alex", 6, null, 5),
    result("Bea", 3, null, "N/A"), result("Unknown", 3, null, 100),
  ];
  const badges = getBadges(data);
  assert.deepEqual(badges.map((entry) => entry.name), ["Alex", "Bea"]);
  assert.deepEqual(badges[0].badges.map((badge) => badge.id), ["first", "five", "streak", "votes20", "votes50"]);
  assert.deepEqual(badges[1].badges.map((badge) => badge.id), ["first"]);
});

test("gallery only links images matching both the winner and date", () => {
  const data = [result("Alex", 2, "2026-01-09", 8, "West"), result("Bea", 2, "2026-01-09", 8)];
  const images = [
    { date: "2026-01-09", name: "Alex", image: "alex.webp" },
    { date: "2026-01-09", name: "Bea", image: "bea.webp" },
    { date: "2026-01-10", name: "Alex", image: "wrong-date.webp" },
    { date: "2026-01-09", name: "Cleo", image: "not-a-winner.webp" },
  ];
  const entries = getGalleryEntries(data, images);
  assert.deepEqual(entries.map((entry) => entry.image), ["alex.webp", "bea.webp"]);
  assert.equal(entries[0].winner.Kontor, "West");
});

test("recap text includes every tied winner and handles missing votes and date", () => {
  const text = createRecapText({
    round: 5, date: null,
    winners: [result("Alex", 5, null, 9), result("Bea", 5, null, "N/A")],
  });
  assert.match(text, /runda 5/);
  assert.match(text, /delad seger/);
  assert.match(text, /Alex – 9 röster/);
  assert.match(text, /Bea – okänt antal röster/);
  assert.doesNotMatch(text, /null/);
});

