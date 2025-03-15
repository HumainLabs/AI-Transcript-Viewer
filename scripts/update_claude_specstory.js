/**
 * Update Claude SpecStory Files
 * 
 * This script updates existing Claude-converted JSON files to add the platform tag
 * and ensure consistent naming.
 * 
 * Usage:
 *   node update_claude_specstory.js [directory]
 */

const fs = require('fs');
const path = require('path');

// Process a single file
function processFile(filePath) {
    console.log(`Processing ${filePath}`);
    
    // Check if the file matches any of the patterns
    if (!filePath.includes('Claude-converted') && !filePath.includes('Claude-specstory')) {
        return false;
    }
    
    try {
        // Read and parse the file
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Even if it already has platform field, we want to reorder it
        const needsReorder = !data.platform || 
                             JSON.stringify(data).indexOf('"platform"') > JSON.stringify(data).indexOf('"title"') + 100;
        
        if (!needsReorder) {
            console.log(`File already has properly ordered platform field: ${filePath}`);
            return false;
        }
        
        // Create a new object with ordered properties
        const orderedData = {};
        
        // Add title first if it exists
        if (data.title) {
            orderedData.title = data.title;
        }
        
        // Add platform right after title
        orderedData.platform = "claude-specstory";
        
        // Add create_time and update_time next if they exist
        if (data.create_time) {
            orderedData.create_time = data.create_time;
        }
        
        if (data.update_time) {
            orderedData.update_time = data.update_time;
        }
        
        // Add the rest of the properties
        for (const key in data) {
            if (key !== 'title' && key !== 'platform' && key !== 'create_time' && key !== 'update_time') {
                orderedData[key] = data[key];
            }
        }
        
        // Write the modified data back
        fs.writeFileSync(filePath, JSON.stringify(orderedData, null, 2));
        
        // Rename the file if it still has the old naming convention
        if (filePath.includes('Claude-converted')) {
            const dir = path.dirname(filePath);
            const baseName = path.basename(filePath).replace('Claude-converted', 'Claude-specstory');
            const newPath = path.join(dir, baseName);
            
            if (filePath !== newPath) {
                fs.renameSync(filePath, newPath);
                console.log(`Renamed to ${newPath}`);
            }
        }
        
        console.log(`Updated ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error processing ${filePath}: ${error.message}`);
        return false;
    }
}

// Process a directory
function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    let processedCount = 0;
    let successCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
            // Process subdirectories recursively
            const subResults = processDirectory(filePath);
            processedCount += subResults.processedCount;
            successCount += subResults.successCount;
        } else if (filePath.endsWith('.json')) {
            // Process JSON files
            processedCount++;
            if (processFile(filePath)) {
                successCount++;
            }
        }
    });
    
    return { processedCount, successCount };
}

// Main function
function main() {
    const directory = process.argv[2] || './transcripts-json';
    
    if (!fs.existsSync(directory)) {
        console.error(`Directory not found: ${directory}`);
        return;
    }
    
    console.log(`Scanning directory: ${directory}`);
    const results = processDirectory(directory);
    
    console.log('Processing complete.');
    console.log(`Found ${results.processedCount} JSON files, updated ${results.successCount} files.`);
}

// Run the script
if (require.main === module) {
    main();
} 