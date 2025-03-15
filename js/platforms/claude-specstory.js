/**
 * Claude SpecStory Platform Handler
 * 
 * Handles Claude SpecStory-specific transcript format and thinking extraction.
 * Claude SpecStory uses <think> tags within messages to delineate 
 * the reasoning/thinking part from the response content.
 */

import { BasePlatformHandler } from './base-handler.js';
import { isEmptyMessage, cleanMetadata } from './platform-utils.js';

/**
 * Handler for Claude SpecStory-specific transcript formats
 */
export class ClaudeSpecStoryHandler extends BasePlatformHandler {
    /**
     * Determines if this handler is compatible with the given platform
     * @param {string} platform - The platform identifier
     * @returns {boolean} - True if compatible, false otherwise
     */
    isCompatible(platform) {
        const isMatch = platform === 'claude-specstory';
        console.log(`ClaudeSpecStoryHandler compatibility check for platform '${platform}': ${isMatch}`);
        return isMatch;
    }
    
    /**
     * Determines if a message is from a Claude thinking model
     * @param {Object} message - The message to check
     * @returns {boolean} - True if from a thinking model, false otherwise
     */
    isClaudeThinkingModel(message) {
        if (!message || !message.metadata) return false;
        
        // Check the model slug for thinking indicators
        const modelSlug = message.metadata.model_slug || '';
        return modelSlug.includes('claude-3-haiku') || 
               modelSlug.includes('thinking');
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
        
        let content = '';
        
        // Try to get content as a string
        if (typeof message.content === 'string') {
            content = message.content;
        }
        // Try to get content from parts
        else if (message.parts && Array.isArray(message.parts)) {
            content = message.parts.join('\n');
        }
        // Try to get content from content object
        else if (message.content && typeof message.content === 'object') {
            if (message.content.text) {
                content = message.content.text;
            } else if (message.content.parts && Array.isArray(message.content.parts)) {
                content = message.content.parts.join('\n');
            }
        }
        
        // Remove thinking tags if present
        content = this.removeThinkingTags(content);
        
        return content || "[No message]";
    }
    
    /**
     * Removes <think> tags from content
     * @param {string} content - The content to process
     * @returns {string} - Content without thinking tags
     */
    removeThinkingTags(content) {
        if (!content || typeof content !== 'string') return content;
        
        // Remove <think> blocks
        return content.replace(/<think>([\s\S]*?)<\/think>/g, '')
                     .replace(/<thinking>([\s\S]*?)<\/thinking>/g, '')
                     .trim();
    }

    /**
     * Extracts thinking content from a message using <think> tags
     * @param {Object} message - The message to extract thinking from
     * @returns {string|null} - The thinking content or null if none
     */
    extractThinkingContent(message) {
        if (!message) return null;
        
        // Only extract thinking from Claude thinking models
        if (!this.isClaudeThinkingModel(message)) {
            return null;
        }
        
        let content = '';
        
        // Try to get content from different possible locations
        if (typeof message.content === 'string') {
            content = message.content;
        } else if (message.parts && Array.isArray(message.parts)) {
            content = message.parts.join('\n');
        } else if (message.content && typeof message.content === 'object') {
            if (message.content.text) {
                content = message.content.text;
            } else if (message.content.parts && Array.isArray(message.content.parts)) {
                content = message.content.parts.join('\n');
            }
        }
        
        // Extract thinking content from <think> tags
        const thinkMatches = content.match(/<think>([\s\S]*?)<\/think>/g) || 
                             content.match(/<thinking>([\s\S]*?)<\/thinking>/g);
        
        if (thinkMatches && thinkMatches.length > 0) {
            // Extract the content inside the tags
            const thinkContent = thinkMatches.map(match => {
                return match.replace(/<\/?think(ing)?>/g, '');
            }).join('\n\n');
            
            return thinkContent;
        }
        
        return null;
    }

    /**
     * Claude SpecStory doesn't need message sequence handling
     * @returns {null} - No message sequence handling needed
     */
    handleMessageSequence() {
        return null;
    }

    /**
     * Gets the standardized role for a message
     * @param {Object} message - The message to get role from
     * @returns {string} - The standardized role
     */
    getMessageRole(message) {
        if (!message) return 'Unknown';
        
        // Try different locations for role information
        let role = 'Unknown';
        
        if (message.role) {
            role = message.role;
        } else if (message.author) {
            if (typeof message.author === 'string') {
                role = message.author;
            } else if (message.author.role) {
                role = message.author.role;
            }
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
    
    /**
     * Formats message metadata for display
     * @param {Object} metadata - The message metadata
     * @returns {Object} - Cleaned metadata without content
     */
    formatMetadata(metadata) {
        return cleanMetadata(metadata);
    }
} 