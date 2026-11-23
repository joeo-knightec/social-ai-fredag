import type { SocialAIResult } from "./data";

export type Round = {
  round: number | null;
  date: string | null;
  winners: SocialAIResult[];
};

export type GalleryImage = { date: string; name: string; image: string };
export type Badge = { id: string; label: string };

const validRound = (value: SocialAIResult["Runda"]): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const validDate = (value: SocialAIResult["Datum"]): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const knownName = (name: string) => name.trim() !== "" && name.toLowerCase() !== "unknown";

export function groupRounds(data: SocialAIResult[]): Round[] {
  const groups = new Map<string, Round>();
  for (const row of data) {
    const round = validRound(row.Runda) ? row.Runda : null;
    const date = validDate(row.Datum) ? row.Datum : null;
    if (round === null && date === null) continue;
    const key = round !== null ? `round:${round}` : `date:${date}`;
    const group = groups.get(key) ?? { round, date, winners: [] };
    if (!group.date && date) group.date = date;
    group.winners.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.round !== null && b.round !== null) return b.round - a.round;
    return a.date ? -1 : b.date ? 1 : 0;
  });
}

export function getStreaks(data: SocialAIResult[]) {
  const roundsByName = new Map<string, Set<number>>();
  for (const row of data) {
    if (!knownName(row.Namn) || !validRound(row.Runda)) continue;
    const rounds = roundsByName.get(row.Namn) ?? new Set<number>();
    rounds.add(row.Runda);
    roundsByName.set(row.Namn, rounds);
  }
  const latestRound = groupRounds(data)[0]?.round ?? null;
  const streaks = [...roundsByName].map(([name, rounds]) => {
    const sorted = [...rounds].sort((a, b) => a - b);
    let longest = 0;
    let current = 0;
    let previous = -1;
    let comeback = 0;
    for (const round of sorted) {
      if (previous !== -1) comeback = Math.max(comeback, round - previous - 1);
      current = round === previous + 1 ? current + 1 : 1;
      longest = Math.max(longest, current);
      previous = round;
    }
    return {
      name, longest, current: previous === latestRound ? current : 0, comeback,
      firstRound: sorted[0],
    };
  });
  return streaks.sort((a, b) => b.longest - a.longest || a.name.localeCompare(b.name, "sv"));
}

export function getHallOfFame(data: SocialAIResult[]) {
  const wins = new Map<string, number>();
  for (const row of data) {
    if (knownName(row.Namn)) wins.set(row.Namn, (wins.get(row.Namn) ?? 0) + 1);
  }
  const maxWins = Math.max(0, ...wins.values());
  const validVotes = data.filter((row) => knownName(row.Namn) && typeof row.Röster === "number");
  const maxVotes = Math.max(0, ...validVotes.map((row) => typeof row.Röster === "number" ? row.Röster : 0));
  return {
    maxWins,
    mostWins: [...wins].filter(([, count]) => count === maxWins).map(([name]) => name),
    maxVotes,
    topVotes: validVotes.filter((row) => row.Röster === maxVotes),
    sharedRounds: groupRounds(data).filter((round) => round.winners.length > 1).length,
  };
}

export function getOfficeRivalry(data: SocialAIResult[], year: string) {
  const counts = new Map<string, number>();
  for (const row of data) {
    if (year !== "all" && (!validDate(row.Datum) || row.Datum.slice(0, 4) !== year)) continue;
    const office = row.Kontor && row.Kontor !== "N/A" ? row.Kontor : "Okänt";
    counts.set(office, (counts.get(office) ?? 0) + 1);
  }
  return [...counts].map(([office, wins]) => ({ office, wins }))
    .sort((a, b) => b.wins - a.wins || a.office.localeCompare(b.office, "sv"));
}

export function getAwards(data: SocialAIResult[]) {
  const streaks = getStreaks(data);
  const maxComeback = Math.max(0, ...streaks.map((entry) => entry.comeback));
  const lastDebut = Math.max(0, ...streaks.map((entry) => entry.firstRound));
  const sharedWins = new Map<string, number>();
  for (const round of groupRounds(data)) {
    const names = [...new Set(round.winners.map((row) => row.Namn))];
    if (names.length < 2) continue;
    for (const name of names) {
      if (knownName(name)) sharedWins.set(name, (sharedWins.get(name) ?? 0) + 1);
    }
  }
  const maxShared = Math.max(0, ...sharedWins.values());
  return {
    comeback: { value: maxComeback, names: maxComeback ? streaks.filter((entry) => entry.comeback === maxComeback).map((entry) => entry.name) : [] },
    debut: { round: lastDebut, names: streaks.filter((entry) => entry.firstRound === lastDebut).map((entry) => entry.name) },
    shared: { value: maxShared, names: [...sharedWins].filter(([, count]) => count === maxShared).map(([name]) => name) },
  };
}

export function getBadges(data: SocialAIResult[]) {
  const winners = new Map<string, { wins: number; bestVotes: number }>();
  for (const row of data) {
    if (!knownName(row.Namn)) continue;
    const winner = winners.get(row.Namn) ?? { wins: 0, bestVotes: 0 };
    winner.wins++;
    if (typeof row.Röster === "number") winner.bestVotes = Math.max(winner.bestVotes, row.Röster);
    winners.set(row.Namn, winner);
  }
  const streaks = new Map(getStreaks(data).map((entry) => [entry.name, entry.longest]));
  return [...winners].map(([name, { wins, bestVotes }]) => {
    const badges: Badge[] = [{ id: "first", label: "Första segern" }];
    if (wins >= 5) badges.push({ id: "five", label: "5 segrar" });
    if (wins >= 10) badges.push({ id: "ten", label: "10 segrar" });
    if ((streaks.get(name) ?? 0) >= 3) badges.push({ id: "streak", label: "3 vinster i rad" });
    if (bestVotes >= 20) badges.push({ id: "votes20", label: "20 röster" });
    if (bestVotes >= 50) badges.push({ id: "votes50", label: "50 röster" });
    return { name, wins, badges };
  }).sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name, "sv"));
}

export function getGalleryEntries(data: SocialAIResult[], images: GalleryImage[]) {
  const winners = new Map(data.filter((row) => validDate(row.Datum))
    .map((row) => [`${row.Datum}\0${row.Namn}`, row]));
  return images.flatMap((image) => {
    const winner = winners.get(`${image.date}\0${image.name}`);
    return winner ? [{ ...image, winner }] : [];
  }).sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, "sv"));
}

export function createRecapText(round: Round): string {
  const title = round.round !== null ? `Social AI Fredag – runda ${round.round}` : "Social AI Fredag";
  const date = round.date ? ` (${round.date})` : "";
  const winners = round.winners.map((winner) =>
    `${winner.Namn} – ${typeof winner.Röster === "number" ? `${winner.Röster} röster` : "okänt antal röster"}`).join("\n");
  return `${title}${date}\n🏆 ${round.winners.length === 1 ? "Vinnare" : "Vinnare (delad seger)"}:\n${winners}`;
}
