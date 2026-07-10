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
        
        // Grab headers for the Team section (Row 1)
        const teamHeaders = lines[0].split(',');
        
        // Grab headers for the Player section (Row 1909)
        const playerHeaders = lines[1908].split(',');

        // 1. Loop through Team Summaries (Rows 2 to 1908)
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

        // 2. Loop through Player Data (Rows 1910 to the very end)
        // TYPO FIXED HERE: changed "1login" back to a normal number "1"
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

        console.log(`🟢 Success! Loaded ${teamDatabase.length} teams.`);
        console.log(`🔥 Success! Loaded ${playerDatabase.length} individual player rows.`);
        
        setupDropdowns(teamDatabase);

    } catch (error) {
        console.error("🔴 Error splitting stacked CSV file:", error.message);
    }
}

function setupDropdowns(teams) {
    const selectA = document.getElementById("teamA");
    const selectB = document.getElementById("teamB");

    if (!selectA || !selectB) return;

    selectA.innerHTML = "";
    selectB.innerHTML = "";

    teams.forEach(row => {
        const teamName = row.team || row.Team || row.tm; 
        const seasonYear = row.season || row.Season || row.yr;

        if (teamName && seasonYear) {
            const optionText = `${seasonYear} ${teamName}`;
            const optionValue = `${seasonYear}_${teamName.replace(/\s+/g, '_')}`;

            selectA.options[selectA.options.length] = new Option(optionText, optionValue);
            selectB.options[selectB.options.length] = new Option(optionText, optionValue);
        }
    });
    
    console.log("Dropdowns populated with clean team-only listings!");
}
