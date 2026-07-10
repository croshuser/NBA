document.addEventListener("DOMContentLoaded", () => {
    loadAndParseCSV();
});

// We will store our global databases here so the whole script can access them
let teamDatabase = [];
let playerDatabase = [];

async function loadAndParseCSV() {
    try {
        const response = await fetch('NBA DATA - Team Summaries.csv'); 
        if (!response.ok) throw new Error("Could not find the CSV file.");

        const rawText = await response.text();
        const lines = rawText.split('\n');
        
        // Grab headers for the Team section (Row 1)
        const teamHeaders = lines[0].split(',');
        
        // Grab headers for the Player section (Row 1909 in Excel is index 1908 in JavaScript)
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

        // 2. Loop through Player Data (Rows 1910 to the very end of the file)
        for (let i = 1login; i < lines.length; i++) {
            if (i <= 1908) continue; // Skip team headers and data rows we already read
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
        
        // Populate your dropdown menus using only the actual teams
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
        // Checking for standard variations of column names
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
