"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import galleryImages from "../../../public/winner-gallery.json";
import type { SocialAIResult } from "../_lib/data";
import { createRecapText, getBadges, getGalleryEntries, groupRounds, type Round } from "../_lib/insights";
import styles from "../page.module.css";

export async function downloadRecap(round: Round) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bilden kunde inte skapas i den här webbläsaren.");

  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#102449");
  background.addColorStop(1, "#2459b8");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#bfdbfe";
  ctx.font = "600 28px sans-serif";
  ctx.fillText("SOCIAL AI FREDAG", 70, 85);
  ctx.fillStyle = "#fff";
  ctx.font = "700 56px sans-serif";
  ctx.fillText(round.round !== null ? `Runda ${round.round}` : "Veckans vinnare", 70, 160, 1050);
  ctx.font = "26px sans-serif";
  ctx.fillStyle = "#dbeafe";
  ctx.fillText(round.date ?? "Datum saknas", 70, 205);
  const columns = round.winners.length > 3 ? 2 : 1;
  const rows = Math.ceil(round.winners.length / columns);
  const spacing = Math.min(105, 300 / Math.max(rows, 1));
  const nameSize = Math.min(42, Math.max(16, spacing * 0.44));
  round.winners.forEach((winner, index) => {
    const x = 70 + (index % columns) * 540;
    const y = 270 + Math.floor(index / columns) * spacing;
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${nameSize}px sans-serif`;
    ctx.fillText(winner.Namn, x, y, columns === 2 ? 500 : 1050);
    ctx.fillStyle = "#bfdbfe";
    ctx.font = `${Math.max(14, nameSize * 0.55)}px sans-serif`;
    ctx.fillText(typeof winner.Röster === "number" ? `${winner.Röster} röster` : "Röster saknas", x, y + nameSize * 0.8);
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Bilden kunde inte sparas.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `social-ai-fredag-${round.round ?? round.date ?? "vinnare"}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Highlights({ data }: { data: SocialAIResult[] }) {
  const [recapStatus, setRecapStatus] = useState("");
  const [badgeSearch, setBadgeSearch] = useState("");
  const [badgeLimit, setBadgeLimit] = useState(8);
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryYear, setGalleryYear] = useState("all");
  const [galleryOffice, setGalleryOffice] = useState("all");
  const [galleryLimit, setGalleryLimit] = useState(9);
  const latest = useMemo(() => groupRounds(data)[0], [data]);
  const badges = useMemo(() => getBadges(data), [data]);
  const images = useMemo(() => getGalleryEntries(data, galleryImages), [data]);
  const years = [...new Set(images.map((entry) => entry.date.slice(0, 4)))].sort().reverse();
  const offices = [...new Set(images.map((entry) => entry.winner.Kontor && entry.winner.Kontor !== "N/A" ? entry.winner.Kontor : "Okänt"))].sort();
  const matchingBadges = badges.filter((entry) => entry.name.toLocaleLowerCase("sv").includes(badgeSearch.trim().toLocaleLowerCase("sv")));
  const matchingImages = images.filter((entry) => {
    const office = entry.winner.Kontor && entry.winner.Kontor !== "N/A" ? entry.winner.Kontor : "Okänt";
    return (galleryYear === "all" || entry.date.startsWith(galleryYear))
      && (galleryOffice === "all" || office === galleryOffice)
      && entry.name.toLocaleLowerCase("sv").includes(gallerySearch.trim().toLocaleLowerCase("sv"));
  });
  const basePath = process.env.NODE_ENV === "production" ? "/social-ai-fredag" : "";

  const copyRecap = async () => {
    if (!latest) return;
    try {
      await navigator.clipboard.writeText(createRecapText(latest));
      setRecapStatus("Texten är kopierad.");
    } catch {
      setRecapStatus("Kunde inte kopiera texten. Kontrollera webbläsarens behörigheter.");
    }
  };
  const saveRecap = async () => {
    if (!latest) return;
    try {
      await downloadRecap(latest);
      setRecapStatus("Bilden är klar för nedladdning.");
    } catch {
      setRecapStatus("Kunde inte skapa bilden i webbläsaren.");
    }
  };

  return (
    <section className={`${styles.container} ${styles.highlights}`} aria-labelledby="highlights-title">
      <h2 id="highlights-title">Fredagens höjdpunkter</h2>
      {latest && <section className={styles.recap} aria-labelledby="recap-title">
        <div className={styles.recapKicker}>SOCIAL AI FREDAG</div>
        <h3 id="recap-title">🏆 Senaste fredagen {latest.round !== null && `· Runda ${latest.round}`}</h3>
        <p>{latest.date ?? "Datum saknas"}</p>
        <ul className={styles.recapWinners}>
          {latest.winners.map((winner, index) => <li key={`${winner.Namn}-${index}`}>
            <strong>{winner.Namn}</strong><span>{typeof winner.Röster === "number" ? `${winner.Röster} röster` : "Röster saknas"}</span>
          </li>)}
        </ul>
        <div className={styles.recapActions}>
          <button onClick={saveRecap}>Ladda ned bild</button>
          <button onClick={copyRecap}>Kopiera text</button>
        </div>
        <p className={styles.recapStatus} role="status">{recapStatus}</p>
      </section>}

      <section className={styles.highlightSection} aria-labelledby="badges-title">
        <div className={styles.insightHeading}>
          <h3 id="badges-title">🏅 Prestationsmärken</h3>
          <label>Sök vinnare{" "}
            <input value={badgeSearch} onChange={(event) => { setBadgeSearch(event.target.value); setBadgeLimit(8); }} placeholder="Namn" />
          </label>
        </div>
        <p>Märken baserade på registrerade vinster, vinstsviter och röster.</p>
        <div className={styles.badgeGrid}>
          {matchingBadges.slice(0, badgeLimit).map((entry) => <article className={styles.badgeCard} key={entry.name}>
            <strong>{entry.name}</strong> <span>{entry.wins} vinster</span>
            <ul>{entry.badges.map((badge) => <li key={badge.id}>{badge.label}</li>)}</ul>
          </article>)}
        </div>
        {!matchingBadges.length && <p>Inga vinnare matchar sökningen.</p>}
        {badgeLimit < matchingBadges.length && <button className={styles.moreButton} onClick={() => setBadgeLimit((count) => count + 8)}>Visa fler vinnare</button>}
      </section>

      <section className={styles.highlightSection} aria-labelledby="gallery-title">
        <div className={styles.insightHeading}>
          <h3 id="gallery-title">🖼️ Vinnargalleri</h3>
          <div className={styles.timelineFilters}>
            <label>Sök vinnare{" "}
              <input value={gallerySearch} onChange={(event) => { setGallerySearch(event.target.value); setGalleryLimit(9); }} placeholder="Namn" />
            </label>
            <label>År{" "}
              <select value={galleryYear} onChange={(event) => { setGalleryYear(event.target.value); setGalleryLimit(9); }}>
                <option value="all">Alla år</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label>Kontor{" "}
              <select value={galleryOffice} onChange={(event) => { setGalleryOffice(event.target.value); setGalleryLimit(9); }}>
                <option value="all">Alla kontor</option>
                {offices.map((office) => <option key={office} value={office}>{office}</option>)}
              </select>
            </label>
          </div>
        </div>
        <p>Visar {matchingImages.length} matchade vinnarbilder. Äldre rundor saknar bilder i galleriet.</p>
        <div className={styles.galleryGrid}>
          {matchingImages.slice(0, galleryLimit).map((entry) => {
            const src = `${basePath}/winner-images/${entry.image}`;
            return <figure className={styles.galleryCard} key={`${entry.date}-${entry.name}`}>
              <a href={src} target="_blank" rel="noreferrer">
                <Image src={src} alt={`Vinnarbild av ${entry.name} från ${entry.date}`} width={600} height={600} unoptimized />
              </a>
              <figcaption>
                <strong>{entry.name}</strong>
                <span>{entry.date} · {typeof entry.winner.Runda === "number" ? `runda ${entry.winner.Runda}` : "okänd runda"}</span>
                <span>{typeof entry.winner.Röster === "number" ? `${entry.winner.Röster} röster` : "Röster saknas"} · {entry.winner.Kontor && entry.winner.Kontor !== "N/A" ? entry.winner.Kontor : "Okänt kontor"}</span>
              </figcaption>
            </figure>;
          })}
        </div>
        {!matchingImages.length && <p>Inga bilder matchar filtren.</p>}
        {galleryLimit < matchingImages.length && <button className={styles.moreButton} onClick={() => setGalleryLimit((count) => count + 9)}>Visa fler bilder</button>}
      </section>
    </section>
  );
}
