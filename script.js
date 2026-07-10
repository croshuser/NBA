document.addEventListener("DOMContentLoaded", () => {
    loadAndParseCSV();
});

// Global database storage variables
let teamDatabase = [];
let playerDatabase = [];

async function loadAndParseCSV() {
    try {
        const response = await fetch('./NBA DATA - Team Summaries (1).csv'); 
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
