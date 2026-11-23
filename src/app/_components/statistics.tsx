"use client";
import React from 'react';
import styles from '../page.module.css';
import Image from 'next/image';
import info from '../../../public/info.svg';
import { StatisticsData } from '../_lib/data';

export default function Statistics({
  totalVotes,
  mostWins,
  highestVotes,
  officeRanking,
  latestRound,
  highestTotalVotes,
}: StatisticsData) {
  return (
    <div className={styles.stats}>
      <div className={styles.stat_box}>
        <div className={styles.stat_label}>Totalt antal röster</div>
        <div className={styles.stat_value}>{totalVotes}</div>
      </div>
      <div className={`${styles.stat_box}`}>
        <div className={styles.stat_label}>Totalt flest vinster</div>
        <div className={`${styles.stat_value} ${styles.highlight}`}>{mostWins.Namn}</div>
        <div className={styles.stat_subtext}>Antal vinster {mostWins['Antal vinster']}</div>
      </div>
      <div className={styles.stat_box}>
        <div className={styles.stat_label}>Högsta antal röster</div>
        <div className={styles.stat_value}>{highestVotes.value}</div>
        <div className={styles.stat_subtext}>Uppnått av <span className={styles.highlight}>{highestVotes.name}</span> i runda {highestVotes.round}</div>
      </div>
      <div className={styles.stat_box}>
        <div className={styles.stat_label}><span title='Det kan finnas flera vinnare i en och samma runda' style={{ display: 'flex', alignItems: 'center', gap: '4px'}}>Kontor ranking (antal vinster) <Image src={info} alt={''} height={16} width={16} /></span></div>
        <div className={styles.stat_value}>🥇 <span className={styles.highlight}> {officeRanking[0]?.office}</span> {officeRanking[0]?.wins}</div>
        <div className={styles.stat_subtext}>
          <div className={styles.officeRanking}>
          {officeRanking.slice(1).map((office, index) => (
            <div key={index}>
              {index + 2 === 2 ? '🥈' : '🥉'} {office.office} {office.wins}
            </div>
          ))}
          </div>
        </div>
        {/* <div className={styles.stat_value}>Rank 1 {officeRanking[0].office}</div> */}
        {/* <div className={styles.stat_subtext}>Uppnått av <span className={styles.highlight}>{lowestVotes.name}</span> i runda {lowestVotes.round}</div> */}
      </div>
      <div className={styles.stat_box}>
        <div className={styles.stat_label}>Senaste rundan</div>
        <div className={`${styles.stat_value} ${styles.highlight}`}>{latestRound?.winners.map((winner) => winner.Namn).join(", ") || "–"}</div>
        <div className={styles.stat_subtext}>
          {latestRound?.round != null ? `Runda ${latestRound.round}` : latestRound?.date || "Okänd runda"}
          {latestRound?.winners.map((winner) => ` · ${winner.Namn}: ${winner.Röster ?? "N/A"} röster`).join("")}
        </div>
      </div>
      <div className={styles.stat_box}>
        <div className={styles.stat_label}>Högst antal röster totalt</div>
        <div className={`${styles.stat_value} ${styles.highlight}`}>{highestTotalVotes.name}</div>
        <div className={styles.stat_subtext}>{highestTotalVotes.value} röster i totalt {highestTotalVotes.totalRounds} runder</div>
      </div>
    </div>
  );
};

