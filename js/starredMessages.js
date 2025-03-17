// Global variables for bookmarked and starred messages
let bookmarkedMessages = new Set();
let starredMessages = new Set();
let starredMessagesDropdown;
// Keep track of the last bookmarked message index we navigated to
let lastBookmarkedMessageIndex = -1;

// Initialize bookmarked and starred messages functionality
document.addEventListener('DOMContentLoaded', () => {
    // Get dropdown element reference
    starredMessagesDropdown = document.getElementById('starred-messages-dropdown');
    
    setupBookmarkedMessagesKeyboardNavigation();
    
    // Add event listener to dropdown
    starredMessagesDropdown.addEventListener('change', () => {
        const selectedIndex = starredMessagesDropdown.value;
        if (selectedIndex !== '') {
            const messageIndex = parseInt(selectedIndex);
            
            // In three-message view, if the selected message is from the assistant,
            // display the previous message so that the assistant message appears in the center panel
            const selectedMessage = messageList[messageIndex];
            const role = selectedMessage.author?.role || selectedMessage.role || '';
            
            if (role === 'assistant' && messageIndex > 0) {
                // Display the user message before it, which will put the assistant message in the center
                displayMessage(messageIndex - 1);
            } else {
                // For other roles, display normally
                displayMessage(messageIndex);
            }
            
            // Reset dropdown to placeholder option after navigation
            setTimeout(() => { starredMessagesDropdown.selectedIndex = 0; }, 100);
        }
    });
    
    // Listen for file input changes to initialize messages for new files
    document.getElementById('transcript-file').addEventListener('change', () => {
        // Clear bookmarked and starred messages when loading a new file
        bookmarkedMessages = new Set();
        starredMessages = new Set();
    });
    
    // Add event listener for the copy starred messages button
    const copyStarredBtn = document.getElementById('copy-starred-btn');
    if (copyStarredBtn) {
        copyStarredBtn.addEventListener('click', copyStarredMessagesToClipboard);
    }
});

// Initialize bookmarked and starred messages from localStorage
function initializeStarredMessages() {
    try {
        const currentFilename = fileInput?.files[0]?.name;
        
        if (!currentFilename) {
            console.warn('No file loaded, cannot initialize bookmarked and starred messages');
            return;
        }
        
        console.log(`Initializing bookmarked and starred messages for file: ${currentFilename}`);
        
        // Initialize bookmarked messages
        const bookmarkStorageKey = `bookmarked_messages_${currentFilename}`;
        const savedBookmarkedMessages = localStorage.getItem(bookmarkStorageKey);
        
        // Clear current bookmarked messages
        bookmarkedMessages = new Set();
        
        // Load saved bookmarked messages if available
        if (savedBookmarkedMessages) {
            try {
                const parsedBookmarkedMessages = JSON.parse(savedBookmarkedMessages);
                if (Array.isArray(parsedBookmarkedMessages)) {
                    console.log(`Loaded ${parsedBookmarkedMessages.length} bookmarked messages from localStorage`);
                    // Convert string indices to numbers and add to set
                    parsedBookmarkedMessages.forEach(index => {
                        bookmarkedMessages.add(Number(index));
                    });
                    updateBookmarkedMessagesDropdown();
                }
            } catch (error) {
                console.error('Error parsing bookmarked messages from localStorage:', error);
            }
        } else {
            console.log('No saved bookmarked messages found for this file');
        }
        
        // Initialize starred messages
        const starStorageKey = `starred_messages_${currentFilename}`;
        const savedStarredMessages = localStorage.getItem(starStorageKey);
        
        // Clear current starred messages
        starredMessages = new Set();
        
        // Load saved starred messages if available
        if (savedStarredMessages) {
            try {
                const parsedStarredMessages = JSON.parse(savedStarredMessages);
                if (Array.isArray(parsedStarredMessages)) {
                    console.log(`Loaded ${parsedStarredMessages.length} starred messages from localStorage`);
                    // Convert string indices to numbers and add to set
                    parsedStarredMessages.forEach(index => {
                        starredMessages.add(Number(index));
                    });
                }
            } catch (error) {
                console.error('Error parsing starred messages from localStorage:', error);
            }
        } else {
            console.log('No saved starred messages found for this file');
        }
        
        // Update UI with loaded bookmarks and stars
        updateMessageDisplay();
    } catch (error) {
        console.error('Error initializing bookmarked and starred messages:', error);
    }
}

// Save bookmarked messages to localStorage
function saveBookmarkedMessages() {
    const currentFilename = fileInput?.files[0]?.name;
    
    if (currentFilename) {
        const storageKey = `bookmarked_messages_${currentFilename}`;
        const bookmarkedMessagesArray = Array.from(bookmarkedMessages);
        localStorage.setItem(storageKey, JSON.stringify(bookmarkedMessagesArray));
    }
}

// Save starred messages to localStorage
function saveStarredMessages() {
    const currentFilename = fileInput?.files[0]?.name;
    
    if (currentFilename) {
        const storageKey = `starred_messages_${currentFilename}`;
        const starredMessagesArray = Array.from(starredMessages);
        localStorage.setItem(storageKey, JSON.stringify(starredMessagesArray));
    }
}

// Check if a message is bookmarked
function isMessageBookmarked(messageIndex) {
    return bookmarkedMessages.has(messageIndex);
}

// Check if a message is starred
function isMessageStarred(messageIndex) {
    return starredMessages.has(messageIndex);
}

// Toggle a message's bookmarked status
function toggleMessageBookmark(messageIndex, bookmarked = true) {
    // Update our data model
    if (bookmarked) {
        bookmarkedMessages.add(messageIndex);
    } else {
        bookmarkedMessages.delete(messageIndex);
    }
    
    // Update the icon class directly without rerendering
    document.querySelectorAll(`.bookmark-icon[data-message-index="${messageIndex}"] i`).forEach(icon => {
        if (bookmarked) {
            icon.classList.add('bookmarked');
        } else {
            icon.classList.remove('bookmarked');
        }
    });
    
    // Update bookmarked boxes visual styling
    updateMessageBoxBookmarkedStatus();
    
    // Update the dropdown menu
    updateBookmarkedMessagesDropdown();
    
    // Save to localStorage
    saveBookmarkedMessages();
}

// Toggle a message's starred status
function toggleMessageStar(messageIndex, starred = true) {
    // Update our data model
    if (starred) {
        starredMessages.add(messageIndex);
    } else {
        starredMessages.delete(messageIndex);
    }
    
    // Update the icon class directly without rerendering
    document.querySelectorAll(`.star-icon[data-message-index="${messageIndex}"] i`).forEach(icon => {
        if (starred) {
            icon.classList.add('starred');
        } else {
            icon.classList.remove('starred');
        }
    });
    
    // Save to localStorage
    saveStarredMessages();
}

// Update the message display to reflect current bookmarked and starred status
function updateMessageDisplay() {
    // Update message box status
    updateMessageBoxBookmarkedStatus();
    
    // Update dropdown
    updateBookmarkedMessagesDropdown();
}

// Update bookmarked status on message boxes in three-message view
function updateMessageBoxBookmarkedStatus() {
    // Three-message view is always active now
    // Get container elements
    const previousBox = document.querySelector('.message-box.previous');
    const currentBox = document.querySelector('.message-box.current');
    const nextBox = document.querySelector('.message-box.next');
    
    // Reset bookmarked message class
    previousBox.classList.remove('bookmarked-message');
    currentBox.classList.remove('bookmarked-message');
    nextBox.classList.remove('bookmarked-message');
    
    // Check if each visible message is bookmarked and update accordingly
    if (isMessageBookmarked(currentMessageIndex)) {
        previousBox.classList.add('bookmarked-message');
    }
    
    const nextMessageIndex = Math.min(currentMessageIndex + 1, messageList.length - 1);
    if (nextMessageIndex >= 0 && isMessageBookmarked(nextMessageIndex)) {
        currentBox.classList.add('bookmarked-message');
    }
    
    const followingMessageIndex = Math.min(currentMessageIndex + 2, messageList.length - 1);
    if (followingMessageIndex >= 0 && isMessageBookmarked(followingMessageIndex)) {
        nextBox.classList.add('bookmarked-message');
    }
}

// Update the dropdown with bookmarked messages
function updateBookmarkedMessagesDropdown() {
    // Clear existing options, keeping only the placeholder
    while (starredMessagesDropdown.options.length > 1) {
        starredMessagesDropdown.remove(1);
    }
    
    // No bookmarked messages? Nothing to do
    if (bookmarkedMessages.size === 0) {
        return;
    }
    
    // Sort bookmarked messages by index
    const sortedBookmarkedMessages = Array.from(bookmarkedMessages).sort((a, b) => a - b);
    
    // Add options for each bookmarked message
    for (const index of sortedBookmarkedMessages) {
        if (index >= 0 && index < messageList.length) {
            const message = messageList[index];
            const role = message.author?.role || message.role || 'unknown';
            
            // Create a preview of message content
            const content = extractSearchableContent(message).substring(0, 30) + 
                (extractSearchableContent(message).length > 30 ? '...' : '');
            
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `#${index + 1} (${role}): ${content}`;
            
            starredMessagesDropdown.appendChild(option);
        }
    }
}

// Navigate to next or previous bookmarked message
function navigateBookmarkedMessages(direction) {
    if (!messageList || messageList.length === 0 || bookmarkedMessages.size === 0) {
        console.log("No messages or no bookmarked messages to navigate through");
        return;
    }
    
    // Convert to array and sort
    const bookmarkedArray = Array.from(bookmarkedMessages).sort((a, b) => a - b);
    console.log(`Navigating ${direction}. Current index: ${currentMessageIndex}, Last bookmarked: ${lastBookmarkedMessageIndex}, Available bookmarked: ${bookmarkedArray.join(', ')}`);
    
    // If we haven't navigated to a bookmarked message yet or we're at a non-bookmarked message,
    // use the current display index as reference
    const referenceIndex = (lastBookmarkedMessageIndex >= 0 && isMessageBookmarked(lastBookmarkedMessageIndex)) 
        ? lastBookmarkedMessageIndex 
        : currentMessageIndex;
        
    // Find the current position in the bookmarked messages array
    let targetIndex = -1;
    
    if (direction === 'next') {
        // Find the first bookmarked message that has an index greater than reference
        for (let i = 0; i < bookmarkedArray.length; i++) {
            if (bookmarkedArray[i] > referenceIndex) {
                targetIndex = bookmarkedArray[i];
                console.log(`Found next bookmarked message at index ${targetIndex}`);
                break;
            }
        }
        
        // If no next bookmarked message found, loop to the beginning
        if (targetIndex === -1) {
            targetIndex = bookmarkedArray[0];
            console.log(`No next bookmarked message found, looping to first at index ${targetIndex}`);
        }
    } else if (direction === 'prev') {
        // Find the last bookmarked message that has an index less than reference
        for (let i = bookmarkedArray.length - 1; i >= 0; i--) {
            if (bookmarkedArray[i] < referenceIndex) {
                targetIndex = bookmarkedArray[i];
                console.log(`Found previous bookmarked message at index ${targetIndex}`);
                break;
            }
        }
        
        // If no previous bookmarked message found, loop to the end
        if (targetIndex === -1) {
            targetIndex = bookmarkedArray[bookmarkedArray.length - 1];
            console.log(`No previous bookmarked message found, looping to last at index ${targetIndex}`);
        }
    }
    
    if (targetIndex !== -1) {
        console.log(`Navigating to bookmarked message at index ${targetIndex}`);
        // Update the last bookmarked message we navigated to
        lastBookmarkedMessageIndex = targetIndex;
        navigateToBookmarkedMessage(targetIndex);
    } else {
        console.error("Failed to find target message index for navigation");
    }
}

// Helper function to navigate to bookmarked message with role-based adjustment
function navigateToBookmarkedMessage(messageIndex) {
    // In three-message view, if the selected message is from the assistant,
    // display the previous message so that the assistant message appears in the center panel
    const selectedMessage = messageList[messageIndex];
    const role = selectedMessage.author?.role || selectedMessage.role || '';
    
    if (role === 'assistant' && messageIndex > 0) {
        // Display the user message before it, which will put the assistant message in the center
        console.log(`Showing assistant message ${messageIndex} by displaying index ${messageIndex - 1}`);
        displayMessage(messageIndex - 1);
    } else {
        // For other roles, display normally
        displayMessage(messageIndex);
    }
}

// Set up keyboard shortcuts for navigating bookmarked messages
function setupBookmarkedMessagesKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        // Skip navigation if an input element is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' || 
            document.activeElement.isContentEditable) {
            return;
        }
        
        // F key for previous bookmarked message
        if (event.key === 'f' || event.key === 'F') {
            navigateBookmarkedMessages('prev');
            event.preventDefault();
        }
        
        // J key for next bookmarked message
        if (event.key === 'j' || event.key === 'J') {
            navigateBookmarkedMessages('next');
            event.preventDefault();
        }
    });
}

// Copy all starred messages to clipboard as JSON
function copyStarredMessagesToClipboard() {
    if (!messageList || messageList.length === 0 || starredMessages.size === 0) {
        alert("No starred messages to copy!");
        return;
    }
    
    // Sort starred messages by index to maintain order
    const sortedStarredIndices = Array.from(starredMessages).sort((a, b) => a - b);
    
    // Create an array of starred messages with role and content
    const starredMessagesContent = sortedStarredIndices.map(index => {
        const message = messageList[index];
        
        // Determine the role of the message
        let role;
        if (message.author && message.author.role) {
            role = message.author.role;
        } else if (message.role) {
            role = message.role;
        } else {
            role = 'unknown';
        }
        
        // Get the full content of the message
        const content = getFullMessageContent(message);
        
        // Return an object with role, content, and message number
        return {
            messageNumber: index + 1,
            role: role,
            content: content
        };
    });
    
    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(starredMessagesContent, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonString)
        .then(() => {
            // Visual feedback
            const copyBtn = document.getElementById('copy-starred-btn');
            const originalTitle = copyBtn.getAttribute('title');
            
            // Change icon to check mark temporarily
            const icon = copyBtn.querySelector('i');
            icon.classList.remove('fa-copy');
            icon.classList.add('fa-check');
            copyBtn.setAttribute('title', 'Copied!');
            
            // Reset after 2 seconds
            setTimeout(() => {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-copy');
                copyBtn.setAttribute('title', originalTitle);
            }, 2000);
            
            console.log(`Copied ${starredMessagesContent.length} starred messages to clipboard`);
        })
        .catch(err => {
            console.error('Failed to copy starred messages:', err);
            alert('Failed to copy messages to clipboard. See console for details.');
        });
} 