"use client";

import { useMemo, useState } from "react";
import type { SocialAIResult } from "../_lib/data";
import { getAwards, getHallOfFame, getOfficeRivalry, getStreaks, groupRounds } from "../_lib/insights";
import styles from "../page.module.css";

export default function Insights({ data }: { data: SocialAIResult[] }) {
  const [timelineYear, setTimelineYear] = useState("all");
  const [timelineOffice, setTimelineOffice] = useState("all");
  const [officeYear, setOfficeYear] = useState("all");
  const [visibleRounds, setVisibleRounds] = useState(10);
  const rounds = useMemo(() => groupRounds(data), [data]);
  const streaks = useMemo(() => getStreaks(data), [data]);
  const hall = useMemo(() => getHallOfFame(data), [data]);
  const awards = useMemo(() => getAwards(data), [data]);
  const offices = useMemo(() => getOfficeRivalry(data, officeYear), [data, officeYear]);
  const years = useMemo(() => [...new Set(rounds.flatMap((round) => round.date ? [round.date.slice(0, 4)] : []))].sort().reverse(), [rounds]);
  const officeOptions = useMemo(() => [...new Set(data.map((row) => row.Kontor && row.Kontor !== "N/A" ? row.Kontor : "Okänt"))].sort(), [data]);
  const timeline = rounds.filter((round) =>
    timelineYear === "all" || (timelineYear === "unknown" ? !round.date : round.date?.startsWith(timelineYear)))
    .map((round) => ({
      ...round,
      winners: round.winners.filter((winner) =>
        timelineOffice === "all" || (winner.Kontor && winner.Kontor !== "N/A" ? winner.Kontor : "Okänt") === timelineOffice),
    }))
    .filter((round) => round.winners.length > 0);
  const ongoing = streaks.filter((entry) => entry.current > 0).sort((a, b) => b.current - a.current);
  const maxOfficeWins = offices[0]?.wins ?? 0;

  return (
    <section className={`${styles.container} ${styles.insights}`} aria-labelledby="insights-title">
      <h2 id="insights-title">Statistik &amp; utmärkelser</h2>
      <div className={styles.insightGrid}>
        <section className={styles.insightCard} aria-labelledby="streak-title">
          <h3 id="streak-title">🔥 Vinstsviter</h3>
          <p>Vinster i numrerade rundor i följd, även delade vinster.</p>
          {streaks.length ? (
            <ol>
              {streaks.slice(0, 5).map((entry) => <li key={entry.name}>{entry.name} — {entry.longest} i rad</li>)}
            </ol>
          ) : <p>Inga numrerade rundor att jämföra.</p>}
          {ongoing.length > 0 && <p><strong>Pågående:</strong> {ongoing.map((entry) => `${entry.name} (${entry.current})`).join(", ")}</p>}
        </section>

        <section className={styles.insightCard} aria-labelledby="hall-title">
          <h3 id="hall-title">🏆 Hall of fame</h3>
          {hall.mostWins.length > 0 ? (
            <ul>
              <li><strong>Flest vinster:</strong> {hall.mostWins.join(", ")} — {hall.maxWins}</li>
              <li><strong>Flest röster i en vinst:</strong> {hall.topVotes.length ? `${hall.topVotes.map((row) => row.Namn).join(", ")} — ${hall.maxVotes}` : "Okänt"}</li>
              <li><strong>Delade vinstomgångar:</strong> {hall.sharedRounds}</li>
            </ul>
          ) : <p>Inga kända vinnare ännu.</p>}
          <p>Vi har bara vinnarnas röster, inte marginalen till övriga deltagare.</p>
        </section>

        <section className={styles.insightCard} aria-labelledby="awards-title">
          <h3 id="awards-title">✨ Roliga utmärkelser</h3>
          <ul>
            <li><strong>Årets comeback? Nej, historiens!</strong> {awards.comeback.names.length ? `${awards.comeback.names.join(", ")} — ${awards.comeback.value} rundor mellan vinster` : "Ingen registrerad ännu."}</li>
            <li><strong>Senaste debutseger:</strong> {awards.debut.names.length ? `${awards.debut.names.join(", ")} — runda ${awards.debut.round}` : "Ingen registrerad ännu."}</li>
            <li><strong>Delad glädje:</strong> {awards.shared.names.length ? `${awards.shared.names.join(", ")} — ${awards.shared.value} delade vinstrundor` : "Ingen registrerad ännu."}</li>
          </ul>
          <p>Luckor mellan vinster säger inte om någon deltog i rundorna.</p>
        </section>

        <section className={styles.insightCard} aria-labelledby="office-title">
          <div className={styles.insightHeading}>
            <h3 id="office-title">🏢 Kontorskampen</h3>
            <label>År{" "}
              <select value={officeYear} onChange={(event) => setOfficeYear(event.target.value)}>
                <option value="all">Alla år</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
          <p>Antal vinnarbidrag per kontor. Delade vinster räknas för varje vinnare.</p>
          {offices.length ? <ul className={styles.officeBars}>
            {offices.map(({ office, wins }) => <li key={office}>
              <div><span>{office}</span><strong>{wins}</strong></div>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${wins / maxOfficeWins * 100}%` }} /></div>
            </li>)}
          </ul> : <p>Inga resultat för valt år.</p>}
        </section>
      </div>

      <section className={styles.timeline} aria-labelledby="timeline-title">
        <div className={styles.insightHeading}>
          <h3 id="timeline-title">📅 Vinnarnas tidslinje</h3>
          <div className={styles.timelineFilters}>
            <label>År{" "}
              <select value={timelineYear} onChange={(event) => { setTimelineYear(event.target.value); setVisibleRounds(10); }}>
                <option value="all">Alla år</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
                {rounds.some((round) => !round.date) && <option value="unknown">Okänt datum</option>}
              </select>
            </label>
            <label>Kontor{" "}
              <select value={timelineOffice} onChange={(event) => { setTimelineOffice(event.target.value); setVisibleRounds(10); }}>
                <option value="all">Alla kontor</option>
                {officeOptions.map((office) => <option key={office} value={office}>{office}</option>)}
              </select>
            </label>
          </div>
        </div>
        <ol className={styles.timelineList}>
          {timeline.slice(0, visibleRounds).map((round) => <li key={round.round !== null ? `round-${round.round}` : `date-${round.date}`}>
            <div className={styles.timelineDate}>
              <strong>{round.round !== null ? `Runda ${round.round}` : "Okänd runda"}</strong>
              <span>{round.date ?? "Okänt datum"}</span>
            </div>
            <div>{round.winners.map((winner, index) => <div key={`${winner.Namn}-${index}`}>
              <strong>{winner.Namn}</strong> · {winner.Röster ?? "N/A"} röster · {winner.Kontor && winner.Kontor !== "N/A" ? winner.Kontor : "Okänt kontor"}
            </div>)}</div>
          </li>)}
        </ol>
        {!timeline.length && <p>Inga resultat för valda filter.</p>}
        {visibleRounds < timeline.length && <button className={styles.moreButton} onClick={() => setVisibleRounds((count) => count + 10)}>Visa fler rundor</button>}
      </section>
    </section>
  );
}
