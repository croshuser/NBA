// script.js
document.addEventListener("DOMContentLoaded", () => {
    loadAndParseCSV();
});

let teamDatabase = [];
let playerDatabase = [];

async function loadAndParseCSV() {
    try {
        const response = await fetch('NBA DATA - Team Summaries (1).csv');
        if (!response.ok) throw new Error("CSV file not found");

        const rawText = await response.text();
        const lines = rawText.split('\n');

        const teamHeaders = lines[0].split(',');
        const playerHeaders = lines[1908].split(',');

        // Parse team summaries (rows 1–1908)
        for (let i = 1; i < 1908; i++) {
            if (!lines[i].trim()) continue;
            const currentLine = lines[i].split(',');
            const row = {};
            teamHeaders.forEach((header, index) => {
                const key = header.trim().replace(/^["']|["']$/g, '');
                row[key] = currentLine[index] ? currentLine[index].trim().replace(/^["']|["']$/g, '') : '';
            });
            teamDatabase.push(row);
        }

        // Parse player data (rows 1910 to end)
        for (let i = 1; i < lines.length; i++) {
            if (i <= 1908) continue;
            if (!lines[i].trim()) continue;
            const currentLine = lines[i].split(',');
            const row = {};
            playerHeaders.forEach((header, index) => {
                const key = header.trim().replace(/^["']|["']$/g, '');
                row[key] = currentLine[index] ? currentLine[index].trim().replace(/^["']|["']$/g, '') : '';
            });
            playerDatabase.push(row);
        }

        console.log(`Parsed: ${teamDatabase.length} teams, ${playerDatabase.length} players`);
        setupSeasonDropdown();
    } catch (error) {
        console.error("Error loading CSV:", error);
    }
}

function setupSeasonDropdown() {
    const seasonSelect = document.getElementById("season");
    const allSeasons = teamDatabase.map(row => row.season || row.Season || row.yr).filter(Boolean);
    const uniqueSeasons = [...new Set(allSeasons)].sort((a, b) => b.localeCompare(a));

    seasonSelect.innerHTML = uniqueSeasons.map(s => `<option value="${s}">${s}</option>`).join('');
    seasonSelect.addEventListener("change", updateTeamDropdowns);
    updateTeamDropdowns(); // initial load
}

function updateTeamDropdowns() {
    const season = document.getElementById("season").value;
    const teams = teamDatabase
        .filter(row => (row.season || row.Season || row.yr) === season)
        .map(row => row.team || row.Team || row.tm)
        .filter(Boolean)
        .sort();

    const teamA = document.getElementById("teamA");
    const teamB = document.getElementById("teamB");

    teamA.innerHTML = teams.map(t => `<option value="${t}">${t}</option>`).join('');
    teamB.innerHTML = teams.map(t => `<option value="${t}">${t}</option>`).join('');
}

// Simulation
document.getElementById("simulate").addEventListener("click", runSimulation);

function runSimulation() {
    const season = document.getElementById("season").value;
    const teamA = document.getElementById("teamA").value;
    const teamB = document.getElementById("teamB").value;
    const homeTeam = document.getElementById("home").value; // 'A' or 'B'

    const resultDiv = document.getElementById("result");
    if (!teamA || !teamB) {
        resultDiv.textContent = "Please select both teams.";
        return;
    }

    // Get team stats
    const statsA = getTeamStats(season, teamA);
    const statsB = getTeamStats(season, teamB);
    if (!statsA || !statsB) {
        resultDiv.textContent = "Could not find stats for one of the teams.";
        return;
    }

    // League averages for the season
    const leagueAvg = getLeagueAverages(season);
    if (!leagueAvg) {
        resultDiv.textContent = "Could not compute league averages.";
        return;
    }

    // Player impact (VORP total)
    const impactA = getPlayerImpact(season, teamA, leagueAvg.vorpAvg);
    const impactB = getPlayerImpact(season, teamB, leagueAvg.vorpAvg);

    // Compute expected points
    const pace = (statsA.pace + statsB.pace) / 2; // average pace
    const adjOffA = (statsA.ortg * leagueAvg.drtg) / statsB.drtg;
    const adjOffB = (statsB.ortg * leagueAvg.drtg) / statsA.drtg;

    let expPtsA = (adjOffA / 100) * pace * impactA;
    let expPtsB = (adjOffB / 100) * pace * impactB;

    // Home court advantage (2.5 points)
    if (homeTeam === 'A') expPtsA += 2.5;
    else expPtsB += 2.5;

    // Random variance (std dev ~8 points)
    const stdDev = 8;
    const ptsA = Math.round(expPtsA + randomNormal() * stdDev);
    const ptsB = Math.round(expPtsB + randomNormal() * stdDev);

    // Ensure non‑negative scores
    const finalA = Math.max(0, ptsA);
    const finalB = Math.max(0, ptsB);

    resultDiv.innerHTML = `
        <strong>${teamA}</strong> ${finalA} – ${finalB} <strong>${teamB}</strong><br>
        <small>Home: ${homeTeam === 'A' ? teamA : teamB}</small>
    `;
}

function getTeamStats(season, teamAbbr) {
    const row = teamDatabase.find(r => {
        const s = r.season || r.Season || r.yr;
        const t = r.team || r.Team || r.tm;
        return s === season && t === teamAbbr;
    });
    if (!row) return null;
    return {
        ortg: parseFloat(row.ORtg || row['ORtg'] || 0),
        drtg: parseFloat(row.DRtg || row['DRtg'] || 0),
        pace: parseFloat(row.Pace || row.pace || 0),
    };
}

function getLeagueAverages(season) {
    const teams = teamDatabase.filter(r => (r.season || r.Season || r.yr) === season);
    if (teams.length === 0) return null;

    let sumO = 0, sumD = 0, sumP = 0, sumV = 0;
    teams.forEach(r => {
        sumO += parseFloat(r.ORtg || 0);
        sumD += parseFloat(r.DRtg || 0);
        sumP += parseFloat(r.Pace || 0);
    });

    // Compute average total VORP per team across the league
    teams.forEach(r => {
        const abbr = r.team || r.Team || r.tm;
        const vorp = getTeamTotalVORP(season, abbr);
        sumV += vorp;
    });

    return {
        ortg: sumO / teams.length,
        drtg: sumD / teams.length,
        pace: sumP / teams.length,
        vorpAvg: sumV / teams.length,
    };
}

function getTeamTotalVORP(season, teamAbbr) {
    const players = playerDatabase.filter(p => {
        const s = p.Season || p.season || '';
        const t = p.Tm || p.tm || '';
        return s === season && t === teamAbbr;
    });
    let totalVORP = 0;
    players.forEach(p => {
        const vorp = parseFloat(p.VORP || 0);
        if (!isNaN(vorp)) totalVORP += vorp;
    });
    return totalVORP;
}

function getPlayerImpact(season, teamAbbr, leagueVorpAvg) {
    const teamVorp = getTeamTotalVORP(season, teamAbbr);
    // Multiplier: team VORP relative to league average (capped)
    const diff = teamVorp - leagueVorpAvg;
    const multiplier = 1 + diff * 0.02;  // 2% per VORP point difference
    return Math.min(1.15, Math.max(0.85, multiplier));
}

// Box‑Muller transform for normal distribution
function randomNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
