/**
 * Claude JSON to Transcript Viewer Format
 * 
 * This script modifies Claude JSON transcripts for compatibility with the Transcript Viewer.
 * It adds platform information and standardizes naming.
 * 
 * Usage:
 *   node claude_json_to_viewer.js [inputDir] [outputDir] [singleFileName]
 */

const fs = require('fs');
const path = require('path');

// Process a single Claude JSON file
function processClaudeJSON(inputPath, outputPath) {
    console.log(`Processing ${inputPath}`);
    
    try {
        // Read and parse the file
        const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        
        // Rename name to title if exists
        if (data.name) {
            data.title = data.name;
            delete data.name;
        }
        
        // Create a new object with ordered properties
        const orderedData = {};
        
        // Add title first if it exists
        if (data.title) {
            orderedData.title = data.title;
        }
        
        // Add platform right after title
        orderedData.platform = "claude-json";
        
        // Add create_time and update_time next for compatibility with viewer
        if (data.created_at) {
            orderedData.create_time = new Date(data.created_at).getTime() / 1000;
        }
        
        if (data.updated_at) {
            orderedData.update_time = new Date(data.updated_at).getTime() / 1000;
        }
        
        // Create a simple mapping structure for compatibility with ChatGPT format
        orderedData.mapping = {};
        
        // Create a root node
        const rootId = "root";
        orderedData.mapping[rootId] = {
            id: rootId,
            message: null,
            parent: null,
            children: []
        };
        
        // Track the last message for building parent-child relationships
        let lastMessageId = rootId;
        
        // Process chat_messages into mapping
        if (data.chat_messages && Array.isArray(data.chat_messages)) {
            data.chat_messages.forEach((msg) => {
                const messageId = msg.uuid;
                
                // Create a message object compatible with ChatGPT JSON format
                const message = {
                    id: messageId,
                    author: {
                        role: msg.sender,
                        name: null,
                        metadata: {}
                    },
                    create_time: new Date(msg.created_at).getTime() / 1000,
                    update_time: new Date(msg.updated_at).getTime() / 1000,
                    content: {
                        content_type: "text",
                        parts: []
                    },
                    metadata: {
                        model_slug: data.title || "Claude",
                        platform: "claude-json"
                    }
                };
                
                // Process content array
                if (msg.content && Array.isArray(msg.content)) {
                    // Extract text and thinking parts
                    let textContent = [];
                    let thinkingContent = null;
                    
                    msg.content.forEach(item => {
                        if (item.type === "text") {
                            textContent.push(item.text);
                        } else if (item.type === "thinking") {
                            thinkingContent = item.thinking;
                        }
                    });
                    
                    // Set text content
                    message.content.parts = textContent;
                    
                    // Add thinking content as a property
                    if (thinkingContent) {
                        message.claude_thinking = thinkingContent;
                    }
                }
                
                // Add to mapping
                orderedData.mapping[messageId] = {
                    id: messageId,
                    message: message,
                    parent: lastMessageId,
                    children: []
                };
                
                // Add this message as a child of the last message
                orderedData.mapping[lastMessageId].children.push(messageId);
                
                // Update lastMessageId for next iteration
                lastMessageId = messageId;
            });
        }
        
        // Keep other properties from the original file
        for (const key in data) {
            if (key !== 'title' && 
                key !== 'platform' && 
                key !== 'created_at' && 
                key !== 'updated_at' && 
                key !== 'chat_messages' &&
                key !== 'mapping') {
                orderedData[key] = data[key];
            }
        }
        
        // Write the modified data
        const fileName = path.basename(inputPath);
        const baseName = orderedData.title || fileName.replace(".json", "");
        const outputFilePath = path.join(outputPath, `${baseName} -- Claude-JSON.json`);
        
        fs.writeFileSync(outputFilePath, JSON.stringify(orderedData, null, 2));
        console.log(`Saved to ${outputFilePath}`);
        
        return outputFilePath;
    } catch (error) {
        console.error(`Error processing ${inputPath}: ${error.message}`);
        return null;
    }
}

// Main function
function main() {
    const inputDir = process.argv[2] || './claude-json';
    const outputDir = process.argv[3] || './transcripts-json';
    const singleFile = process.argv[4];
    
    console.log(`Input directory: ${inputDir}`);
    console.log(`Output directory: ${outputDir}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (singleFile) {
        // Process a single file
        const inputPath = path.join(inputDir, singleFile);
        if (fs.existsSync(inputPath)) {
            processClaudeJSON(inputPath, outputDir);
        } else {
            console.error(`File not found: ${inputPath}`);
        }
    } else {
        // Process all JSON files in the input directory
        if (!fs.existsSync(inputDir)) {
            console.error(`Input directory not found: ${inputDir}`);
            return;
        }
        
        const jsonFiles = fs.readdirSync(inputDir)
            .filter(file => file.endsWith('.json'));
            
        console.log(`Found ${jsonFiles.length} JSON files to process.`);
        
        let successCount = 0;
        
        for (const file of jsonFiles) {
            const inputPath = path.join(inputDir, file);
            const result = processClaudeJSON(inputPath, outputDir);
            if (result) successCount++;
        }
        
        console.log(`Processed ${jsonFiles.length} files. ${successCount} converted successfully.`);
    }
}

// Run the script
if (require.main === module) {
    main();
} 