// script.js
document.addEventListener("DOMContentLoaded", () => {
    loadAndParseCSV();
});

// Global database storage variables
let teamDatabase = [];
let playerDatabase = [];

async function loadAndParseCSV() {
    try {
        const response = await fetch('NBA DATA - Team Summaries (1).csv'); 
        if (!response.ok) throw new Error("Could not find the CSV file.");

        const rawText = await response.text();
        const lines = rawText.split('\n');
        
        const teamHeaders = lines[0].split(',');
        const playerHeaders = lines[1908].split(',');

        // 1. Parse Team Summaries (Rows 2 to 1908)
        for (let i = 1; i < 1908; i++) {
            if (!lines[i].trim()) continue;
            const currentLine = lines[i].split(',');
            const rowObject = {};
            teamHeaders.forEach((header, index) => {
                const key = header.trim().replace(/^["']|["']$/g, '');
                rowObject[key] = currentLine[index] ? currentLine[index].trim().replace(/^["']|["']$/g, '') : '';
            });
            teamDatabase.push(rowObject);
        }

        // 2. Parse Player Data (Rows 1910 to end)
        for (let i = 1; i < lines.length; i++) {
            if (i <= 1908) continue; 
            if (!lines[i].trim()) continue;
            
            const currentLine = lines[i].split(',');
            const rowObject = {};
            playerHeaders.forEach((header, index) => {
                const key = header.trim().replace(/^["']|["']$/g, '');
                rowObject[key] = currentLine[index] ? currentLine[index].trim().replace(/^["']|["']$/g, '') : '';
            });
            playerDatabase.push(rowObject);
        }

        console.log(`🟢 Successfully split data: ${teamDatabase.length} teams & ${playerDatabase.length} players parsed.`);
        
        // Populate the setup right away
        setupSeasonDropdowns();
        document.getElementById("simulateBtn").addEventListener("click", runSimulation);

    } catch (error) {
        console.error("🔴 Error splitting stacked CSV file:", error.message);
    }
}

function setupSeasonDropdowns() {
    const seasonSelectA = document.getElementById("seasonA");
    const seasonSelectB = document.getElementById("seasonB");

    if (!seasonSelectA || !seasonSelectB) return;

    // Pull unique seasons, filtered and cleaned up
    const allSeasons = teamDatabase.map(row => row.season || row.Season || row.yr).filter(Boolean);
    const uniqueSeasons = [...new Set(allSeasons)].sort((a, b) => b.localeCompare(a));

    seasonSelectA.innerHTML = "";
    seasonSelectB.innerHTML = "";

    uniqueSeasons.forEach(season => {
        seasonSelectA.options[seasonSelectA.options.length] = new Option(season, season);
        seasonSelectB.options[seasonSelectB.options.length] = new Option(season, season);
    });

    // Run updates immediately to replace the "Select a season first" placeholders
    updateTeamDropdown('A');
    updateTeamDropdown('B');
}

function updateTeamDropdown(side) {
    const seasonSelect = document.getElementById(`season${side}`);
    const teamSelect = document.getElementById(`team${side}`);
    
    if (!seasonSelect || !teamSelect) return;

    const selectedSeason = seasonSelect.value;
    teamSelect.innerHTML = ""; // Wipe the older options list clean

    // Filter our main team array to only pull rows matching the selected dropdown season
    const filteredTeams = teamDatabase.filter(row => {
        const rowSeason = row.season || row.Season || row.yr;
        return rowSeason === selectedSeason;
    });

    // Sort alphabetically by team name
    filteredTeams.sort((a, b) => {
        const nameA = a.team || a.Team || a.tm || "";
        const nameB = b.team || b.Team || b.tm || "";
        return nameA.localeCompare(nameB);
    });

    // Append our filtered results to the dropdown items list
    filteredTeams.forEach(row => {
        const teamName = row.team || row.Team || row.tm;
        if (teamName) {
            teamSelect.options[teamSelect.options.length] = new Option(teamName, teamName);
        }
    });
}

/* ---------- SIMULATION ENGINE ---------- */

function runSimulation() {
    const seasonA = document.getElementById("seasonA").value;
    const teamA = document.getElementById("teamA").value;
    const seasonB = document.getElementById("seasonB").value;
    const teamB = document.getElementById("teamB").value;
    const home = document.getElementById("homeTeam").value;

    if (!teamA || !teamB || teamA === "Select a season first" || teamB === "Select a season first") {
        alert("Please select both teams before simulating.");
        return;
    }

    // Find team stats
    const statsA = findTeamStats(seasonA, teamA);
    const statsB = findTeamStats(seasonB, teamB);
    if (!statsA || !statsB) {
        alert("Team data not found. Check CSV columns.");
        return;
    }

    // Compute league averages for the corresponding seasons
    const leagueAvgA = computeLeagueAverages(seasonA);
    const leagueAvgB = computeLeagueAverages(seasonB);
    // For cross-season matchups, average the two league environments
    const leagueAvgORtg = (leagueAvgA.ORtg + leagueAvgB.ORtg) / 2;
    const leagueAvgDRtg = (leagueAvgA.DRtg + leagueAvgB.DRtg) / 2;

    // Player impact (win shares / BPM / VORP)
    const playerImpactA = computePlayerImpact(seasonA, teamA);
    const playerImpactB = computePlayerImpact(seasonB, teamB);

    // Home court advantage (points)
    const HCA_POINTS = 2.8;  // typical NBA home advantage
    let homeBonusA = 0, homeBonusB = 0;
    if (home === 'A') homeBonusA = HCA_POINTS;
    else if (home === 'B') homeBonusB = HCA_POINTS;

    // Expected possessions: average of the two teams' Pace values
    const paceA = parseFloat(statsA.Pace) || 100;
    const paceB = parseFloat(statsB.Pace) || 100;
    const possessions = (paceA + paceB) / 2;

    // Expected points per 100 possessions, adjusted for opponent defense + player impact
    function adjOE(teamStats, oppDRtg, leagueDRtg, playerImpact) {
        let baseORtg = parseFloat(teamStats.ORtg) || leagueAvgORtg;
        // Factor in opponent DRtg relative to league average
        let oppFactor = oppDRtg / leagueDRtg;  // >1 means easier defense, boost scoring
        // Player impact: +0.8 points per 100 possessions per unit of impact (rough calibration)
        let playerBonus = playerImpact * 0.8;
        return (baseORtg * oppFactor) + playerBonus;
    }

    const adjO_A = adjOE(statsA, parseFloat(statsB.DRtg) || leagueAvgDRtg, leagueAvgDRtg, playerImpactA);
    const adjO_B = adjOE(statsB, parseFloat(statsA.DRtg) || leagueAvgDRtg, leagueAvgDRtg, playerImpactB);

    // Expected points
    const expectedPtsA = (adjO_A / 100) * possessions + homeBonusA;
    const expectedPtsB = (adjO_B / 100) * possessions + homeBonusB;

    // Random variance (realistic standard deviation ~ 10-12% of expected points)
    const stdDev = 0.11;  // coefficient of variation
    const simPtsA = Math.round(randomNormal(expectedPtsA, expectedPtsA * stdDev));
    const simPtsB = Math.round(randomNormal(expectedPtsB, expectedPtsB * stdDev));

    // Display result
    const resultBox = document.getElementById("resultBox");
    const resultText = document.getElementById("resultText");
    resultBox.style.display = "block";
    const winner = simPtsA > simPtsB ? teamA : (simPtsB > simPtsA ? teamB : "Draw");
    resultText.textContent = `${teamA} (${seasonA})  ${simPtsA} - ${simPtsB}  ${teamB} (${seasonB})\nWinner: ${winner}\n\nExpected: ${expectedPtsA.toFixed(1)} - ${expectedPtsB.toFixed(1)}\nPossessions: ${possessions.toFixed(1)} | Adjusted ORtg: ${adjO_A.toFixed(1)} vs ${adjO_B.toFixed(1)}`;
}

function findTeamStats(season, teamName) {
    // Normalize team name matching
    return teamDatabase.find(row => {
        const s = row.season || row.Season || row.yr;
        const t = row.team || row.Team || row.tm;
        return s === season && t === teamName;
    });
}

function computeLeagueAverages(season) {
    const teams = teamDatabase.filter(row => (row.season || row.Season || row.yr) === season);
    let sumORtg = 0, sumDRtg = 0, count = 0;
    teams.forEach(t => {
        const o = parseFloat(t.ORtg);
        const d = parseFloat(t.DRtg);
        if (!isNaN(o) && !isNaN(d)) {
            sumORtg += o;
            sumDRtg += d;
            count++;
        }
    });
    return {
        ORtg: count ? sumORtg / count : 110,   // fallback
        DRtg: count ? sumDRtg / count : 110
    };
}

function computePlayerImpact(season, teamName) {
    // Try to use Win Shares (WS), then BPM, then VORP
    const players = playerDatabase.filter(row => {
        const s = row.season || row.Season || row.yr;
        const t = row.tm || row.Team || row.team;
        return s === season && t === teamName;
    });
    let totalStat = 0;
    let statFound = false;

    // Decide which advanced stat to sum
    const statPriority = ['WS', 'BPM', 'VORP'];
    for (let stat of statPriority) {
        if (players.length > 0 && players[0][stat] !== undefined) {
            players.forEach(p => {
                const val = parseFloat(p[stat]);
                if (!isNaN(val)) totalStat += val;
            });
            statFound = true;
            break;
        }
    }
    if (!statFound) return 0;

    // Normalize: divide by number of players to get average, then scale to a ~0-5 impact range
    const avgStat = players.length ? totalStat / players.length : 0;
    // Scaling factor determined experimentally so that a superstar team adds ~3-4 points per 100 poss
    return avgStat * 2.5;
}

function randomNormal(mean, stdDev) {
    // Box-Muller transform
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
