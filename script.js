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

        // 1. Parse Team Summaries
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

        // 2. Parse Player Data
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

        console.log(`🟢 Loaded ${teamDatabase.length} teams & ${playerDatabase.length} players.`);
        
        // Populate our initial season dropdowns
        setupSeasonDropdowns();

    } catch (error) {
        console.error("🔴 Error splitting stacked CSV file:", error.message);
    }
}

function setupSeasonDropdowns() {
    const seasonSelectA = document.getElementById("seasonA");
    const seasonSelectB = document.getElementById("seasonB");

    // Extract all unique seasons from our data, sort them newest to oldest
    const allSeasons = teamDatabase.map(row => row.season || row.Season || row.yr).filter(Boolean);
    const uniqueSeasons = [...new Set(allSeasons)].sort((a, b) => b.localeCompare(a));

    seasonSelectA.innerHTML = "";
    seasonSelectB.innerHTML = "";

    uniqueSeasons.forEach(season => {
        seasonSelectA.options[seasonSelectA.options.length] = new Option(season, season);
        seasonSelectB.options[seasonSelectB.options.length] = new Option(season, season);
    });

    // Automatically trigger the team lists to load for the default selected seasons
    updateTeamDropdown('A');
    updateTeamDropdown('B');
}

// This function fires automatically whenever a user changes the season dropdown
function updateTeamDropdown(side) {
    const seasonSelect = document.getElementById(`season${side}`);
    const teamSelect = document.getElementById(`team${side}`);
    
    if (!seasonSelect || !teamSelect) return;

    const selectedSeason = seasonSelect.value;
    teamSelect.innerHTML = ""; // Clear old teams

    // Filter our team list to ONLY show teams matching the chosen season
    const filteredTeams = teamDatabase.filter(row => {
        const rowSeason = row.season || row.Season || row.yr;
        return rowSeason === selectedSeason;
    });

    // Sort team names alphabetically
    filteredTeams.sort((a, b) => {
        const nameA = a.team || a.Team || a.tm || "";
        const nameB = b.team || b.Team || b.tm || "";
        return nameA.localeCompare(nameB);
    });

    // Insert the filtered teams into the dropdown menu
    filteredTeams.forEach(row => {
        const teamName = row.team || row.Team || row.tm;
        if (teamName) {
            teamSelect.options[teamSelect.options.length] = new Option(teamName, teamName);
        }
    });
}
