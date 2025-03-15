// Global variables
let transcript = null;
let messageList = [];
let currentMessageIndex = 0;
let totalTokenCount = 0;
let detectedModel = 'unknown'; // Track which model the transcript is from

// DOM elements
const fileInput = document.getElementById('transcript-file');
const messageContainer = document.getElementById('message-container');
const previousMessageContainer = document.getElementById('previous-message-container');
const currentMessageContainer = document.getElementById('current-message-container');
const nextMessageContainer = document.getElementById('next-message-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentIndexSpan = document.getElementById('current-index');
const totalMessagesSpan = document.getElementById('total-messages');
const tokenStatsSpan = document.getElementById('token-stats');
const metadataContainer = document.getElementById('metadata-container');
const threeMessageContainer = document.getElementById('three-message-container');
const gotoMessageBtn = document.getElementById('goto-message-btn');

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    setupEventListeners();
});

// Set up initial UI state
function initializeUI() {
    // Update buttons to indicate they jump between user messages
    prevBtn.textContent = "Previous User Message (←)";
    nextBtn.textContent = "Next User Message (→)";
    
    // Initialize the view state - always use three-pane view
    threeMessageContainer.classList.add('active');
}

// Set up event listeners
function setupEventListeners() {
    // File input change handler
    fileInput.addEventListener('change', handleFileSelection);
    
    // Navigation buttons
    prevBtn.addEventListener('click', () => navigateByOneMessage('prev'));
    nextBtn.addEventListener('click', () => navigateByOneMessage('next'));
    
    // Goto message button
    gotoMessageBtn.addEventListener('click', promptGotoMessage);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyNavigation);
}

// Prompt user to enter a message number
function promptGotoMessage() {
    if (!messageList || messageList.length === 0) {
        alert("No transcript loaded. Please load a transcript first.");
        return;
    }
    
    const totalMessages = messageList.length;
    const messageNum = prompt(`Enter message number (1-${totalMessages}):`, currentMessageIndex + 1);
    
    if (messageNum === null) {
        // User cancelled
        return;
    }
    
    const messageIndex = parseInt(messageNum) - 1; // Convert to 0-indexed
    
    if (isNaN(messageIndex) || messageIndex < 0 || messageIndex >= totalMessages) {
        alert(`Please enter a valid number between 1 and ${totalMessages}.`);
        return;
    }
    
    // Go to the message
    displayMessage(messageIndex);
}

// Handle file selection
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                processTranscript(data);
                
                // Find first user message if not already on one
                if (messageList.length > 0) {
                    const firstMessage = messageList[0];
                    const firstRole = firstMessage.author?.role || firstMessage.role;
                    
                    if (firstRole !== 'user') {
                        // Try to find the first user message
                        const firstUserIndex = findNextUserMessageIndex(-1);
                        if (firstUserIndex > 0) {
                            displayMessage(firstUserIndex);
                        }
                    }
                }
                
                // Set model type based on platform field in transcript
                if (transcript.platform) {
                    const platform = transcript.platform.toLowerCase();
                    
                    if (platform === 'chatgpt' || platform === 'gpt') {
                        detectedModel = 'gpt';
                    } else if (platform === 'claude') {
                        detectedModel = 'claude';
                    } else if (platform === 'palm' || platform === 'gemini') {
                        detectedModel = 'palm';
                    } else if (platform === 'llama') {
                        detectedModel = 'llama';
                    } else {
                        detectedModel = 'unknown';
                    }
                    
                    console.log(`Using model from platform field: ${detectedModel}`);
                }
                
                // Calculate token statistics asynchronously
                try {
                    await calculateTokenStats();
                } catch (error) {
                    console.error('Error calculating tokens:', error);
                }
                
                // If semantic search is enabled and model is loaded, generate embeddings
                if (isSemanticSearch && modelLoaded) {
                    await generateEmbeddings();
                }
                
                // Initialize starred messages for this file
                if (typeof initializeStarredMessages === 'function') {
                    initializeStarredMessages();
                } else {
                    console.warn('Starred messages functionality not available');
                }
                
            } catch (error) {
                messageContainer.innerHTML = `<p>Error parsing JSON: ${error.message}</p>`;
            }
        };
        reader.readAsText(file);
    }
}

// Handle keyboard navigation
function handleKeyNavigation(event) {
    if (event.key === 'ArrowLeft') {
        // Move to previous user message
        navigateToUserMessage('prev');
        event.preventDefault();
    } else if (event.key === 'ArrowRight') {
        // Move to next user message
        navigateToUserMessage('next');
        event.preventDefault();
    } else if (event.key === 'ArrowUp') {
        // Move one message backward
        navigateByOneMessage('prev');
        event.preventDefault();
    } else if (event.key === 'ArrowDown') {
        // Move one message forward
        navigateByOneMessage('next');
        event.preventDefault();
    }
}

// Navigate to previous or next user message
function navigateToUserMessage(direction) {
    if (!messageList || messageList.length === 0) return;
    
    let newIndex = currentMessageIndex;
    
    if (direction === 'prev') {
        // Find the previous user message
        newIndex = findPreviousUserMessageIndex(currentMessageIndex);
        if (newIndex === -1) {
            // If no previous user message, just go to the first message
            newIndex = 0;
        }
    } else if (direction === 'next') {
        // Find the next user message
        newIndex = findNextUserMessageIndex(currentMessageIndex);
        if (newIndex === -1) {
            // If no next user message, just go to the last message
            newIndex = messageList.length - 1;
        }
    }
    
    if (newIndex !== currentMessageIndex) {
        displayMessage(newIndex);
    }
}

// Navigate one message at a time
function navigateByOneMessage(direction) {
    if (!messageList || messageList.length === 0) return;
    
    let newIndex = currentMessageIndex;
    
    if (direction === 'prev') {
        // Move back one message
        newIndex = Math.max(0, currentMessageIndex - 1);
    } else if (direction === 'next') {
        // Move forward one message
        newIndex = Math.min(messageList.length - 1, currentMessageIndex + 1);
    }
    
    if (newIndex !== currentMessageIndex) {
        displayMessage(newIndex);
    }
}

// Calculate token statistics for the transcript
async function calculateTokenStats() {
    if (!messageList || messageList.length === 0) {
        tokenStatsSpan.textContent = '0 tokens';
        return;
    }
    
    // Reset token count
    totalTokenCount = 0;
    let userTokens = 0;
    let assistantTokens = 0;
    let systemTokens = 0;
    let otherTokens = 0;
    
    // Show loading indicator in the token stats
    tokenStatsSpan.textContent = 'Calculating tokens...';
    tokenStatsSpan.title = 'Calculating token counts...';
    
    try {
        let processingErrors = 0;
        let processedMessages = 0;
        
        // Process each message to count tokens based on the detected model
        for (const message of messageList) {
            try {
                const content = extractMessageContent(message);
                if (content && content !== "[no message]") {
                    const messageTokens = await getTokenCount(content, detectedModel);
                    totalTokenCount += messageTokens;
                    processedMessages++;
                    
                    // Track tokens by role
                    const role = message.author?.role || message.role || 'unknown';
                    if (role === 'user' || role === 'human') {
                        userTokens += messageTokens;
                    } else if (role === 'assistant') {
                        assistantTokens += messageTokens;
                    } else if (role === 'system') {
                        systemTokens += messageTokens;
                    } else {
                        otherTokens += messageTokens;
                    }
                }
            } catch (messageError) {
                console.error('Error processing message for token count:', messageError);
                processingErrors++;
            }
        }
        
        // Format number with commas
        const formattedCount = totalTokenCount.toLocaleString();
        
        // Basic output for the token stats display
        tokenStatsSpan.textContent = `${formattedCount} tokens (${detectedModel})`;
        
        // Add warning indicator if there were processing errors
        if (processingErrors > 0) {
            tokenStatsSpan.textContent += ' ⚠️';
        }
        
        // Detailed breakdown for the tooltip
        const userFormatted = userTokens.toLocaleString();
        const assistantFormatted = assistantTokens.toLocaleString();
        const systemFormatted = systemTokens.toLocaleString();
        const otherFormatted = otherTokens.toLocaleString();
        
        // Set a detailed tooltip with token breakdown
        let tooltipText = 
            `Total: ${formattedCount} tokens\n` +
            `Model: ${detectedModel}\n` +
            `User: ${userFormatted}\n` +
            `Assistant: ${assistantFormatted}\n` +
            `System: ${systemFormatted}\n` +
            `Other: ${otherFormatted}`;
            
        // Add error info if applicable
        if (processingErrors > 0) {
            tooltipText += `\n\nNote: Encountered errors while processing ${processingErrors} messages`;
        }
        
        tooltipText += `\n\nClick to refresh token counts`;
        tokenStatsSpan.title = tooltipText;
            
        // Make the token stats clickable to refresh counts
        tokenStatsSpan.style.cursor = 'pointer';
        if (!tokenStatsSpan.hasClickListener) {
            tokenStatsSpan.addEventListener('click', async () => {
                const confirmRefresh = confirm('Refresh token counts?\nThis will clear the token cache and recalculate all counts.');
                if (confirmRefresh) {
                    if (typeof clearTokenCache === 'function') {
                        clearTokenCache();
                    }
                    await calculateTokenStats();
                }
            });
            tokenStatsSpan.hasClickListener = true;
        }
        
        // Log stats to console
        console.log(`Token calculation complete: ${formattedCount} tokens from ${processedMessages} messages`);
        if (processingErrors > 0) {
            console.warn(`Token calculation had ${processingErrors} errors`);
        }
    } catch (error) {
        console.error('Error calculating tokens:', error);
        tokenStatsSpan.textContent = 'Error calculating tokens ⚠️';
        tokenStatsSpan.title = 'Error: ' + error.message + '\n\nClick to try again';
    }
}