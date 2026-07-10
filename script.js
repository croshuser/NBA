// script.js
document.addEventListener("DOMContentLoaded", () => {
    loadAndParseCSV();
});

let teamDatabase = [];
let playerDatabase = [];

async function loadAndParseCSV() {
    try {
        const response = await fetch('NBA DATA - Team Summaries (1).csv');
        if (!response.ok) throw new Error("CSV file not found.");

        const rawText = await response.text();
        const lines = rawText.split('\n');

        const teamHeaders = lines[0].split(',');
        const playerHeaders = lines[1908].split(',');

        // 1. Team rows (2 to 1908)
        for (let i = 1; i < 1908; i++) {
            if (!lines[i].trim()) continue;
            const currentLine = lines[i].split(',');
            const row = {};
            teamHeaders.forEach((header, idx) => {
                const key = header.trim().replace(/^["']|["']$/g, '');
                row[key] = currentLine[idx] ? currentLine[idx].trim().replace(/^["']|["']$/g, '') : '';
            });
            teamDatabase.push(row);
        }

        // 2. Player rows (1910 -> end)
        for (let i = 1909; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const currentLine = lines[i].split(',');
            const row = {};
            playerHeaders.forEach((header, idx) => {
                const key = header.trim().replace(/^["']|["']$/g, '');
                row[key] = currentLine[idx] ? currentLine[idx].trim().replace(/^["']|["']$/g, '') : '';
            });
            playerDatabase.push(row);
        }

        console.log(`🟢 Loaded: ${teamDatabase.length} teams, ${playerDatabase.length} players.`);
        setupSeasonDropdowns();
        document.getElementById("simulateBtn").addEventListener("click", runSimulation);
    } catch (err) {
        console.error("🔴 Error loading CSV:", err.message);
        document.querySelector('.card').innerHTML =
            `<p class="error">Failed to load data. Make sure "NBA DATA - Team Summaries (1).csv" is in the same folder.</p>`;
    }
}

function setupSeasonDropdowns() {
    const selA = document.getElementById("seasonA");
    const selB = document.getElementById("seasonB");
    if (!selA || !selB) return;

    const seasons = [...new Set(teamDatabase.map(r => r.season || r.Season || r.yr).filter(Boolean))]
        .sort((a, b) => b.localeCompare(a));

    selA.innerHTML = selB.innerHTML = "";
    seasons.forEach(s => {
        selA.add(new Option(s, s));
        selB.add(new Option(s, s));
    });

    updateTeamDropdown('A');
    updateTeamDropdown('B');
}

function updateTeamDropdown(side) {
    const seasonEl = document.getElementById(`season${side}`);
    const teamEl = document.getElementById(`team${side}`);
    if (!seasonEl || !teamEl) return;

    const season = seasonEl.value;
    teamEl.innerHTML = "";

    const filtered = teamDatabase.filter(r => {
        const s = r.season || r.Season || r.yr;
        return s === season;
    }).sort((a, b) => {
        const na = a.team || a.Team || a.tm || "";
        const nb = b.team || b.Team || b.tm || "";
        return na.localeCompare(nb);
    });

    filtered.forEach(r => {
        const name = r.team || r.Team || r.tm;
        if (name) teamEl.add(new Option(name, name));
    });
}

/* ---------- HELPER: safe parse ---------- */
const p = (val, fallback = 0) => {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
};

/* ---------- TEAM STAT EXTRACTION ---------- */
function findTeamStats(season, teamName) {
    return teamDatabase.find(r => {
        const s = r.season || r.Season || r.yr;
        const t = r.team || r.Team || r.tm;
        return s === season && t === teamName;
    });
}

function getWinPct(row) {
    // try explicit win% column first
    if (row['W/L%'] !== undefined) return p(row['W/L%']);
    // then W & L columns
    const w = p(row.W || row.wins, null);
    const l = p(row.L || row.losses, null);
    if (w !== null && l !== null && (w + l) > 0) return w / (w + l);
    return 0.5; // fallback
}

function getStat(row, candidates) {
    for (let key of candidates) {
        if (row[key] !== undefined && row[key] !== '') return p(row[key]);
    }
    return 0;
}

/* ---------- PLAYER RATING (star power) ---------- */
function playerRating(p) {
    // ideal fields
    if (p.Overall !== undefined) {
        const off = p.Offense !== undefined ? p(p.Offense) : 0;
        const def = p.Defense !== undefined ? p(p.Defense) : 0;
        const eff = p.Efficiency !== undefined ? p(p.Efficiency) : 0;
        const clut = p.Clutch !== undefined ? p(p.Clutch) : 0;
        return p(p.Overall) + 0.4 * off + 0.3 * def + 0.2 * eff + 0.1 * clut;
    }
    // fallback chain
    for (let stat of ['WS', 'BPM', 'VORP']) {
        if (p[stat] !== undefined) return p(p[stat]) * 10; // scale to ~20-60 range
    }
    return 0;
}

function starPower(season, teamName) {
    const players = playerDatabase.filter(r => {
        const s = r.season || r.Season || r.yr;
        const t = r.tm || r.Team || r.team;
        return s === season && t === teamName;
    });
    const ratings = players.map(playerRating).sort((a, b) => b - a);
    const top3 = ratings.slice(0, 3);
    return top3.reduce((sum, v) => sum + v, 0);
}

/* ---------- MAIN SIMULATION ---------- */
function runSimulation() {
    const seasonA = document.getElementById("seasonA").value;
    const teamA = document.getElementById("teamA").value;
    const seasonB = document.getElementById("seasonB").value;
    const teamB = document.getElementById("teamB").value;
    const home = document.getElementById("homeTeam").value;

    if (!teamA || !teamB || teamA.startsWith("Select") || teamB.startsWith("Select")) {
        alert("Please select both teams.");
        return;
    }

    const statsA = findTeamStats(seasonA, teamA);
    const statsB = findTeamStats(seasonB, teamB);
    if (!statsA || !statsB) {
        alert("Team stats not found in the data.");
        return;
    }

    // ---------- Basic team metrics ----------
    const ortgA = getStat(statsA, ['ORtg', 'OffRtg']);
    const drtgA = getStat(statsA, ['DRtg', 'DefRtg']);
    const paceA = getStat(statsA, ['Pace']);
    const ortgB = getStat(statsB, ['ORtg', 'OffRtg']);
    const drtgB = getStat(statsB, ['DRtg', 'DefRtg']);
    const paceB = getStat(statsB, ['Pace']);

    const netA = ortgA - drtgA;
    const netB = ortgB - drtgB;

    // ---------- Home court (numeric) ----------
    let homeCourt = 0;
    if (home === 'A') homeCourt = 1;
    else if (home === 'B') homeCourt = -1;

    // ---------- Win% ----------
    const winA = getWinPct(statsA);
    const winB = getWinPct(statsB);

    // ---------- Rebounding (TRB per game) ----------
    const trbA = getStat(statsA, ['TRB']);
    const trbB = getStat(statsB, ['TRB']);
    const rebDiff = trbA - trbB;

    // ---------- Turnovers (lower = better) ----------
    const tovA = getStat(statsA, ['TOV']);
    const tovB = getStat(statsB, ['TOV']);
    const tovDiff = tovB - tovA;   // positive = A takes better care of the ball

    // ---------- 3‑point % ----------
    const threeA = getStat(statsA, ['3P%', '3PAr']);
    const threeB = getStat(statsB, ['3P%', '3PAr']);
    const threeDiff = threeA - threeB;

    // ---------- Star power ----------
    const starA = starPower(seasonA, teamA);
    const starB = starPower(seasonB, teamB);
    const starDiff = starA - starB;

    // ---------- Random variance ----------
    const randVariance = (Math.random() * 6) - 3;   // uniform [-3, 3]

    // ---------- Z score ----------
    const Z = 0.34 * (ortgA - ortgB)
            + 0.30 * (drtgB - drtgA)
            + 0.18 * (netA - netB)
            + 0.14 * ((paceA - paceB) / 5)
            + 0.10 * homeCourt
            + 0.08 * ((winA - winB) * 100)
            + 0.05 * starDiff
            + 0.04 * rebDiff
            + 0.03 * tovDiff
            + 0.03 * threeDiff
            + randVariance;

    // ---------- Upset factor ----------
    const netDiff = Math.abs(netA - netB);
    const upsetChance = 0.03 + 0.12 * Math.exp(-netDiff / 5);

    const baseProbA = 1 / (1 + Math.exp(-Z));
    const finalProbA = (1 - upsetChance) * baseProbA + upsetChance * 0.5;

    // ---------- Expected points (scoring model) ----------
    const homeBonusA = home === 'A' ? 3 : 0;
    const homeBonusB = home === 'B' ? 3 : 0;

    const expPtsA = 112 + 0.45 * ortgA - 0.35 * drtgB + 0.12 * paceA + homeBonusA;
    const expPtsB = 112 + 0.45 * ortgB - 0.35 * drtgA + 0.12 * paceB + homeBonusB;

    // ---------- Simulated points ----------
    const simPtsA = Math.round(expPtsA + (Math.random() * 20 - 10));
    const simPtsB = Math.round(expPtsB + (Math.random() * 20 - 10));

    // ---------- Display ----------
    document.getElementById("resTeamA").textContent = teamA;
    document.getElementById("resSeasonA").textContent = seasonA;
    document.getElementById("resTeamB").textContent = teamB;
    document.getElementById("resSeasonB").textContent = seasonB;
    document.getElementById("scoreA").textContent = simPtsA;
    document.getElementById("scoreB").textContent = simPtsB;

    let winnerText = '';
    if (simPtsA > simPtsB) winnerText = `🏆 ${teamA} wins!`;
    else if (simPtsB > simPtsA) winnerText = `🏆 ${teamB} wins!`;
    else winnerText = '⚡ Draw!';
    document.getElementById("winnerText").textContent = winnerText;

    const statsGrid = document.getElementById("statsGrid");
    statsGrid.innerHTML = `
        <div>Win probability <span>${(finalProbA * 100).toFixed(1)}% ${teamA}</span></div>
        <div>Expected <span>${expPtsA.toFixed(1)} - ${expPtsB.toFixed(1)}</span></div>
        <div>Net Rating <span>${netA.toFixed(1)} vs ${netB.toFixed(1)}</span></div>
        <div>Pace <span>${paceA.toFixed(1)} vs ${paceB.toFixed(1)}</span></div>
        <div>Star power <span>${starA.toFixed(1)} vs ${starB.toFixed(1)}</span></div>
        <div>Rebound diff <span>${rebDiff >= 0 ? '+' : ''}${rebDiff.toFixed(1)}</span></div>
        <div>TO diff (A) <span>${tovDiff >= 0 ? '+' : ''}${tovDiff.toFixed(1)}</span></div>
        <div>3P% diff (A) <span>${threeDiff >= 0 ? '+' : ''}${threeDiff.toFixed(1)}</span></div>
        <div>Upset chance <span>${(upsetChance * 100).toFixed(1)}%</span></div>
    `;

    document.getElementById("resultBox").style.display = "block";
}
