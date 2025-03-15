/**
 * Platform Utilities
 * 
 * Common utility functions for platform handlers.
 */

/**
 * Cleans metadata for display by removing potentially large content fields
 * @param {Object} metadata - The metadata object to clean
 * @returns {Object} - Cleaned metadata
 */
export function cleanMetadata(metadata) {
    if (!metadata) return {};
    
    // Create a shallow copy
    const cleanedMetadata = {...metadata};
    
    // Remove potentially large fields
    if (cleanedMetadata.content && cleanedMetadata.content.parts) {
        delete cleanedMetadata.content.parts;
    }
    
    return cleanedMetadata;
}

/**
 * Checks if the message is empty
 * @param {Object} message - The message to check
 * @returns {boolean} - True if the message is empty or null
 */
export function isEmptyMessage(message) {
    return !message || 
        ((!message.parts || message.parts.length === 0) && 
        (!message.content || message.content === "") && 
        message.content_type === "model_editable_context");
}

/**
 * Safe JSON stringify with circular reference handling
 * @param {Object} obj - The object to stringify
 * @param {number} indent - Indentation spaces
 * @returns {string} - JSON string
 */
export function safeJsonStringify(obj, indent = 2) {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                return '[Circular Reference]';
            }
            cache.add(value);
        }
        return value;
    }, indent);
}

/**
 * Generate a unique hash for message caching
 * @param {string} text - The text to hash
 * @returns {string} - Hash string
 */
export function hashString(text) {
    let hash = 0;
    if (text.length === 0) return hash.toString();
    
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString();
}

/**
 * Generate HTML for a thinking box
 * @param {string} thinkingContent - The thinking content
 * @returns {string} - HTML string for the thinking box
 */
export function generateThinkingHtml(thinkingContent) {
    if (!thinkingContent) return '';
    
    return `
        <div class="thinking-box">
            <div class="thinking-header">AI Thinking Process</div>
            <div class="thinking-content">${thinkingContent}</div>
        </div>
    `;
}

/**
 * Platform detection from a message or transcript
 * @param {Object} transcript - The transcript object
 * @returns {string} - Platform identifier or 'unknown'
 */
export function detectPlatform(transcript) {
    if (!transcript) return 'unknown';
    
    // First, check if the platform is explicitly set
    if (transcript.platform) {
        const platform = transcript.platform.toLowerCase();
        
        if (platform.includes('chatgpt')) return 'chatgpt';
        if (platform.includes('claude-json')) return 'claude-json';
        if (platform.includes('claude-specstory')) return 'claude-specstory';
    }
    
    // If not explicit, try to detect from the message structure
    if (transcript.messages && transcript.messages.length > 0) {
        const firstMessage = transcript.messages[0];
        
        // Check for ChatGPT message patterns
        if (firstMessage.author && 
            (firstMessage.author.role === 'system' || 
             firstMessage.author.role === 'assistant' || 
             firstMessage.author.role === 'user' || 
             firstMessage.author.role === 'tool')) {
            return 'chatgpt';
        }
        
        // Check for Claude JSON patterns
        if (firstMessage.role === 'human' || 
            firstMessage.role === 'assistant' || 
            firstMessage.claude_thinking) {
            return 'claude-json';
        }
        
        // Check for Claude SpecStory patterns
        if (firstMessage.metadata && 
            firstMessage.metadata.model_slug && 
            firstMessage.metadata.model_slug.includes('claude')) {
            return 'claude-specstory';
        }
    }
    
    // Default fallback
    console.warn('Unable to detect platform from transcript, using unknown');
    return 'unknown';
}

/**
 * Checks if a message is a voice mode message
 * @param {Object} message - The message to check
 * @returns {boolean} - Whether the message is a voice mode message
 */
export function isVoiceModeMessage(message) {
    if (!message) return false;
    
    // Check various possible locations for voice_mode_message flag
    return (
        message.voice_mode_message === true ||
        (message.metadata && message.metadata.voice_mode_message === true) ||
        (message.content && message.content.voice_mode_message === true) ||
        (message.body && message.body.voice_mode_message === true)
    );
} 