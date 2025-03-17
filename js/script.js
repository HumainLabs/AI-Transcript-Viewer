/**
 * Main Script Module
 * 
 * Initializes platform handlers and sets up event listeners
 */

import { processTranscript, getPlatformHandler } from './platforms/platform-interface.js';
import { generateMessageHTML, updateThreeMessageView, setupMessageIcons } from './platforms/display-helper.js';
import { detectPlatform } from './platforms/platform-utils.js';

// Log that we're using our platform handlers
console.log('Initializing platform handlers for transcript processing');

/**
 * Parse a JSON string safely
 * @param {string} str - The JSON string to parse
 * @returns {object|null} - The parsed object or null
 */
function parseJsonString(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error("Error parsing JSON:", e);
        return null;
    }
}

// Listen for the 'transcript-loaded' event
document.addEventListener('transcript-loaded', function(event) {
    const transcript = event.detail.transcript;
    
    if (transcript) {
        // Process the transcript with our platform handlers
        const processedTranscript = processTranscript(transcript);
        
        console.log('Transcript processed using platform handler for: ' + detectPlatform(processedTranscript));
        
        // Make the processed transcript available globally
        window.currentTranscript = processedTranscript;
    }
});

// Export functions for use in non-module scripts
window.generatePlatformMessageHTML = generateMessageHTML;
window.updatePlatformThreeMessageView = updateThreeMessageView;
window.detectTranscriptPlatform = detectPlatform;
window.getPlatformHandler = getPlatformHandler;
window.setupPlatformMessageIcons = setupMessageIcons;

// Integrate with isMessageStarred and toggleMessageStar functions
document.addEventListener('DOMContentLoaded', () => {
    // Make sure we have starredMessages.js functions available globally
    if (typeof isMessageStarred === 'function') {
        window.isMessageStarred = isMessageStarred;
    }
    if (typeof toggleMessageStar === 'function') {
        window.toggleMessageStar = toggleMessageStar;
    }
    if (typeof isMessageBookmarked === 'function') {
        window.isMessageBookmarked = isMessageBookmarked;
    }
    if (typeof toggleMessageBookmark === 'function') {
        window.toggleMessageBookmark = toggleMessageBookmark;
    }
});

// Dispatch event to notify that platform handlers are ready
document.dispatchEvent(new CustomEvent('platform-handlers-ready', {
    detail: {
        getPlatformHandler: getPlatformHandler
    }
}));

// Main function to process a dropped transcript file
function processTranscriptFile(file) {
    // ... existing code ...
    
    reader.onload = function(e) {
        try {
            let transcript = parseJsonString(e.target.result);
            
            // Use our new platform handler system
            if (transcript) {
                // Process transcript with our handlers
                transcript = processTranscript(transcript);
                
                // Display transcript info
                displayTranscriptInfo(transcript);
                
                // Setup navigation based on processed transcript
                setupNavigation(transcript.messages);
                
                // Display initial messages
                displayMessages(transcript, 0);
            }
        } catch (e) {
            console.error("Error processing transcript:", e);
            displayError("Error processing transcript: " + e.message);
        }
    };
    
    // ... existing code ...
}

// Display transcript information
function displayTranscriptInfo(transcript) {
    // ... existing code ...
    
    // Display platform information 
    const platform = detectPlatform(transcript);
    const platformElement = document.getElementById('transcript-platform');
    if (platformElement) {
        platformElement.textContent = platform;
    }
    
    // ... existing code ...
}

// Display messages function
function displayMessages(transcript, startIndex = 0) {
    // ... existing code ...
    
    // Use our updateThreeMessageView function
    updateThreeMessageView(
        transcript.messages, 
        currentMessageIndex, 
        transcript,
        {
            previousBox,
            currentBox,
            nextBox,
            previousMessageContainer,
            currentMessageContainer,
            nextMessageContainer
        }
    );
    
    // ... existing code ...
}

// ... existing code ... 