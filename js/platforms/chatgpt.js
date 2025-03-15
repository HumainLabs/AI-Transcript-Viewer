/**
 * ChatGPT Platform Handler
 * 
 * Handles message processing for ChatGPT transcripts
 */

import { BasePlatformHandler } from './base-handler.js';
import { isEmptyMessage, cleanMetadata } from './platform-utils.js';

/**
 * Handler for ChatGPT-specific transcript formats
 */
export class ChatGPTHandler extends BasePlatformHandler {
    /**
     * Determines if this handler is compatible with the given platform
     * @param {string} platform - The platform identifier
     * @returns {boolean} - True if compatible, false otherwise
     */
    isCompatible(platform) {
        return platform === 'chatgpt';
    }

    /**
     * Extracts the primary content from a message
     * @param {Object} message - The message to extract content from
     * @returns {string} - The extracted content or placeholder for empty content
     */
    extractMessageContent(message) {
        if (!message) return "[No message]";
        
        // For tool messages, special handling
        if (message.role === 'tool' || (message.author && message.author.role === 'tool')) {
            const toolCalls = message.tool_calls || [];
            if (toolCalls.length > 0) {
                return toolCalls.map(call => {
                    // Format function call
                    if (call.function) {
                        let result = `Function: ${call.function.name}\n`;
                        if (call.function.arguments) {
                            try {
                                // Pretty print JSON arguments
                                const args = JSON.parse(call.function.arguments);
                                result += `Arguments: ${JSON.stringify(args, null, 2)}`;
                            } catch (e) {
                                result += `Arguments: ${call.function.arguments}`;
                            }
                        }
                        return result;
                    }
                    return JSON.stringify(call);
                }).join('\n\n');
            }
        }
        
        // Handle string content
        if (typeof message.content === 'string') {
            return message.content || "[No message]";
        }
        
        // Handle parts array
        if (message.parts && Array.isArray(message.parts)) {
            return message.parts.join('\n');
        }
        
        // Handle content array with text parts
        if (Array.isArray(message.content)) {
            const textParts = message.content
                .filter(part => part.type === 'text')
                .map(part => part.text || '')
                .join('\n');
                
            if (textParts) {
                return textParts;
            }
        }
        
        // Handle content object with parts
        if (message.content && message.content.parts && Array.isArray(message.content.parts)) {
            return message.content.parts.join('\n');
        }
        
        // Handle content object with text
        if (message.content && message.content.text) {
            return message.content.text;
        }
        
        return "[No message content]";
    }

    /**
     * Extracts thinking content from a message
     * Note: ChatGPT doesn't have explicit thinking content in a single message
     * We handle thinking content through message sequence analysis
     * @returns {null} - No direct thinking content
     */
    extractThinkingContent() {
        return null;
    }

    /**
     * Analyzes a sequence of messages to determine if they should be combined
     * Handles two patterns:
     * 1. Assistant message followed by a tool message
     * 2. Tool message followed by an assistant message
     * 
     * @param {Array} messages - The full message list
     * @param {number} currentIndex - The current message index
     * @returns {Object|null} - Combined message info or null if no combination
     */
    handleMessageSequence(messages, currentIndex) {
        if (!messages || currentIndex >= messages.length - 1) {
            return null;
        }
        
        const currentMessage = messages[currentIndex];
        const nextMessage = messages[currentIndex + 1];
        const currentRole = this.getMessageRole(currentMessage);
        const nextRole = nextMessage ? this.getMessageRole(nextMessage) : null;
        
        console.log(`[DEBUG ChatGPT] Analyzing message sequence at index ${currentIndex}:`, {
            currentRole,
            nextRole,
            currentIndex,
            nextIndex: currentIndex + 1,
            isCurrentA8km: this.isA8kmTool(currentMessage),
            isNextA8km: this.isA8kmTool(nextMessage)
        });
        
        // Pattern 1: Current message is an a8km123 tool (thinking), should be combined with next message
        // only if next message is Assistant
        if (this.isA8kmTool(currentMessage) && nextRole === 'Assistant') {
            console.log(`[DEBUG ChatGPT] Found a8km123 tool message at index ${currentIndex} followed by assistant at index ${currentIndex + 1} - combining as thinking`);
            
            return {
                primaryMessage: nextMessage,     // The assistant message is the primary
                thinkingMessage: currentMessage, // The a8km123 tool is the thinking
                skipNext: true                   // We should skip the next message in sequence
            };
        }
        
        // Pattern 2: Current message is Assistant and next message is a8km123 tool (thinking)
        if (currentRole === 'Assistant' && this.isA8kmTool(nextMessage)) {
            console.log(`[DEBUG ChatGPT] Found assistant message at index ${currentIndex} followed by a8km123 tool at index ${currentIndex + 1} - combining as thinking`);
            
            return {
                primaryMessage: currentMessage, // Current message is primary 
                thinkingMessage: nextMessage,   // Next message is thinking
                skipNext: true                  // We should skip the next message in sequence
            };
        }
        
        return null;
    }

    /**
     * Helper to check if a message is an a8km123 tool (thinking tool)
     * @param {Object} message - Message to check
     * @returns {boolean} - True if it's an a8km123 tool message
     */
    isA8kmTool(message) {
        if (!message) return false;
        
        // Pattern 1: Check for role being tool and author name being a8km123
        const isToolRole = 
            message.role === 'tool' || 
            (message.author && message.author.role === 'tool');
        
        const hasA8kmName = 
            (message.author && message.author.name === 'a8km123') ||
            (message.name === 'a8km123');
        
        // Pattern 2: Check for a8km123 in message content
        const hasA8kmInToolCalls = 
            message.tool_calls && 
            message.tool_calls.some(call => 
                call.name === 'a8km123' || 
                (call.function && call.function.name === 'a8km123')
            );
        
        // Log for debugging
        if (isToolRole && (hasA8kmName || hasA8kmInToolCalls)) {
            console.log("Found a8km123 tool message:", message);
        }
        
        return isToolRole && (hasA8kmName || hasA8kmInToolCalls);
    }

    /**
     * Gets the standardized role for a message
     * @param {Object} message - The message to get role from
     * @returns {string} - The standardized role (User, Assistant, System, Tool)
     */
    getMessageRole(message) {
        if (!message) return 'Unknown';
        
        // ChatGPT typically uses one of these patterns
        let role = 'Unknown';
        
        if (message.role) {
            role = message.role;
        } else if (message.author && message.author.role) {
            role = message.author.role;
        } else if (message.author && typeof message.author === 'string') {
            role = message.author;
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
        const cleaned = cleanMetadata(metadata);
        
        // Remove ChatGPT-specific large content fields
        if (cleaned.tool_calls) {
            cleaned.tool_calls = cleaned.tool_calls.map(call => {
                const cleanedCall = { ...call };
                if (cleanedCall.function) {
                    delete cleanedCall.function.arguments;
                }
                return cleanedCall;
            });
        }
        
        return cleaned;
    }
} 