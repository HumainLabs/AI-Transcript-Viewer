/**
 * Platform Interface - Defines the standard interface that all platform handlers should implement
 * 
 * This interface ensures consistent handling of different transcript formats
 * while providing platform-specific implementations for extracting content,
 * thinking, and other platform-specific behaviors.
 */

/**
 * @typedef {Object} PlatformHandler
 * @property {function} isCompatible - Determines if this handler is compatible with given message/transcript
 * @property {function} extractMessageContent - Extracts the main content from a message
 * @property {function} extractThinkingContent - Extracts thinking/reasoning content if available
 * @property {function} handleMessageSequence - Processes a sequence of messages (for combined display)
 * @property {function} getMessageRole - Gets the standardized role of a message
 * @property {function} formatMetadata - Formats message metadata for display
 */

/**
 * Base platform handler with no-op implementations
 * All platform-specific handlers should extend or implement these methods
 */
export const BasePlatformHandler = {
    /**
     * Determines if this handler is compatible with the given message or transcript
     * @param {Object} message - The message to check
     * @param {Object} transcript - The complete transcript
     * @returns {boolean} - True if this handler can process this message
     */
    isCompatible: (message, transcript) => false,

    /**
     * Extracts the primary content from a message
     * @param {Object} message - The message to extract content from
     * @returns {string} - The extracted content
     */
    extractMessageContent: (message) => "[No content]",

    /**
     * Extracts thinking/reasoning content if available
     * @param {Object} message - The message to extract thinking from
     * @param {Object} transcript - The full transcript for context
     * @returns {string|null} - The thinking content or null if none
     */
    extractThinkingContent: (message, transcript) => null,

    /**
     * Processes a sequence of messages to determine if they should be combined
     * @param {Array} messages - A sequence of messages to analyze
     * @param {number} currentIndex - The current position in the message list
     * @param {Object} transcript - The full transcript for context
     * @returns {Object|null} - A combined message object or null if no combination needed
     */
    handleMessageSequence: (messages, currentIndex, transcript) => null,

    /**
     * Gets a standardized role from a message
     * @param {Object} message - The message to get the role from
     * @returns {string} - The standardized role (user, assistant, system, tool, etc.)
     */
    getMessageRole: (message) => "unknown",

    /**
     * Formats message metadata for display
     * @param {Object} message - The message to format metadata for
     * @returns {Object} - Formatted metadata object
     */
    formatMetadata: (message) => ({})
};

/**
 * Platform Interface Module
 * 
 * Provides a unified interface for accessing and managing platform-specific handlers
 */

import { ChatGPTHandler } from './chatgpt.js';
import { ClaudeJsonHandler } from './claude-json.js';
import { ClaudeSpecStoryHandler } from './claude-specstory.js';
import { detectPlatform } from './platform-utils.js';

// Register all platform handlers here
const platformHandlers = [
    new ChatGPTHandler(),
    new ClaudeJsonHandler(),
    new ClaudeSpecStoryHandler()
];

// Default platform handler (fallback)
class DefaultPlatformHandler {
    isCompatible() {
        return true; // Always compatible as a fallback
    }
    
    extractMessageContent(message) {
        if (!message) return "[No message]";
        
        if (typeof message.content === 'string') {
            return message.content || "[No message]";
        }
        
        // Try to extract from content parts
        if (Array.isArray(message.content)) {
            const textParts = message.content
                .filter(part => part.type === 'text')
                .map(part => part.text || '')
                .join('\n');
                
            if (textParts) {
                return textParts;
            }
        }
        
        // Try to extract from parts array
        if (message.parts && Array.isArray(message.parts)) {
            return message.parts.join('\n');
        }
        
        // Try content.text if it exists
        if (message.content && message.content.text) {
            return message.content.text;
        }
        
        // Try content.parts if it exists
        if (message.content && message.content.parts && Array.isArray(message.content.parts)) {
            return message.content.parts.join('\n');
        }
        
        return "[No message content]";
    }
    
    extractThinkingContent() {
        return null; // No thinking content in default handler
    }
    
    handleMessageSequence() {
        return null; // No message sequence handling in default handler
    }
    
    getMessageRole(message) {
        if (!message) return 'Unknown';
        
        // Try to determine the basic role
        let role = 'Unknown';
        
        // Try common role properties
        if (message.role) {
            role = message.role;
        } else if (message.author) {
            if (typeof message.author === 'string') {
                role = message.author;
            } else if (message.author.role) {
                role = message.author.role;
            } else if (message.author.name === 'human') {
                role = 'user';
            }
        } else if (message.from === 'human' || message.from === 'user') {
            role = 'user';
        } else if (message.from === 'assistant' || message.from === 'ai') {
            role = 'assistant';
        }
        
        // Capitalize role name for display
        if (role === 'user' || role === 'human') {
            return 'User';
        } else if (role === 'assistant') {
            return 'Assistant';
        } else if (role === 'system') {
            return 'System';
        } else if (role === 'tool') {
            return 'Tool';
        }
        
        // Capitalize the first letter for any other role
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
    
    getOriginalRole(message) {
        return this.getMessageRole(message);
    }
    
    formatMetadata(metadata) {
        if (!metadata) return {};
        
        // Create a shallow copy to avoid modifying the original
        const cleanedMetadata = { ...metadata };
        
        // Remove potentially large content fields
        delete cleanedMetadata.content;
        delete cleanedMetadata.thinking_content;
        delete cleanedMetadata.claude_thinking;
        
        return cleanedMetadata;
    }
}

// Create a singleton instance of default handler
const defaultHandler = new DefaultPlatformHandler();

/**
 * Gets the appropriate platform handler for a transcript
 * @param {string} platform - The detected platform identifier
 * @returns {Object} - The platform handler
 */
export function getPlatformHandler(platform) {
    // Find a compatible handler by testing each handler
    const handler = platformHandlers.find(h => {
        try {
            return h.isCompatible(platform);
        } catch (e) {
            console.error('Error testing platform handler compatibility:', e);
            return false;
        }
    });
    
    if (handler) {
        console.log(`Using platform handler: ${platform}`);
    } else {
        console.warn(`No specific handler found for platform: ${platform}, using default handler`);
    }
    
    // Return the found handler or the default handler
    return handler || defaultHandler;
}

/**
 * Registers a new platform handler
 * @param {Object} handler - The platform handler to register
 */
export function registerPlatformHandler(handler) {
    if (typeof handler.isCompatible !== 'function') {
        console.error('Invalid platform handler: missing isCompatible method');
        return;
    }
    
    // Check for required methods
    const requiredMethods = [
        'extractMessageContent',
        'extractThinkingContent',
        'handleMessageSequence',
        'getMessageRole'
    ];
    
    const missingMethods = requiredMethods.filter(
        method => typeof handler[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
        console.error(`Invalid platform handler: missing methods: ${missingMethods.join(', ')}`);
        return;
    }
    
    // Add the handler to the list
    platformHandlers.push(handler);
}

/**
 * Creates a generic message object with standardized properties
 * @param {string} role - The message role
 * @param {string} content - The message content
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - A standardized message object
 */
export function createGenericMessage(role, content, metadata = {}) {
    return {
        role,
        content,
        metadata,
        timestamp: new Date().toISOString()
    };
}

/**
 * Processes a transcript using the appropriate platform handler
 * @param {Object} transcript - The transcript to process
 * @returns {Object} - The processed transcript
 */
export function processTranscript(transcript) {
    if (!transcript || !transcript.messages) {
        return transcript;
    }
    
    // Detect platform and get handler
    const platform = detectPlatform(transcript);
    const handler = getPlatformHandler(platform);
    
    // Process messages
    const processedMessages = transcript.messages.map((message, index) => {
        // Add index for reference
        message._index = index;
        return message;
    });
    
    // Return processed transcript
    return {
        ...transcript,
        messages: processedMessages,
        platform
    };
} 