/**
 * Display Helper
 * 
 * Functions for generating HTML and handling display-related logic
 * that integrates with the platform-specific handlers
 */

import { getPlatformHandler } from './platform-interface.js';
import { generateThinkingHtml, detectPlatform } from './platform-utils.js';

/**
 * Generates HTML for displaying a message
 * @param {Object} message - The message to display
 * @param {Object} transcript - The complete transcript
 * @param {Object} thinkingMessage - Optional thinking message to combine
 * @returns {string} - HTML for the message
 */
export function generateMessageHTML(message, transcript, thinkingMessage = null) {
    if (!message) {
        return '<p>No message</p>';
    }
    
    // Get the appropriate platform handler
    const platform = detectPlatform(transcript);
    const handler = getPlatformHandler(platform);
    
    // Get message content and role
    const content = handler.extractMessageContent(message);
    const role = handler.getMessageRole(message);
    
    // Get message index for event handling
    const messageIndex = typeof message._index !== 'undefined' ? message._index : -1;
    
    // Parse markdown content using marked library
    const parsedContent = typeof marked !== 'undefined' ? 
        marked.parse(content) : 
        `<pre>${content}</pre>`;
    
    // If we have a thinking message, ensure we use the primary message's role class
    // This is especially important for ChatGPT where tool messages (thinking) are combined with assistant messages
    const roleClass = thinkingMessage && role.toLowerCase() === 'tool' ? 
        'assistant' : role.toLowerCase();
    
    // Generate message header with index in the role
    const html = `
        <div class="message role-${roleClass}">
            <div class="message-header">
                <span class="message-role">${role} (${messageIndex})</span>
                <div class="action-icons">
                    <span class="search-icon" data-message-index="${messageIndex}" title="Find Similar Messages"><i class="fas fa-search"></i></span>
                    <span class="copy-icon" data-message-index="${messageIndex}" title="Copy message to clipboard"><i class="fas fa-clipboard"></i></span>
                    <span class="bookmark-icon" data-message-index="${messageIndex}" title="Bookmark this message"><i class="fas fa-bookmark"></i></span>
                    <span class="star-icon" data-message-index="${messageIndex}" title="Star this message for export"><i class="fas fa-star"></i></span>
                </div>
            </div>
    `;
    
    // Check for thinking content from different sources
    let thinkingContent = null;
    
    // First check for provided thinking message 
    if (thinkingMessage) {
        thinkingContent = handler.extractMessageContent(thinkingMessage);
    } 
    // Then check for thinking content within the message itself
    else {
        thinkingContent = handler.extractThinkingContent(message, transcript);
    }
    
    // Build final HTML combining thinking and content
    let resultHtml = html;
    
    // Add thinking content if available
    if (thinkingContent) {
        // Parse thinking content if marked is available
        const parsedThinking = typeof marked !== 'undefined' ? 
            marked.parse(thinkingContent) : 
            `<pre>${thinkingContent}</pre>`;
            
        resultHtml += `
            <div class="thinking-box">
                <div class="thinking-header">AI Thinking Process</div>
                <div class="thinking-content">${parsedThinking}</div>
            </div>
        `;
    }
    
    // Add the main content
    resultHtml += `
        <div class="message-content">${parsedContent}</div>
    </div>`;
    
    return resultHtml;
}

/**
 * Updates the three-message view using platform handlers
 * @param {Array} messages - The message list
 * @param {number} currentIndex - Current message index
 * @param {Object} transcript - The complete transcript
 * @param {Object} containers - DOM containers to update
 */
export function updateThreeMessageView(messages, currentIndex, transcript, containers) {
    if (!messages || messages.length === 0 || !containers) return;
    
    const { previousBox, currentBox, nextBox, 
            previousMessageContainer, currentMessageContainer, nextMessageContainer } = containers;
    
    // Reset boxes
    resetBoxes([previousBox, currentBox, nextBox]);
    
    // Get the platform handler
    const platform = detectPlatform(transcript);
    const handler = getPlatformHandler(platform);
    
    console.log(`[DEBUG] Updating three-message view for platform ${platform}, current index: ${currentIndex}`);
    
    // Get the current message
    const currentMessage = messages[currentIndex];
    const currentRole = handler.getMessageRole(currentMessage);
    
    console.log(`[DEBUG] Current message (${currentIndex}): role=${currentRole}`);
    
    // Add role class and update starred/bookmarked status
    previousBox.classList.add(`role-box-${currentRole.toLowerCase()}`);
    updateBoxStatus(previousBox, currentIndex);
    
    // Update the label in the box with message index
    const previousLabel = previousBox.querySelector('.message-box-label');
    if (previousLabel) {
        previousLabel.textContent = `${currentRole} (${currentIndex})`;
    }
    
    // Check for combined message sequence at current index
    const currentSequence = handler.handleMessageSequence(messages, currentIndex, transcript);
    
    if (currentSequence) {
        console.log(`[DEBUG] Found sequence at index ${currentIndex}:`, {
            primaryRole: handler.getMessageRole(currentSequence.primaryMessage),
            primaryIndex: currentSequence.primaryMessage._index || 'unknown',
            thinkingRole: handler.getMessageRole(currentSequence.thinkingMessage),
            thinkingIndex: currentSequence.thinkingMessage._index || 'unknown',
            skipNext: currentSequence.skipNext
        });
        
        // Current message is part of a sequence that should be combined
        previousMessageContainer.innerHTML = generateMessageHTML(
            currentSequence.primaryMessage,
            transcript,
            currentSequence.thinkingMessage
        );
    } else {
        console.log(`[DEBUG] No sequence found at index ${currentIndex}`);
        // No combined messages, display normally
        previousMessageContainer.innerHTML = generateMessageHTML(currentMessage, transcript);
    }
    
    // Calculate the next message index to display in the middle box
    let nextIndex;
    
    // If current message is part of a sequence and we need to skip the next message
    if (currentSequence && currentSequence.skipNext) {
        // Skip to message after the sequence (skip the next one)
        nextIndex = currentIndex + 2;
        console.log(`[DEBUG] Skipping to index ${nextIndex} because sequence.skipNext is true`);
    } else {
        // Normal progression
        nextIndex = currentIndex + 1;
    }
    
    console.log(`[DEBUG] Next message index calculated as: ${nextIndex}`);
    
    if (nextIndex < messages.length) {
        // Display the next message (middle box)
        const nextMessage = messages[nextIndex];
        const nextRole = handler.getMessageRole(nextMessage);
        
        console.log(`[DEBUG] Next message (${nextIndex}): role=${nextRole}`);
        
        // Add role class and update status
        currentBox.classList.add(`role-box-${nextRole.toLowerCase()}`);
        updateBoxStatus(currentBox, nextIndex);
        
        // Update the label
        const currentLabel = currentBox.querySelector('.message-box-label');
        if (currentLabel) {
            currentLabel.textContent = `${nextRole} (${nextIndex})`;
        }
        
        // Check for combined messages at next index
        const nextSequence = handler.handleMessageSequence(messages, nextIndex, transcript);
        
        if (nextSequence) {
            console.log(`[DEBUG] Found sequence at next index ${nextIndex}:`, {
                primaryRole: handler.getMessageRole(nextSequence.primaryMessage),
                primaryIndex: nextSequence.primaryMessage._index || 'unknown',
                thinkingRole: handler.getMessageRole(nextSequence.thinkingMessage),
                thinkingIndex: nextSequence.thinkingMessage._index || 'unknown',
                skipNext: nextSequence.skipNext
            });
            
            // Generate HTML for combined messages
            currentMessageContainer.innerHTML = generateMessageHTML(
                nextSequence.primaryMessage,
                transcript,
                nextSequence.thinkingMessage
            );
            
            // Calculate following index (for the right box)
            let followingIndex;
            
            // If next message is also part of a sequence we need to skip
            if (nextSequence.skipNext) {
                // Skip to message after the sequence
                followingIndex = nextIndex + 2;
                console.log(`[DEBUG] Skipping to following index ${followingIndex} because nextSequence.skipNext is true`);
            } else {
                // Normal progression
                followingIndex = nextIndex + 1;
            }
            
            console.log(`[DEBUG] Following message index calculated as: ${followingIndex}`);
            
            if (followingIndex < messages.length) {
                // Display the following message (right box)
                const followingMessage = messages[followingIndex];
                const followingRole = handler.getMessageRole(followingMessage);
                
                console.log(`[DEBUG] Following message (${followingIndex}): role=${followingRole}`);
                
                // Add role class and update status
                nextBox.classList.add(`role-box-${followingRole.toLowerCase()}`);
                updateBoxStatus(nextBox, followingIndex);
                
                // Update the label
                const nextLabel = nextBox.querySelector('.message-box-label');
                if (nextLabel) {
                    nextLabel.textContent = `${followingRole} (${followingIndex})`;
                }
                
                // Check for combined messages at following index
                const followingSequence = handler.handleMessageSequence(messages, followingIndex, transcript);
                
                if (followingSequence) {
                    console.log(`[DEBUG] Found sequence at following index ${followingIndex}`);
                    
                    // Generate HTML for combined messages
                    nextMessageContainer.innerHTML = generateMessageHTML(
                        followingSequence.primaryMessage,
                        transcript,
                        followingSequence.thinkingMessage
                    );
                } else {
                    // Normal message display
                    nextMessageContainer.innerHTML = generateMessageHTML(followingMessage, transcript);
                }
            } else {
                console.log(`[DEBUG] No following message available at index ${followingIndex}`);
                nextMessageContainer.innerHTML = '<p>No following message</p>';
            }
        } else {
            // No combined messages at next index, display normally
            currentMessageContainer.innerHTML = generateMessageHTML(nextMessage, transcript);
            
            // Calculate following index (for the right box)
            const followingIndex = nextIndex + 1;
            
            console.log(`[DEBUG] Following message index calculated as: ${followingIndex}`);
            
            if (followingIndex < messages.length) {
                // Display the following message (right box)
                const followingMessage = messages[followingIndex];
                const followingRole = handler.getMessageRole(followingMessage);
                
                console.log(`[DEBUG] Following message (${followingIndex}): role=${followingRole}`);
                
                // Add role class and update status
                nextBox.classList.add(`role-box-${followingRole.toLowerCase()}`);
                updateBoxStatus(nextBox, followingIndex);
                
                // Update the label
                const nextLabel = nextBox.querySelector('.message-box-label');
                if (nextLabel) {
                    nextLabel.textContent = `${followingRole} (${followingIndex})`;
                }
                
                // Check for combined messages at following index
                const followingSequence = handler.handleMessageSequence(messages, followingIndex, transcript);
                
                if (followingSequence) {
                    console.log(`[DEBUG] Found sequence at following index ${followingIndex}`);
                    
                    // Generate HTML for combined messages
                    nextMessageContainer.innerHTML = generateMessageHTML(
                        followingSequence.primaryMessage,
                        transcript,
                        followingSequence.thinkingMessage
                    );
                } else {
                    // Normal message display
                    nextMessageContainer.innerHTML = generateMessageHTML(followingMessage, transcript);
                }
            } else {
                console.log(`[DEBUG] No following message available at index ${followingIndex}`);
                nextMessageContainer.innerHTML = '<p>No following message</p>';
            }
        }
    } else {
        console.log(`[DEBUG] No next message available at index ${nextIndex}`);
        currentMessageContainer.innerHTML = '<p>No next message</p>';
        nextMessageContainer.innerHTML = '<p>No following message</p>';
    }
}

/**
 * Helper function to handle message box display
 * @param {Element} box - The box element
 * @param {Element} container - The message container 
 * @param {Array} messages - The message list
 * @param {number} index - Message index
 * @param {Object} handler - Platform handler
 * @param {Object} transcript - The transcript
 */
function handleMessageBox(box, container, messages, index, handler, transcript) {
    const message = messages[index];
    const role = handler.getMessageRole(message);
    
    console.log(`[DEBUG] Handling message box for index ${index}, role=${role}`);
    
    // Add role class and update status
    box.classList.add(`role-box-${role.toLowerCase()}`);
    updateBoxStatus(box, index);
    
    // Update the label with message index
    const label = box.querySelector('.message-box-label');
    if (label) {
        label.textContent = `${role} (${index})`;
    }
    
    // Check for combined messages
    const sequence = handler.handleMessageSequence(messages, index, transcript);
    
    if (sequence) {
        console.log(`[DEBUG] Found sequence at index ${index}:`, {
            primaryMessage: `${handler.getMessageRole(sequence.primaryMessage)} (${sequence.primaryMessage._index || 'unknown'})`,
            thinkingMessage: `${handler.getMessageRole(sequence.thinkingMessage)} (${sequence.thinkingMessage._index || 'unknown'})`,
            skipNext: sequence.skipNext
        });
        
        container.innerHTML = generateMessageHTML(
            sequence.primaryMessage,
            transcript,
            sequence.thinkingMessage
        );
    } else {
        console.log(`[DEBUG] No sequence found at index ${index}`);
        container.innerHTML = generateMessageHTML(message, transcript);
    }
}

/**
 * Helper function to reset message boxes
 * @param {Array} boxes - Array of box elements to reset
 */
function resetBoxes(boxes) {
    boxes.forEach(box => {
        // Remove all role-* classes
        const roleClasses = Array.from(box.classList)
            .filter(cls => cls.startsWith('role-box-'));
        
        roleClasses.forEach(cls => box.classList.remove(cls));
        
        // Remove starred and bookmarked classes
        box.classList.remove('starred-message', 'bookmarked-message');
    });
}

/**
 * Helper function to update box status (starred/bookmarked)
 * @param {Element} box - The box element to update
 * @param {number} messageIndex - The message index
 */
function updateBoxStatus(box, messageIndex) {
    // These functions would need to be provided or imported
    if (typeof isMessageStarred === 'function' && isMessageStarred(messageIndex)) {
        box.classList.add('starred-message');
    }
    
    if (typeof isMessageBookmarked === 'function' && isMessageBookmarked(messageIndex)) {
        box.classList.add('bookmarked-message');
    }
} 