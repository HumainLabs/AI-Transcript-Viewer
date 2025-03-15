/**
 * Claude-to-JSON Converter
 * 
 * This script converts Claude markdown transcripts to the ChatGPT JSON format
 * for compatibility with the transcript viewer application.
 * 
 * Usage:
 *   node claude_to_json.js [inputDir] [outputDir] [singleFileName] [modelName]
 * 
 * Arguments:
 *   inputDir - Directory containing Claude markdown files (default: ./Claude-transcripts)
 *   outputDir - Directory to save JSON output (default: ./transcripts-json)
 *   singleFileName - Process just a single file instead of all files in the directory
 *   modelName - Claude model name to use in the metadata (default: claude-3.5-sonnet-20241022)
 * 
 * Examples:
 *   node claude_to_json.js ./Claude-transcripts ./transcripts-json "Athena - 2025-03-02.md" "claude-3.7-sonnet-thinking"
 *   node claude_to_json.js
 * 
 * Formatting requirements for Claude markdown files:
 *   - Messages should be marked with _**User**_, _**Assistant**_, or _**System**_
 *   - Section headers can be marked with ## Title
 *   - Each message should start on a new line after the role indicator
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Constants
const DEFAULT_CLAUDE_MODEL = "claude-3.5-sonnet-20241022";
const MESSAGE_TIME_GAP = 30; // seconds between messages

/**
 * Generates a precise timestamp with microsecond precision
 * @param {number} baseSeconds - Base timestamp in seconds
 * @param {number} offsetSeconds - Offset in seconds to add
 * @returns {number} - Timestamp with microsecond precision
 */
function generatePreciseTimestamp(baseSeconds, offsetSeconds = 0) {
    // Add random microseconds (0-999999) for realistic precision
    const microseconds = Math.floor(Math.random() * 1000000) / 1000000;
    return baseSeconds + offsetSeconds + microseconds;
}

/**
 * Converts Claude markdown conversation to ChatGPT-style JSON format
 * @param {string} mdFilePath Path to the markdown file
 * @param {string} outputPath Path where to save the JSON output
 * @param {string} modelName Optional: Claude model name to use in metadata
 * @returns {string} Path to the generated JSON file
 */
function convertClaudeToJson(mdFilePath, outputPath, modelName = DEFAULT_CLAUDE_MODEL) {
    console.log(`Converting ${mdFilePath} to JSON using model ${modelName}...`);
    
    // Read the markdown file
    const mdContent = fs.readFileSync(mdFilePath, 'utf8');
    
    // Extract title from filename or content
    const filename = path.basename(mdFilePath, '.md');
    let title = filename.split(' -- ')[0] || filename;
    
    // Try to extract title from content if it starts with a header
    // Look for ## Title format, and extract the part before any parentheses
    const headerMatch = mdContent.match(/^#+\s+([^(]+)(?:\s*\(.*?\))?\s*\n/);
    if (headerMatch && headerMatch[1]) {
        title = headerMatch[1].trim();
    }
    
    // Create timestamps
    const fileStats = fs.statSync(mdFilePath);
    const createTimeBase = Math.floor(fileStats.birthtime.getTime() / 1000);
    const updateTimeBase = Math.floor(fileStats.mtime.getTime() / 1000);
    
    // Create precise timestamps with microsecond precision
    const createTime = generatePreciseTimestamp(createTimeBase);
    const updateTime = generatePreciseTimestamp(updateTimeBase);
    
    // Parse the markdown content to extract messages
    const messages = parseClaudeMarkdown(mdContent);
    
    if (messages.length === 0) {
        console.warn(`No messages found in ${mdFilePath}. Check if the file has the correct format.`);
        return null;
    }
    
    // Create the mapping structure with parent-child relationships
    const { rootId, mapping } = createMessageMapping(messages, createTimeBase, modelName);
    
    // Create the final JSON structure
    const jsonOutput = {
        title: title,
        create_time: createTime,
        update_time: updateTime,
        mapping: mapping
    };
    
    // Write the JSON to file
    const outputFilePath = path.join(outputPath, `${filename} -- Claude-converted.json`);
    fs.writeFileSync(outputFilePath, JSON.stringify(jsonOutput, null, 2));
    
    console.log(`Successfully converted to ${outputFilePath}`);
    return outputFilePath;
}

/**
 * Parse Claude markdown to extract messages
 * @param {string} mdContent The markdown content
 * @returns {Array} Array of message objects
 */
function parseClaudeMarkdown(mdContent) {
    const messages = [];
    let currentSection = "Main Conversation";
    
    // Different patterns for Claude message indicators
    const userPatterns = [
        /^_\*\*User\*\*_\s*$/i,     // _**User**_
        /^\*\*User:\*\*\s*$/i,      // **User:**
        /^User:\s*$/i,              // User:
        /^Human:\s*$/i              // Human:
    ];
    
    const assistantPatterns = [
        /^_\*\*Assistant\*\*_\s*$/i,  // _**Assistant**_
        /^\*\*Assistant:\*\*\s*$/i,   // **Assistant:**
        /^Assistant:\s*$/i,           // Assistant:
        /^Claude:\s*$/i               // Claude:
    ];
    
    const systemPatterns = [
        /^_\*\*System\*\*_\s*$/i,     // _**System**_
        /^\*\*System:\*\*\s*$/i,      // **System:**
        /^System:\s*$/i               // System:
    ];
    
    // File modification patterns
    const fileModificationPatterns = [
        /^_\*\*\*\*_\s*$/i,  // _****_
    ];

    // Split content into lines and process
    const lines = mdContent.split('\n');
    let messages_by_turns = [];
    let currentTurn = null;
    let currentContent = [];
    let lineIndex = 0;
    let inDiffBlock = false;
    let inFileModificationSection = false;
    
    // Process line by line, grouping by "turns" (user or assistant)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd(); // Preserve leading whitespace for formatting
        const trimmedLine = line.trim();
        
        // Check for section headers - these don't change the current turn
        if (trimmedLine.match(/^#+\s+/)) {
            currentSection = trimmedLine.replace(/^#+\s+/, '').trim();
            
            // Add the section header to content if we're building a turn
            if (currentTurn && !inDiffBlock && !inFileModificationSection) {
                currentContent.push(line);
            }
            continue;
        }
        
        // Check for diff code block start/end
        if (trimmedLine === '```diff') {
            inDiffBlock = true;
            continue;
        }
        
        if (inDiffBlock && trimmedLine === '```') {
            inDiffBlock = false;
            continue;
        }
        
        // Skip content inside diff blocks
        if (inDiffBlock) {
            continue;
        }
        
        // Check for file modification marker
        if (fileModificationPatterns.some(pattern => pattern.test(trimmedLine))) {
            inFileModificationSection = true;
            continue;
        }
        
        // Check for role indicators
        const isUserMessage = userPatterns.some(pattern => pattern.test(trimmedLine));
        const isAssistantMessage = assistantPatterns.some(pattern => pattern.test(trimmedLine));
        const isSystemMessage = systemPatterns.some(pattern => pattern.test(trimmedLine));
        
        // If we found a role indicator
        if (isUserMessage || isAssistantMessage || isSystemMessage) {
            // First role indicator we've seen, or changing roles
            if (!currentTurn || 
                (isUserMessage && currentTurn !== 'user') || 
                (isAssistantMessage && currentTurn !== 'assistant') || 
                (isSystemMessage && currentTurn !== 'system')) {
                
                // Save the current turn if we have one
                if (currentTurn && currentContent.length > 0) {
                    messages_by_turns.push({
                        role: currentTurn,
                        content: currentContent,
                        section: currentSection,
                        lineIndex: lineIndex
                    });
                }
                
                // Start a new turn
                currentTurn = isUserMessage ? 'user' : (isAssistantMessage ? 'assistant' : 'system');
                currentContent = [];
                lineIndex = i;
                inFileModificationSection = false;
            }
            
            // Don't add the role indicator line to content
            continue;
        }
        
        // Add content if we're in a turn and not in a file modification section
        if (currentTurn && !inFileModificationSection) {
            currentContent.push(line);
        }
        // If we hit content without a role indicator at the start, assume it's the first user message
        else if (trimmedLine && messages_by_turns.length === 0 && !inFileModificationSection) {
            currentTurn = 'user';
            currentContent = [line];
            lineIndex = i;
        }
    }
    
    // Don't forget the last turn
    if (currentTurn && currentContent.length > 0) {
        messages_by_turns.push({
            role: currentTurn,
            content: currentContent,
            section: currentSection,
            lineIndex: lineIndex
        });
    }
    
    // Convert the turn-based messages into individual messages
    for (const turn of messages_by_turns) {
        // Join the content lines
        const contentText = turn.content.join('\n');
        
        // Skip empty messages
        if (!contentText.trim()) continue;
        
        messages.push({
            id: uuidv4(),
            role: turn.role,
            content: contentText,
            section: turn.section,
            lineIndex: turn.lineIndex
        });
    }
    
    // Sort messages by their position in the file
    messages.sort((a, b) => a.lineIndex - b.lineIndex);
    
    return messages;
}

/**
 * Create parent-child mapping structure for messages
 * @param {Array} messages Array of parsed messages
 * @param {number} baseTimestamp Base timestamp for message creation times
 * @param {string} modelName Claude model name to use in metadata
 * @returns {Object} Object with rootId and mapping structure
 */
function createMessageMapping(messages, baseTimestamp, modelName = DEFAULT_CLAUDE_MODEL) {
    const mapping = {};
    let rootId = uuidv4();
    let previousId = rootId;
    
    // Create root node
    mapping[rootId] = {
        id: rootId,
        message: null,
        parent: null,
        children: []
    };
    
    // Add a system message at the beginning if there isn't one already
    const hasSystemMessage = messages.some(msg => msg.role === "system");
    
    if (!hasSystemMessage) {
        const systemId = uuidv4();
        const systemTimestamp = generatePreciseTimestamp(baseTimestamp);
        
        mapping[systemId] = {
            id: systemId,
            message: {
                id: systemId,
                author: {
                    role: "system",
                    name: null,
                    metadata: {}
                },
                create_time: systemTimestamp,
                update_time: systemTimestamp,
                content: {
                    content_type: "text",
                    parts: ["You are Claude, an AI assistant created by Anthropic."]
                },
                status: "finished_successfully",
                end_turn: true,
                weight: 0,
                metadata: {
                    is_visually_hidden_from_conversation: true
                },
                recipient: "all",
                channel: null
            },
            parent: rootId,
            children: []
        };
        
        mapping[rootId].children.push(systemId);
        previousId = systemId;
    }
    
    // Process each message and add to mapping
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const messageId = msg.id;
        
        // Generate a timestamp with appropriate increment (30 seconds per message)
        // and microsecond precision
        const timestamp = generatePreciseTimestamp(baseTimestamp, (i + 1) * MESSAGE_TIME_GAP);
        
        // Determine if this message ends a turn
        const endsTurn = i === messages.length - 1 || messages[i + 1].role !== msg.role;
        
        // Generate token count approximation based on content length
        const tokenCount = Math.ceil(msg.content.length / 4);
        
        // Create message object in ChatGPT format
        const messageObj = {
            id: messageId,
            author: {
                role: msg.role,
                name: null,
                metadata: {}
            },
            create_time: timestamp,
            update_time: timestamp,
            content: {
                content_type: "text",
                parts: [msg.content]
            },
            status: "finished_successfully",
            end_turn: endsTurn,
            weight: 1.0,
            metadata: {
                // Add some ChatGPT-like metadata
                timestamp_: new Date(timestamp * 1000).toISOString(),
                message_type: msg.role === "user" ? "question" : "answer",
                model_slug: modelName,
                token_count: tokenCount,
                section: msg.section
            },
            recipient: "all",
            channel: null
        };
        
        // Add message to mapping
        mapping[messageId] = {
            id: messageId,
            message: messageObj,
            parent: previousId,
            children: []
        };
        
        // Add this message as a child of the previous message
        mapping[previousId].children.push(messageId);
        
        // Update previousId for next iteration
        previousId = messageId;
    }
    
    return { rootId, mapping };
}

/**
 * Main function to process files
 */
function main() {
    // Get paths from command line arguments or use defaults
    const inputDir = process.argv[2] || './Claude-transcripts';
    const outputDir = process.argv[3] || './transcripts-json';
    const singleFile = process.argv[4]; // Optional: process just a single file
    const modelName = process.argv[5] || DEFAULT_CLAUDE_MODEL; // Optional: model name
    
    console.log(`Input directory: ${inputDir}`);
    console.log(`Output directory: ${outputDir}`);
    if (modelName !== DEFAULT_CLAUDE_MODEL) {
        console.log(`Using model: ${modelName}`);
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (singleFile) {
        // Process a single file
        const inputPath = path.join(inputDir, singleFile);
        if (fs.existsSync(inputPath)) {
            convertClaudeToJson(inputPath, outputDir, modelName);
        } else {
            console.error(`File not found: ${inputPath}`);
        }
    } else {
        // Process all markdown files in the input directory
        if (!fs.existsSync(inputDir)) {
            console.error(`Input directory not found: ${inputDir}`);
            console.log("Creating the directory...");
            fs.mkdirSync(inputDir, { recursive: true });
            return;
        }
        
        const mdFiles = fs.readdirSync(inputDir)
            .filter(file => file.endsWith('.md'));
        
        if (mdFiles.length === 0) {
            console.log('No markdown files found in the input directory.');
            return;
        }
        
        console.log(`Found ${mdFiles.length} markdown files to process.`);
        
        let successCount = 0;
        
        // Process each file
        for (const file of mdFiles) {
            const inputPath = path.join(inputDir, file);
            const result = convertClaudeToJson(inputPath, outputDir, modelName);
            if (result) successCount++;
        }
        
        console.log(`Processed ${mdFiles.length} files. ${successCount} converted successfully.`);
    }
}

// Run the script if executed directly
if (require.main === module) {
    main();
} else {
    // Export functions for use in other modules
    module.exports = {
        convertClaudeToJson,
        parseClaudeMarkdown,
        createMessageMapping
    };
}