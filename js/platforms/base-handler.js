/**
 * Base Platform Handler
 * 
 * Abstract class that defines the interface for platform-specific handlers
 */

import { cleanMetadata, isEmptyMessage } from './platform-utils.js';

/**
 * Abstract base class for platform-specific handlers
 */
export class BasePlatformHandler {
    /**
     * Determines if this handler can process the given platform
     * @param {string} platform - The platform identifier
     * @returns {boolean} - True if compatible, false otherwise
     */
    isCompatible(platform) {
        console.log(`Testing compatibility for platform: ${platform}`);
        return false; // Base implementation always returns false
    }
    
    /**
     * Extracts the primary content from a message
     * @param {Object} message - The message to extract content from
     * @returns {string} - The extracted content or placeholder for empty content
     */
    extractMessageContent(message) {
        if (!message) return "[No message]";
        
        // Simple string content
        if (typeof message.content === 'string') {
            return message.content || "[No message]";
        }
        
        // Try to extract from content parts
        if (Array.isArray(message.content)) {
            const textParts = message.content
                .filter(part => part.type === 'text')
                .map(part => part.text)
                .join('\n');
                
            return textParts || "[No message]";
        }
        
        return "[Unsupported message format]";
    }
    
    /**
     * Extracts thinking content from a message
     * @param {Object} message - The message to extract thinking from
     * @param {Object} transcript - The complete transcript (for context)
     * @returns {string|null} - The thinking content or null if none
     */
    extractThinkingContent(message, transcript) {
        // Should be overridden by subclasses
        return null;
    }
    
    /**
     * Analyzes a sequence of messages to determine if they should be combined
     * @param {Array} messages - The full message list
     * @param {number} currentIndex - The current message index
     * @param {Object} transcript - The complete transcript 
     * @returns {Object|null} - Combined message info or null if no combination
     */
    handleMessageSequence(messages, currentIndex, transcript) {
        // Should be overridden by subclasses
        return null;
    }
    
    /**
     * Gets the standardized role for a message
     * @param {Object} message - The message to get role from
     * @returns {string} - The standardized role (user, assistant, system, tool, etc.)
     */
    getMessageRole(message) {
        if (!message) return 'unknown';
        
        // Standard cases
        if (message.role) return message.role;
        
        // Author object
        if (message.author) {
            if (typeof message.author === 'string') {
                return message.author;
            }
            if (message.author.role) {
                return message.author.role;
            }
        }
        
        // Default
        return 'unknown';
    }
    
    /**
     * Gets the original, non-standardized role from a message
     * @param {Object} message - The message to get original role from
     * @returns {string} - The original role as specified in the message
     */
    getOriginalRole(message) {
        return this.getMessageRole(message);
    }
    
    /**
     * Formats message metadata for display
     * @param {Object} metadata - The message metadata
     * @returns {Object} - Cleaned metadata
     */
    formatMetadata(metadata) {
        return cleanMetadata(metadata);
    }
} 