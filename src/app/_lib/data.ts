import Papa from "papaparse";
import { groupRounds, type Round } from "./insights";


export interface SocialAIResult {
    Namn: string;
    Röster: number | "N/A" | null;
    Runda: number | "N/A" | null;
    Datum: string | null;
    Kontor: string;
}

export interface StatisticsData {
    totalVotes: number;
    mostWins: { Namn: string, 'Antal vinster': number, Kontor: string };
    highestVotes: { value: number; name: string; round: number };
    officeRanking: { office: string, wins: number }[];
    latestRound: Round | null;
    highestTotalVotes: { name: string; value: number, totalRounds: number };
}

export async function fetchAndStoreCSV(filePath: string) {
    const response = await fetch(filePath);
    const csvText = await response.text();

    const parsedData = Papa.parse<SocialAIResult>(csvText, {
        header: true,
        dynamicTyping: true,
    }).data;

     // Filter out rows with null values
    const filteredData = parsedData.filter(row => row.Namn !== null);

    const existingData = localStorage.getItem("csvData");
    const existingVersion = localStorage.getItem("csvVersion");
    const newVersion = response.headers.get("ETag") || Date.now().toString();

    if (existingData && existingVersion === newVersion) {
        console.log("Data is already up-to-date in localStorage");
        return;
    }

    localStorage.setItem("csvData", JSON.stringify(filteredData));
    localStorage.setItem("csvVersion", newVersion);

    console.log("Data stored successfully in localStorage");
}

export function generateStatisticsData(data: SocialAIResult[]): StatisticsData {
    const totalVotes = calculateTotalVotes(data);
    const mostWins = getMostWins(data);
    const highestVotes = getHighestVotes(data);
    const officeRanking = getOfficeRanking(data);
    const latestRound = groupRounds(data)[0] ?? null;
    const highestTotalVotes = getHighestTotalVotes(data);

    return {
        totalVotes,
        mostWins,
        highestVotes,
        officeRanking,
        latestRound,
        highestTotalVotes,
    };
}

function calculateTotalVotes(data: SocialAIResult[]): number {
    return data.reduce((acc, row) => acc + (typeof row.Röster === "number" ? row.Röster : 0), 0);
}

function getMostWins(data: SocialAIResult[]): { Namn: string, 'Antal vinster': number, Kontor: string } {
    const userWithNumberOfWins = transformSocialAiData(data);
    return userWithNumberOfWins[0] ?? { Namn: "", 'Antal vinster': 0, Kontor: "" };
}

function getHighestVotes(data: SocialAIResult[]): { value: number; name: string; round: number } {
    return data.reduce((acc, row) => {
        if (typeof row.Röster === "number" && row.Röster > acc.value) {
            return { value: row.Röster, name: row.Namn, round: typeof row.Runda === "number" ? row.Runda : 0 };
        }
        return acc;
    }, { value: 0, name: "", round: 0 });
}

function getOfficeRanking(data: SocialAIResult[]): { office: string, wins: number }[] {
    const officeWins = data.reduce((acc, row) => {
        if (row.Kontor in acc) {
            acc[row.Kontor] += 1;
        } else {
            acc[row.Kontor] = 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(officeWins)
        .map(([office, wins]) => ({ office, wins }))
        .sort((a, b) => b.wins - a.wins);
}

function getHighestTotalVotes(data: SocialAIResult[]): { name: string; value: number, totalRounds: number } {
    const userVotes = data.reduce((acc, row) => {
        if (row.Namn in acc) {
            acc[row.Namn].votes += typeof row.Röster === "number" ? row.Röster : 0;
            acc[row.Namn].totalRounds += 1;
        } else {
            acc[row.Namn] = { votes: typeof row.Röster === "number" ? row.Röster : 0, totalRounds: 1 };
        }
        return acc;
    }, {} as Record<string, { votes: number, totalRounds: number }>);

    return Object.entries(userVotes).reduce((acc, [name, { votes, totalRounds }]) => {
        if (votes > acc.value) {
            return { name, value: votes, totalRounds };
        }
        return acc;
    }, { name: "", value: 0, totalRounds: 0 });
}

export function transformSocialAiData(data: SocialAIResult[]): { Namn: string, 'Antal vinster': number, Kontor: string }[] {
    const userWins = data.reduce((acc, row) => {
        if (row.Namn in acc) {
            acc[row.Namn].totalWins += 1;
        } else {
            acc[row.Namn] = { totalWins: 1, office: row.Kontor };
        }
        return acc;
    }, {} as Record<string, { totalWins: number, office: string }>);

    const sortedData = Object.entries(userWins)
        .map(([name, { totalWins, office }]) => ({
            Namn: name,
            'Antal vinster': totalWins,
            Kontor: office,
        }))
        .sort((a, b) => {
            if (a['Antal vinster'] === b['Antal vinster']) {
                return a.Namn.localeCompare(b.Namn);
            }
            return b['Antal vinster'] - a['Antal vinster'];
        });

    // sortedData[0].Namn = '🥇 ' + sortedData[0].Namn;
    // sortedData[1].Namn = '🥈 ' + sortedData[1].Namn;
    // sortedData[2].Namn = '🥉 ' + sortedData[2].Namn;

    return sortedData.map((item, index) => ({
        Rank: index + 1,
        ...item
    }));
}

export function getStoredData(): { tableData: SocialAIResult[], statsData: StatisticsData } {
    const tableData = JSON.parse(localStorage.getItem("csvData") || "[]");
    const statsData = JSON.parse(localStorage.getItem("statisticsData") || "{}");

    return { tableData, statsData };
}

export function getSocialAiData(): SocialAIResult[] {
    const localCsvData: SocialAIResult[] = JSON.parse(localStorage.getItem("csvData") || "[]");
    // Move column Runda to be the first column
    const processedRowData = localCsvData.map(row => {
        const { Runda, ...rest } = row;
        return { Runda, ...rest };
    });
    return processedRowData;
}
