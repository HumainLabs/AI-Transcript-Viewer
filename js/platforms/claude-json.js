/**
 * Claude JSON Platform Handler
 * 
 * Handles Claude JSON-specific transcript format and thinking extraction.
 * Claude JSON includes a dedicated claude_thinking field alongside the assistant's message
 * that contains the reasoning/thinking content.
 * Claude JSON also uses "human" role instead of "user" role.
 */

import { BasePlatformHandler } from './base-handler.js';
import { isEmptyMessage, cleanMetadata } from './platform-utils.js';

/**
 * Handler for Claude JSON-specific transcript formats
 */
export class ClaudeJsonHandler extends BasePlatformHandler {
    /**
     * Determines if this handler is compatible with the given platform
     * @param {string} platform - The platform identifier
     * @returns {boolean} - True if compatible, false otherwise
     */
    isCompatible(platform) {
        const isMatch = platform === 'claude-json';
        console.log(`ClaudeJsonHandler compatibility check for platform '${platform}': ${isMatch}`);
        return isMatch;
    }

    /**
     * Extracts the primary content from a message
     * @param {Object} message - The message to extract content from
     * @returns {string} - The extracted content or placeholder for empty content
     */
    extractMessageContent(message) {
        if (!message) return "[No message]";
        
        // Handle empty messages
        if (isEmptyMessage(message)) {
            return "[No message]";
        }
        
        // Claude JSON often has a simple content string
        if (typeof message.content === 'string') {
            return message.content || "[No message]";
        }
        
        // Try to extract from content.text
        if (message.content && typeof message.content === 'object') {
            if (message.content.text) {
                return message.content.text;
            }
            // Try to extract from content.parts if it exists
            if (message.content.parts && Array.isArray(message.content.parts)) {
                return message.content.parts.join('\n');
            }
        }
        
        // Try to extract from parts if it exists
        if (message.parts && Array.isArray(message.parts)) {
            return message.parts.join('\n');
        }
        
        // If we've tried everything and still have no content
        return "[No message content]";
    }

    /**
     * Extracts thinking content from a message
     * Claude JSON has a dedicated claude_thinking field containing reasoning
     * @param {Object} message - The message to extract thinking from
     * @returns {string|null} - The thinking content or null if none
     */
    extractThinkingContent(message) {
        if (!message) return null;
        
        // Check for claude_thinking field
        if (message.claude_thinking) {
            return message.claude_thinking;
        }
        
        return null;
    }

    /**
     * Claude JSON doesn't need message sequence handling
     * @returns {null} - No message sequence handling needed
     */
    handleMessageSequence() {
        return null;
    }

    /**
     * Gets the standardized role for a message
     * Claude JSON uses "human" instead of "user"
     * @param {Object} message - The message to get role from
     * @returns {string} - The standardized role
     */
    getMessageRole(message) {
        if (!message) return 'Unknown';
        
        // First determine the basic role
        let role = 'Unknown';
        
        // Map human to user for consistency
        if (message.role === 'human') {
            role = 'user';
        } else if (message.role) {
            // Use standard role if available
            role = message.role;
        } else if (typeof message.author === 'string') {
            // For older Claude JSON format
            if (message.author === 'human') role = 'user';
            else role = message.author;
        } else if (message.author && message.author.role) {
            // For nested author.role
            if (message.author.role === 'human') role = 'user';
            else role = message.author.role;
        }
        
        // Now capitalize for display
        if (role === 'user') {
            return 'User';
        } else if (role === 'assistant') {
            return 'Assistant';
        } else if (role === 'system') {
            return 'System';
        } else if (role === 'tool') {
            return 'Tool';
        }
        
        // Capitalize first letter for other roles
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
    
    /**
     * Gets the original role from the message without standardization
     * @param {Object} message - The message to get original role from
     * @returns {string} - The original role as specified in the message
     */
    getOriginalRole(message) {
        if (!message) return 'unknown';
        
        if (message.role) {
            return message.role;
        }
        
        if (typeof message.author === 'string') {
            return message.author;
        }
        
        if (message.author && message.author.role) {
            return message.author.role;
        }
        
        return 'unknown';
    }
    
    /**
     * Formats message metadata for display
     * @param {Object} metadata - The message metadata
     * @returns {Object} - Cleaned metadata without content
     */
    formatMetadata(metadata) {
        const cleaned = cleanMetadata(metadata);
        
        // Remove Claude-specific large fields
        delete cleaned.claude_thinking;
        
        return cleaned;
    }
} 