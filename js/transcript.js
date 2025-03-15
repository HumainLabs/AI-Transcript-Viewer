// Reference global variables from main.js
// No need to redeclare them here

// Function to process the transcript JSON and extract messages in order
function processTranscript(data) {
    transcript = data;
    messageList = [];
    
    // Extract the root node and then traverse the tree
    if (transcript.mapping) {
        // Find the root node (parent is null)
        let rootNodeId = null;
        for (const nodeId in transcript.mapping) {
            if (transcript.mapping[nodeId].parent === null) {
                rootNodeId = nodeId;
                break;
            }
        }
        
        if (rootNodeId) {
            // Traverse the conversation tree
            traverseConversation(rootNodeId);
        }
    } else if (Array.isArray(transcript.messages)) {
        // Some formats might have a direct array of messages
        messageList = transcript.messages;
    }
    
    // Add indices to messages for reference
    messageList.forEach((message, index) => {
        message._index = index;
    });
    
    // Detect transcript platform if not already set
    if (!transcript.platform) {
        if (window.detectTranscriptPlatform) {
            transcript.platform = window.detectTranscriptPlatform(transcript);
            console.log(`Detected transcript platform: ${transcript.platform}`);
        }
    }
    
    // Update the total message count
    document.getElementById('total-messages').textContent = messageList.length;
    
    // Display the first message
    if (messageList.length > 0) {
        currentMessageIndex = 0;
        displayMessage(currentMessageIndex);
    } else {
        document.getElementById('previous-message-container').innerHTML = '<p>No messages found in this transcript.</p>';
        document.getElementById('current-index').textContent = '0';
    }
    
    // Dispatch a custom event to notify other modules that the transcript is loaded
    const event = new CustomEvent('transcript-loaded', { detail: { transcript } });
    document.dispatchEvent(event);
    
    return transcript;
}

// Recursive function to traverse the conversation tree
function traverseConversation(nodeId) {
    const node = transcript.mapping[nodeId];
    
    if (node && node.message) {
        messageList.push(node.message);
    }
    
    // Traverse children
    if (node && node.children && node.children.length > 0) {
        for (const childId of node.children) {
            traverseConversation(childId);
        }
    }
}

// Extract the message content using platform handlers if available
function extractMessageContent(message) {
    // Use platform handler if available
    if (window.generatePlatformMessageHTML && transcript) {
        try {
            // Get message content via platform handler
            const platform = transcript.platform || 
                             (window.detectTranscriptPlatform ? window.detectTranscriptPlatform(transcript) : null);
            
            if (platform && window.getPlatformHandler) {
                const handler = window.getPlatformHandler(platform);
                return handler.extractMessageContent(message);
            }
        } catch (error) {
            console.error("Error using platform handler:", error);
        }
    }
    
    // Fallback to legacy implementation if handler not available
    // Check if message is empty or has no content
    if (!message || 
        ((!message.parts || message.parts.length === 0) && 
        (!message.content || message.content === "") && 
        message.content_type === "model_editable_context")) {
        return "[no message]";
    }
    
    let content = '';
    
    // If the message has parts array
    if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
        content = message.parts.join('\n');
    }
    // If the message has content as a string
    else if (typeof message.content === 'string' && message.content.trim() !== '') {
        content = message.content;
    }
    // If the message has content as an object with parts array
    else if (message.content && message.content.parts && Array.isArray(message.content.parts) && message.content.parts.length > 0) {
        content = message.content.parts.join('\n');
    }
    // If the message has content as an object with text property
    else if (message.content && message.content.text && message.content.text.trim() !== '') {
        content = message.content.text;
    }
    // If we got here and still don't have content
    else if (message.content_type === "model_editable_context" || 
        (message.content && typeof message.content === 'object' && Object.keys(message.content).length === 0)) {
        return "[no message]";
    }
    
    return content;
}

// Extract thinking content using platform handlers if available
function extractThinkingContent(message) {
    // Use platform handler if available
    if (window.generatePlatformMessageHTML && transcript) {
        try {
            // Get thinking content via platform handler
            const platform = transcript.platform || 
                             (window.detectTranscriptPlatform ? window.detectTranscriptPlatform(transcript) : null);
            
            if (platform && window.getPlatformHandler) {
                const handler = window.getPlatformHandler(platform);
                return handler.extractThinkingContent(message, transcript);
            }
        } catch (error) {
            console.error("Error using platform handler for thinking content:", error);
        }
    }
    
    // Fallback implementations
    
    // For Claude JSON, check for claude_thinking field
    if (message && message.claude_thinking) {
        return message.claude_thinking;
    }
    
    // For Claude thinking models with <think> tags
    if (isClaudeThinkingModel(message)) {
        let content = '';
        
        // Get the full content
        if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
            content = message.parts.join('\n');
        } else if (typeof message.content === 'string') {
            content = message.content;
        } else if (message.content && message.content.parts && Array.isArray(message.content.parts)) {
            content = message.content.parts.join('\n');
        } else if (message.content && message.content.text) {
            content = message.content.text;
        }
        
        // Extract content inside <think> tags
        const thinkMatches = content.match(/<think>([\s\S]*?)<\/think>/g);
        
        if (thinkMatches && thinkMatches.length > 0) {
            // Extract content from all thinking tags and combine
            return thinkMatches
                .map(match => match.replace(/<think>|<\/think>/g, '').trim())
                .join('\n\n');
        }
    }
    
    return null;
}

// Check if a message is from a Claude thinking model
function isClaudeThinkingModel(message) {
    if (!message || !message.metadata || !message.metadata.model_slug) {
        return false;
    }
    
    const modelName = message.metadata.model_slug.toLowerCase();
    return modelName.includes('claude') && (modelName.includes('thinking') || modelName.includes('haiku'));
}

// Check if message is from Claude JSON format
function isClaudeJsonMessage(message) {
    // Check if we're in a claude-json platform transcript
    if (transcript && transcript.platform === 'claude-json') {
        return true;
    }
    return false;
}

// Extract message content for search purposes (simpler, focused on text extraction)
function extractSearchableContent(message) {
    let content = '';
    
    // Handle different message formats
    if (message.content && typeof message.content === 'string') {
        content = message.content;
    } else if (message.content && Array.isArray(message.content)) {
        // For array content, concatenate all text parts
        content = message.content
            .filter(part => part.type === 'text' || !part.type)
            .map(part => part.text || part)
            .join(' ');
    } else if (message.parts && Array.isArray(message.parts)) {
        // Handle parts array directly
        content = message.parts.join(' ');
    } else if (message.message && typeof message.message === 'string') {
        content = message.message;
    } else if (message.text && typeof message.text === 'string') {
        content = message.text;
    } else if (message.tool_result && typeof message.tool_result === 'string') {
        content = message.tool_result;
    } else if (message.content && message.content.parts && Array.isArray(message.content.parts)) {
        // Handle nested content parts structure
        content = message.content.parts.join(' ');
    } else {
        // Use the display extraction as fallback
        content = extractMessageContent(message);
    }
    
    // Strip HTML and code blocks, but preserve their textual content
    content = content.replace(/<[^>]*>/g, ' ');
    
    // Replace code blocks with their content but add markers
    content = content.replace(/```([^`]*?)```/g, ' code: $1 ');
    
    // Handle inline code
    content = content.replace(/`([^`]*?)`/g, ' $1 ');
    
    // Handle markdown links
    content = content.replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1');
    
    // Replace multiple spaces with single space
    content = content.replace(/\s+/g, ' ');
    
    return content.trim();
}

// Get only metadata without content/parts
function getCleanMetadata(message) {
    if (!message) return {};
    
    const metadata = {};
    
    // Get metadata from message or message.author
    const sourceMetadata = message.metadata || (message.author && message.author.metadata) || {};
    
    // Copy all properties
    Object.assign(metadata, sourceMetadata);
    
    // For empty messages, include the full message data
    if (extractMessageContent(message) === "[no message]") {
        metadata.full_message_data = JSON.stringify(message, null, 2);
    }
    
    // Return clean metadata
    return metadata;
}

// Format search results as HTML
function formatSearchResults(metadata) {
    if (!metadata || !metadata.search_result_groups || metadata.search_result_groups.length === 0) {
        return '';
    }
    
    let html = '<div class="search-results"><h4>Search Results</h4>';
    
    for (const group of metadata.search_result_groups) {
        html += `<div class="search-result-group">`;
        html += `<div class="search-result-domain">${group.domain}</div>`;
        
        for (const entry of group.entries) {
            html += `<div class="search-result">`;
            html += `<a href="${entry.url}" target="_blank" class="search-result-title">${entry.title}</a><br>`;
            html += `<div class="search-result-snippet">${entry.snippet}</div>`;
            html += `<div class="search-result-attribution">${entry.attribution}</div>`;
            html += `</div>`;
        }
        
        html += `</div>`;
    }
    
    html += '</div>';
    return html;
} 