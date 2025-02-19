"use client";
import styles from "./page.module.css";
import Table from "./_components/table";
import Stats from "./_components/statistics";

import { useEffect, useState } from "react";
import { fetchAndStoreCSV, generateStatisticsData, getSocialAiData, SocialAIResult, StatisticsData, transformSocialAiData } from "./_lib/data";

export default function Home() {
  const [tableData, setTableData] = useState<SocialAIResult[]>([]);
  const [statsData, setStatsData] = useState<StatisticsData>({
    totalVotes: 0,
    mostWins: { Namn: "", 'Antal vinster': 0, Kontor: "" },
    highestVotes: { value: 0, name: "", round: 0 },
    officeRanking: [],
    latestWinner: { name: "", votes: 0, round: 0 },
    highestTotalVotes: { name: "", value: 0, totalRounds: 0 },
  });
  const [winningTableData, setWinningTableData] = useState<{ Namn: string, 'Antal vinster': number, Kontor: string }[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      const filePath = process.env.NODE_ENV === "production" ? `/social-ai-fredag/Social_AI_Fredag.csv` : `/Social_AI_Fredag.csv`;
      await fetchAndStoreCSV(filePath);

      const storedData = getSocialAiData();
      if (storedData) {
        setTableData(storedData);

        const statistics = generateStatisticsData(storedData);
        console.log(statistics);
        setStatsData(statistics);
      }

      const winners = transformSocialAiData(storedData);
      setWinningTableData(winners);
    };

    fetchData();
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container} ${styles.voteResult}`}>
          <h1>Social AI Röstresultat</h1>
          
          <Stats {...statsData} />
          <Table data={tableData} paginated={true} rowsPerPage={15} />

      </div>
      <div className={`${styles.container} ${styles.winners}`}>
        <h1>Vinster</h1>
        <Table data={winningTableData} paginated={true} rowsPerPage={20} />
      </div>
    </div>
  );
}
