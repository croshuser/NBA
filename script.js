// Automatically run when the website loads
document.addEventListener("DOMContentLoaded", () => {
    loadAndParseCSV();
});

async function loadAndParseCSV() {
    try {
        // 1. Fetch the CSV file from your GitHub repository
        const response = await fetch('NBA DATA - Team Summaries (1).csv');
        const rawText = await response.text();
        
        // 2. Parse the raw text into neat JavaScript objects
        const lines = rawText.split('\n');
        const headers = lines[0].split(',');
        const cleanTeamsDatabase = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty rows

            const currentLine = lines[i].split(',');
            const rowObject = {};

            headers.forEach((header, index) => {
                // Remove spaces/quotes and match values to headers
                const key = header.trim().replace(/^["']|["']$/g, '');
                const value = currentLine[index] ? currentLine[index].trim().replace(/^["']|["']$/g, '') : '';
                rowObject[key] = value;
            });

            cleanTeamsDatabase.push(rowObject);
        }

        // 3. YOUR DATA IS READY! 
        console.log("🚀 CSV parsed perfectly! Here is your web-ready database:", cleanTeamsDatabase);
        
        // You can now pass 'cleanTeamsDatabase' directly into your simulator menus!
        setupDropdowns(cleanTeamsDatabase);

    } catch (error) {
        console.error("Error reading the CSV file:", error);
    }
}

function setupDropdowns(data) {
    // This is where you'll populate your HTML select menus using the 'data' array
    console.log(`Total teams loaded from your sheet: ${data.length}`);
}
