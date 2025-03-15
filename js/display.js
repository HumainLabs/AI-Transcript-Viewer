// Format tool content based on tool type
function formatToolContent(message) {
    if (!message || !message.author || message.author.role !== 'tool') {
        return null;
    }
    
    const toolName = message.author.name || 'unknown';
    let contentHtml = '';
    
    switch (toolName) {
        case 'web':
            contentHtml = formatWebToolContent(message);
            break;
        // Add cases for other tools as needed
        default:
            // Generic tool content formatting
            contentHtml = `<div class="tool-content">
                <pre>${JSON.stringify(message.content, null, 2)}</pre>
            </div>`;
    }
    
    return {
        toolName: toolName,
        html: contentHtml
    };
}

// Format web tool content (search results)
function formatWebToolContent(message) {
    let html = '<div class="tool-content">';
    
    // Check if search_result_groups is in metadata
    if (message.metadata && message.metadata.search_result_groups) {
        html += `<div class="web-search-results">`;
        
        for (const group of message.metadata.search_result_groups) {
            for (const entry of group.entries) {
                html += `<div class="web-search-result">`;
                html += `<a href="${entry.url}" target="_blank" class="web-search-result-title">${entry.title}</a>`;
                html += `<div class="web-search-result-snippet">${entry.snippet}</div>`;
                html += `<div class="web-search-result-attribution">${entry.attribution}</div>`;
                html += `</div>`;
            }
        }
        
        html += `</div>`;
    } else if (message.content && message.content.text !== "") {
        // If there's content but no search results
        html += `<pre>${JSON.stringify(message.content, null, 2)}</pre>`;
    } else {
        html += `<p>No search results available</p>`;
    }
    
    html += '</div>';
    return html;
}

// Generate message HTML content
function generateMessageHTML(message, combineWithPrevious = null) {
    if (!message) {
        return '<p>No message to display</p>';
    }
    
    let role = '';
    
    // Extract role based on message structure
    if (message.author && message.author.role) {
        role = message.author.role;
    } else if (message.role) {
        role = message.role;
    }
    
    let html = '';
    
    // Special handling for tool role
    if (role === 'tool') {
        const toolName = message.author?.name || 'unknown';
        
        // Skip a8km123 tool messages when displayed individually
        // They'll be combined with the assistant message in updateThreeMessageView
        if (toolName === 'a8km123' && !combineWithPrevious) {
            return '';
        }
        
        const toolFormatting = formatToolContent(message);
        
        html = `<div class="role-${role} ${toolName}">`;
        html += `<div class="message-header">
            <span class="message-role">${toolName.toUpperCase()} TOOL RESULTS</span>
            <div class="message-actions">
                <span class="message-token-count" title="Estimated token count">~${getMessageTokenCount(message)} tokens</span>
                <span>${new Date(message.create_time * 1000).toLocaleString()}</span>
            </div>
        </div>`;
        
        if (toolFormatting) {
            html += toolFormatting.html;
        } else {
            // Extract content
            const content = extractMessageContent(message);
            // Parse markdown content
            const parsedContent = marked.parse(content);
            html += `<div class="message-content">${parsedContent}</div>`;
        }
        
        html += `</div>`;
    } else {
        // Regular message handling
        // Extract content
        const content = extractMessageContent(message);
        
        // Parse markdown content
        const parsedContent = marked.parse(content);
        
        const messageIndex = messageList.indexOf(message);
        const isStarred = isMessageStarred(messageIndex);
        const isBookmarked = isMessageBookmarked(messageIndex);
        
        html = `<div class="role-${role}">`;
        
        // Add message header with role and action buttons
        html += `<div class="message-header">
            <span class="message-role">${capitalizeFirstLetter(role)}</span>
            <div class="message-actions">
                <span class="message-token-count" data-message-index="${messageIndex}" title="Estimated token count">~${getMessageTokenCount(message)} tokens</span>
                <span class="search-icon" data-message-index="${messageIndex}" title="Find Similar Messages"><i class="fas fa-search"></i></span>
                <span class="copy-icon" data-message-index="${messageIndex}" title="Copy message to clipboard"><i class="fas fa-clipboard"></i></span>
                <span class="bookmark-icon" data-message-index="${messageIndex}" title="Bookmark this message"><i class="fas fa-bookmark"></i></span>
                <span class="star-icon" data-message-index="${messageIndex}" title="Star this message for export"><i class="fas fa-star"></i></span>
            </div>
        </div>`;
        
        // Check for thinking content from different sources
        let hasThinkingContent = false;
        let thinkingContent = '';
        
        // If we have a8km123 thinking to combine with this message
        if (combineWithPrevious) {
            thinkingContent = extractMessageContent(combineWithPrevious);
            hasThinkingContent = true;
        } 
        // Otherwise, check for Claude <think> tags
        else if (typeof extractThinkingContent === 'function') {
            const claudeThinking = extractThinkingContent(message);
            if (claudeThinking) {
                thinkingContent = claudeThinking;
                hasThinkingContent = true;
            }
        }
        
        // Display thinking content if available
        if (hasThinkingContent) {
            const thinkingParsed = marked.parse(thinkingContent);
            
            html += `<div class="thinking-box">
                <div class="thinking-header">AI Thinking Process</div>
                <div class="thinking-content">${thinkingParsed}</div>
            </div>`;
        }
        
        html += `<div class="message-content">${parsedContent}</div>`;
        
        // Keep search results in the message container
        const metadata = getCleanMetadata(message);
        if (metadata.search_result_groups) {
            html += `<div class="message-metadata">`;
            html += formatSearchResults(metadata);
            html += `</div>`;
        }
        
        html += `</div>`;
    }
    
    return html;
}

// Function to display a specific message at an index
function displayMessage(index) {
    if (!messageList || index < 0 || index >= messageList.length) {
        return;
    }
    
    // Update current index
    currentMessageIndex = index;
    currentIndexSpan.textContent = currentMessageIndex + 1;
    
    // Get current message
    const message = messageList[currentMessageIndex];
    
    // Extract role for display
    let role = '';
    if (message.author && message.author.role) {
        role = message.author.role;
    } else if (message.role) {
        role = message.role;
    }
    
    // Update all three containers in the three-message view
    updateThreeMessageView();
    
    // Display metadata for the response message (n+1)
    displayMetadata();
    
    // Add event listeners for the icons and buttons
    setupFindSimilarButtons();
    setupStarIcons();
    setupBookmarkIcons();
    setupCopyIcons();
}

// Function to display metadata for the current message's response
function displayMetadata() {
    metadataContainer.innerHTML = '';
    
    if (!messageList || currentMessageIndex < 0 || currentMessageIndex >= messageList.length) {
        return;
    }
    
    // Get response message (n+1)
    const nextIndex = currentMessageIndex + 1;
    
    if (nextIndex < messageList.length) {
        const nextMessage = messageList[nextIndex];
        const nextRole = nextMessage.author?.role || nextMessage.role || 'unknown';
        const nextName = nextMessage.author?.name || '';
        
        // Check if the next message is an a8km123 thinking tool
        if (nextRole === 'tool' && nextName === 'a8km123' && currentMessageIndex + 2 < messageList.length) {
            // We have both a thinking message (n+1) and a response message (n+2)
            const thinkingMessage = nextMessage;
            const responseMessage = messageList[currentMessageIndex + 2];
            const responseRole = responseMessage.author?.role || responseMessage.role || 'unknown';
            
            let metadataHTML = '';
            
            // First, add metadata for the thinking message
            const thinkingMetadata = getCleanMetadata(thinkingMessage);
            if (thinkingMetadata && Object.keys(thinkingMetadata).length > 0) {
                // Create a clean version of the metadata without content.parts if it exists
                const cleanThinkingMetadata = {...thinkingMetadata};
                
                // Remove content.parts if it exists to avoid too much text
                if (cleanThinkingMetadata.content && cleanThinkingMetadata.content.parts) {
                    delete cleanThinkingMetadata.content.parts;
                }
                
                metadataHTML += `<div class="other-metadata">
                    <h4>Thinking Metadata (${nextName})</h4>
                    <pre>${JSON.stringify(cleanThinkingMetadata, null, 2)}</pre>
                </div>`;
            }
            
            // Then, add metadata for the response message
            const responseMetadata = getCleanMetadata(responseMessage);
            if (responseMetadata && Object.keys(responseMetadata).length > 0) {
                // Create a clean version of the metadata without content.parts if it exists
                const cleanResponseMetadata = {...responseMetadata};
                
                // Remove content.parts if it exists to avoid too much text
                if (cleanResponseMetadata.content && cleanResponseMetadata.content.parts) {
                    delete cleanResponseMetadata.content.parts;
                }
                
                metadataHTML += `<div class="other-metadata">
                    <h4>Response Metadata (${responseRole})</h4>
                    <pre>${JSON.stringify(cleanResponseMetadata, null, 2)}</pre>
                </div>`;
            }
            
            if (metadataHTML) {
                metadataContainer.innerHTML = metadataHTML;
            } else {
                metadataContainer.innerHTML = `<div class="other-metadata">
                    <h4>No Metadata Available</h4>
                    <p>No metadata available for thinking or response message.</p>
                </div>`;
            }
        } else {
            // Normal case, just show metadata for the next message
            const metadata = getCleanMetadata(nextMessage);
            
            if (metadata && Object.keys(metadata).length > 0) {
                // Create a clean version of the metadata without content.parts if it exists
                const cleanMetadata = {...metadata};
                
                // Remove content.parts if it exists to avoid too much text
                if (cleanMetadata.content && cleanMetadata.content.parts) {
                    delete cleanMetadata.content.parts;
                }
                
                // Create HTML with the entire metadata object as a single JSON string
                const metadataHTML = `<div class="other-metadata">
                    <h4>Response Metadata (${nextRole})</h4>
                    <pre>${JSON.stringify(cleanMetadata, null, 2)}</pre>
                </div>`;
                
                metadataContainer.innerHTML = metadataHTML;
            } else {
                metadataContainer.innerHTML = `<div class="other-metadata">
                    <h4>Response Metadata (${nextRole})</h4>
                    <p>No additional metadata available for the response.</p>
                </div>`;
            }
        }
    } else {
        metadataContainer.innerHTML = `<div class="other-metadata">
            <h4>Response Metadata</h4>
            <p>No response message available.</p>
        </div>`;
    }
}

// Function to find the next user message index
function findNextUserMessageIndex(currentIndex) {
    if (!messageList || messageList.length === 0) return -1;
    
    for (let i = currentIndex + 1; i < messageList.length; i++) {
        const message = messageList[i];
        const role = message.author?.role || message.role;
        
        if (role === 'user' || role === 'human') {
            return i;
        }
    }
    
    return -1; // No more user messages
}

// Function to find the previous user message index
function findPreviousUserMessageIndex(currentIndex) {
    if (!messageList || messageList.length === 0) return -1;
    
    for (let i = currentIndex - 1; i >= 0; i--) {
        const message = messageList[i];
        const role = message.author?.role || message.role;
        
        if (role === 'user' || role === 'human') {
            return i;
        }
    }
    
    return -1; // No more user messages
}

// Helper function to format role label
function formatRoleLabel(message) {
    if (!message) return 'No Message';
    
    const role = message.author?.role || message.role || 'unknown';
    
    // Special formatting for tool messages
    if (role === 'tool' && message.author?.name) {
        return `Tool (${message.author.name})`;
    }
    
    return capitalizeFirstLetter(role);
}

// Update all three message containers
function updateThreeMessageView() {
    if (!messageList || messageList.length === 0) return;
    
    // Get the current message
    const currentMessage = messageList[currentMessageIndex];
    
    // Get container elements
    const previousBox = document.querySelector('.message-box.previous');
    const currentBox = document.querySelector('.message-box.current');
    const nextBox = document.querySelector('.message-box.next');
    
    // Get label elements - we'll hide these since we now use message-header
    const previousLabel = document.querySelector('.message-box.previous .message-box-label');
    const currentLabel = document.querySelector('.message-box.current .message-box-label');
    const nextLabel = document.querySelector('.message-box.next .message-box-label');
    
    // Hide all message-box-label elements since we're using message-header now
    previousLabel.style.display = 'none';
    currentLabel.style.display = 'none';
    nextLabel.style.display = 'none';
    
    // Get message containers
    const previousMessageContainer = document.getElementById('previous-message-container');
    const currentMessageContainer = document.getElementById('current-message-container');
    const nextMessageContainer = document.getElementById('next-message-container');
    
    // Clear previous role and starred classes
    resetRoleClasses(previousBox);
    resetRoleClasses(currentBox);
    resetRoleClasses(nextBox);
    
    previousBox.classList.remove('starred-message', 'bookmarked-message');
    currentBox.classList.remove('starred-message', 'bookmarked-message');
    nextBox.classList.remove('starred-message', 'bookmarked-message');
    
    // Add current message role to previous box
    const currentRole = currentMessage.author?.role || currentMessage.role || 'unknown';
    previousBox.classList.add(`role-box-${currentRole}`);
    
    // Check if current message is starred/bookmarked
    if (isMessageStarred(currentMessageIndex)) {
        previousBox.classList.add('starred-message');
    }
    if (isMessageBookmarked(currentMessageIndex)) {
        previousBox.classList.add('bookmarked-message');
    }
    
    // Display current message in previous box
    previousMessageContainer.innerHTML = generateMessageHTML(currentMessage);
    
    // Handle next message (goes in current box)
    const nextIndex = currentMessageIndex + 1;
    if (nextIndex < messageList.length) {
        const nextMessage = messageList[nextIndex];
        // Get role for next message
        const nextRole = nextMessage.author?.role || nextMessage.role || 'unknown';
        
        // Add to current box
        currentBox.classList.add(`role-box-${nextRole}`);
        
        // Check if this message is starred/bookmarked
        if (isMessageStarred(nextIndex)) {
            currentBox.classList.add('starred-message');
        }
        if (isMessageBookmarked(nextIndex)) {
            currentBox.classList.add('bookmarked-message');
        }
        
        // Handle potential a8km123 tool messages that should be combined with assistant response
        let a8kmMessage = null;
        if (nextRole === 'assistant' && nextIndex + 1 < messageList.length) {
            const possibleToolMessage = messageList[nextIndex + 1];
            const isA8kmTool = possibleToolMessage.author?.role === 'tool' && possibleToolMessage.author?.name === 'a8km123';
            
            if (isA8kmTool) {
                a8kmMessage = possibleToolMessage;
            }
        }
        
        currentMessageContainer.innerHTML = generateMessageHTML(nextMessage, a8kmMessage);
    } else {
        currentMessageContainer.innerHTML = '<p>No next message</p>';
    }
    
    // Handle following message (goes in next box)
    const followingIndex = currentMessageIndex + 2;
    if (followingIndex < messageList.length) {
        const followingMessage = messageList[followingIndex];
        const followingRole = followingMessage.author?.role || followingMessage.role || 'unknown';
        
        nextBox.classList.add(`role-box-${followingRole}`);
        
        // Check if this message is starred/bookmarked
        if (isMessageStarred(followingIndex)) {
            nextBox.classList.add('starred-message');
        }
        if (isMessageBookmarked(followingIndex)) {
            nextBox.classList.add('bookmarked-message');
        }
        
        nextMessageContainer.innerHTML = generateMessageHTML(followingMessage);
    } else {
        nextMessageContainer.innerHTML = '<p>No following message</p>';
    }
    
    // Set up event listeners for star and bookmark icons after updating all containers
    setupStarIcons();
    setupBookmarkIcons();
}

// Helper function to remove all role-related classes from an element
function resetRoleClasses(element) {
    const classesToRemove = Array.from(element.classList).filter(cls => cls.startsWith('role-box-'));
    classesToRemove.forEach(cls => element.classList.remove(cls));
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to estimate token count for a message
function estimateTokenCount(text) {
    if (!text) return 0;
    
    try {
        // Use a simple approximation (characters/4) for immediate display
        // This is a rough estimate that works reasonably well for most English text
        const tokenEstimate = Math.ceil(text.length / 4);
        
        // Also trigger the more accurate async calculation if the getTokenCount function exists
        if (typeof getTokenCount === 'function') {
            // Use a setTimeout to not block rendering
            setTimeout(async () => {
                try {
                    // This will update the cached value for future lookups
                    await getTokenCount(text, detectedModel);
                } catch (err) {
                    console.warn('Background token calculation error:', err);
                }
            }, 10);
        }
        
        // Format with commas for readability if over 1000
        return tokenEstimate > 999 ? 
            tokenEstimate.toLocaleString() : 
            tokenEstimate;
    } catch (error) {
        console.error('Error estimating tokens:', error);
        return '?';
    }
}

// Helper function to estimate token count for a message object,
// including thinking content for Claude thinking models
function getMessageTokenCount(message) {
    if (!message) return 0;
    
    // For Claude thinking models, include both main content and thinking content
    if (typeof isClaudeThinkingModel === 'function' && isClaudeThinkingModel(message)) {
        // Get regular content
        const mainContent = extractMessageContent(message) || '';
        
        // Get thinking content if available
        const thinkingContent = typeof extractThinkingContent === 'function' ? 
            (extractThinkingContent(message) || '') : '';
        
        // Estimate tokens for both parts
        const mainTokens = estimateTokenCount(mainContent);
        const thinkingTokens = estimateTokenCount(thinkingContent);
        
        // Convert to numbers, handle possible string formatting
        const mainCount = typeof mainTokens === 'string' ? 
            parseInt(mainTokens.replace(/,/g, '')) : mainTokens;
        
        const thinkingCount = typeof thinkingTokens === 'string' ? 
            parseInt(thinkingTokens.replace(/,/g, '')) : thinkingTokens;
        
        const totalTokens = mainCount + thinkingCount;
        
        // Format with commas for readability if over 1000
        return totalTokens > 999 ? 
            totalTokens.toLocaleString() : 
            totalTokens;
    }
    
    // For normal messages, just use the regular content
    const content = extractMessageContent(message);
    return estimateTokenCount(content);
}

// Set up event listeners for "Find Similar" buttons
function setupFindSimilarButtons() {
    document.querySelectorAll('.search-icon').forEach(icon => {
        // Remove any existing click event listeners to prevent duplicates
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
        
        newIcon.addEventListener('click', async (e) => {
            const messageIndex = parseInt(e.target.dataset.messageIndex);
            
            // Open search modal
            searchModal.style.display = 'flex';
            
            // Switch to semantic search
            if (!isSemanticSearch) {
                isSemanticSearch = true;
                semanticSearchBtn.classList.add('active');
                keywordSearchBtn.classList.remove('active');
            }
            
            // Show loading
            modelLoadingElement.style.display = 'block';
            progressBarFill.style.width = '20%';
            
            // Clear previous results
            searchResults.innerHTML = '<p>Searching for similar messages...</p>';
            searchResultCount.textContent = '';
            
            try {
                // Find similar messages
                const similarMessages = await findSimilarMessages(messageIndex);
                
                // Display results
                displaySearchResults(similarMessages);
                
                // Update search input to show what we're doing
                const messageContent = extractSearchableContent(messageList[messageIndex]);
                const shortContent = messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '');
                searchInput.value = `Similar to: "${shortContent}"`;
                
                // Hide loading
                modelLoadingElement.style.display = 'none';
                
            } catch (error) {
                console.error('Error finding similar messages:', error);
                searchResults.innerHTML = `<p>Error finding similar messages: ${error.message}</p>`;
                modelLoadingElement.style.display = 'none';
            }
            
            // Don't bubble up to parent elements
            e.stopPropagation();
        });
    });
}

// Set up event listeners for star icons
function setupStarIcons() {
    document.querySelectorAll('.star-icon').forEach(icon => {
        // Get the message index
        const messageIndex = parseInt(icon.dataset.messageIndex);
        
        // Set the initial state based on the data
        const isStarred = isMessageStarred(messageIndex);
        const iconElement = icon.querySelector('i');
        if (isStarred && iconElement) {
            iconElement.classList.add('starred');
        } else if (iconElement) {
            iconElement.classList.remove('starred');
        }
        
        // Remove any existing click event listeners to prevent duplicates
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
        
        newIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Get the star icon element (could be the span or the i element)
            const starIcon = e.target.closest('.star-icon');
            if (!starIcon) return;
            
            const messageIndex = parseInt(starIcon.dataset.messageIndex);
            if (isNaN(messageIndex)) return;
            
            // Toggle star status
            const isStarred = isMessageStarred(messageIndex);
            toggleMessageStar(messageIndex, !isStarred);
        });
    });
}

// Set up event listeners for bookmark icons
function setupBookmarkIcons() {
    document.querySelectorAll('.bookmark-icon').forEach(icon => {
        // Get the message index
        const messageIndex = parseInt(icon.dataset.messageIndex);
        
        // Set the initial state based on the data
        const isBookmarked = isMessageBookmarked(messageIndex);
        const iconElement = icon.querySelector('i');
        if (isBookmarked && iconElement) {
            iconElement.classList.add('bookmarked');
        } else if (iconElement) {
            iconElement.classList.remove('bookmarked');
        }
        
        // Remove any existing click event listeners to prevent duplicates
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
        
        newIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Get the bookmark icon element (could be the span or the i element)
            const bookmarkIcon = e.target.closest('.bookmark-icon');
            if (!bookmarkIcon) return;
            
            const messageIndex = parseInt(bookmarkIcon.dataset.messageIndex);
            if (isNaN(messageIndex)) return;
            
            // Toggle bookmark status
            const isBookmarked = isMessageBookmarked(messageIndex);
            toggleMessageBookmark(messageIndex, !isBookmarked);
        });
    });
}

// Helper function to get the complete message content for copying, including thinking content
function getFullMessageContent(message) {
    if (!message) return '';
    
    // For Claude thinking models, we need to get the raw content before removing <think> tags
    if (typeof isClaudeThinkingModel === 'function' && isClaudeThinkingModel(message)) {
        let content = '';
        
        // Get the full content with thinking tags intact
        if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
            content = message.parts.join('\n');
        } else if (typeof message.content === 'string') {
            content = message.content;
        } else if (message.content && message.content.parts && Array.isArray(message.content.parts)) {
            content = message.content.parts.join('\n');
        } else if (message.content && message.content.text) {
            content = message.content.text;
        }
        
        return content;
    }
    
    // For other messages, use the standard content extraction
    return extractMessageContent(message);
}

// Set up event listeners for copy icons
function setupCopyIcons() {
    document.querySelectorAll('.copy-icon').forEach(icon => {
        // Remove any existing click event listeners to prevent duplicates
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
        
        newIcon.addEventListener('click', async (e) => {
            // Get the copy icon element (could be the span or the i element)
            const copyIcon = e.target.closest('.copy-icon');
            if (!copyIcon) return;
            
            const messageIndex = parseInt(copyIcon.dataset.messageIndex);
            if (isNaN(messageIndex)) return;
            
            try {
                // Get the original message content with thinking content intact
                const message = messageList[messageIndex];
                const originalContent = getFullMessageContent(message);
                
                // Copy to clipboard
                await navigator.clipboard.writeText(originalContent);
                
                // Visual feedback - add 'copied' class for animation
                copyIcon.classList.add('copied');
                
                // Remove the class after animation completes
                setTimeout(() => {
                    copyIcon.classList.remove('copied');
                }, 1000);
                
                console.log('Message copied to clipboard');
            } catch (error) {
                console.error('Error copying to clipboard:', error);
            }
            
            // Don't bubble up to parent elements
            e.stopPropagation();
        });
    });
} 