// Generate embeddings for all messages
async function generateEmbeddings(forceRegenerate = false) {
    if (!useModel) return;
    
    // Check localStorage for cached embeddings if not forcing regeneration
    const currentFilename = fileInput.files[0]?.name;
    const storageKey = currentFilename ? `embeddings_${currentFilename}` : null;
    
    if (!forceRegenerate && storageKey) {
        try {
            const cachedEmbeddings = localStorage.getItem(storageKey);
            if (cachedEmbeddings) {
                const parsedEmbeddings = JSON.parse(cachedEmbeddings);
                // Verify that cached embeddings match current message list length
                if (parsedEmbeddings.length === messageList.length) {
                    console.log('Using embeddings from localStorage');
                    messageEmbeddings = parsedEmbeddings;
                    progressBarFill.style.width = '100%';
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading embeddings from localStorage:', error);
        }
    }
    
    // Skip if we already have embeddings and not forcing regeneration
    if (messageEmbeddings.length > 0 && messageEmbeddings.length === messageList.length && !forceRegenerate) {
        console.log('Using existing embeddings');
        return;
    }
    
    messageEmbeddings = [];
    progressBarFill.style.width = '50%';
    
    // Extract content from each message
    const contentArray = messageList.map(message => extractSearchableContent(message));
    
    try {
        // Generate embeddings in batches to avoid memory issues
        const batchSize = 50;
        for (let i = 0; i < contentArray.length; i += batchSize) {
            const batch = contentArray.slice(i, i + batchSize);
            const embeddings = await useModel.embed(batch);
            
            // Store embeddings with message indices
            for (let j = 0; j < batch.length; j++) {
                const embedding = await embeddings.slice([j, 0], [1, -1]).data();
                messageEmbeddings.push({
                    index: i + j,
                    embedding: embedding
                });
            }
            
            // Update progress bar
            const progress = Math.min(90, 50 + Math.floor(40 * (i + batchSize) / contentArray.length));
            progressBarFill.style.width = `${progress}%`;
        }
        
        progressBarFill.style.width = '100%';
        console.log(`Generated ${messageEmbeddings.length} embeddings`);
        
        // Save embeddings to localStorage if we have a filename
        if (storageKey) {
            try {
                // Compress embeddings to save space
                const compressedEmbeddings = compressEmbeddings(messageEmbeddings);
                localStorage.setItem(storageKey, JSON.stringify(compressedEmbeddings));
                console.log('Saved embeddings to localStorage');
            } catch (error) {
                console.error('Error saving embeddings to localStorage:', error);
                // If localStorage quota exceeded, try more aggressive compression
                if (error.name === 'QuotaExceededError') {
                    try {
                        // Try more aggressive compression
                        const aggressiveCompressedEmbeddings = compressEmbeddings(messageEmbeddings, true);
                        localStorage.setItem(storageKey, JSON.stringify(aggressiveCompressedEmbeddings));
                        console.log('Saved embeddings with aggressive compression');
                    } catch (compressError) {
                        console.error('Error saving with compressed embeddings:', compressError);
                        clearOldEmbeddings(storageKey);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error generating embeddings:', error);
        modelLoadingElement.innerHTML = `<p>Error generating embeddings: ${error.message}</p>`;
    }
}

// Compress embeddings to reduce storage size
function compressEmbeddings(embeddings, aggressive = false) {
    return embeddings.map(item => {
        // Create a compressed copy with reduced precision
        const precision = aggressive ? 2 : 4; // Digits after decimal point
        const multiplier = Math.pow(10, precision);
        
        const compressedEmbedding = Array.from(item.embedding).map(value => 
            Math.round(value * multiplier) / multiplier
        );
        
        return {
            index: item.index,
            embedding: compressedEmbedding
        };
    });
}

// Clear old embeddings from localStorage to make space
function clearOldEmbeddings(currentKey) {
    try {
        // Get all keys from localStorage
        const keys = Object.keys(localStorage);
        // First try clearing all other embedding keys
        keys.forEach(key => {
            if (key.startsWith('embeddings_') && key !== currentKey) {
                localStorage.removeItem(key);
                console.log(`Removed old embeddings: ${key}`);
            }
        });
        
        // Try saving again with super aggressive compression
        if (currentKey && messageEmbeddings.length > 0) {
            try {
                // Try with even more aggressive compression (1 decimal place)
                const superCompressedEmbeddings = messageEmbeddings.map(item => {
                    return {
                        index: item.index,
                        embedding: Array.from(item.embedding).map(value => 
                            Math.round(value * 10) / 10
                        )
                    };
                });
                
                localStorage.setItem(currentKey, JSON.stringify(superCompressedEmbeddings));
                console.log('Saved embeddings with super aggressive compression');
            } catch (error) {
                console.warn('Unable to save embeddings to localStorage even after clearing');
                // If all fails, we just keep the embeddings in memory
            }
        }
    } catch (error) {
        console.error('Error clearing old embeddings:', error);
    }
}

// Variables to track tokenizer loading
let loadedTokenizers = {
    gpt: null,
    claude: null,
    palm: null,
    llama: null
};
let tokenizerLoadPromises = {};

// Function to load a specific tokenizer
async function loadTokenizer(modelType) {
    // If already loaded or loading, return the existing promise
    if (loadedTokenizers[modelType]) {
        return loadedTokenizers[modelType];
    }
    
    if (tokenizerLoadPromises[modelType]) {
        return tokenizerLoadPromises[modelType];
    }
    
    // Create a promise for loading the tokenizer
    tokenizerLoadPromises[modelType] = (async () => {
        try {
            switch (modelType) {
                case 'gpt':
                    // Attempt to load tiktoken if script is included
                    console.log('Loading GPT tokenizer...');
                    
                    // Look for either tiktoken library (WASM or pure JS)
                    if (typeof tiktoken !== 'undefined') {
                        console.log('Using tiktoken (WASM version) for GPT tokenization');
                        
                        try {
                            // Use the GPT-3.5-Turbo/GPT-4 tokenizer (cl100k_base)
                            const encoding = tiktoken.get_encoding('cl100k_base');
                            
                            const gptTokenizer = (text) => {
                                return encoding.encode(text).length;
                            };
                            
                            loadedTokenizers[modelType] = gptTokenizer;
                            return gptTokenizer;
                        } catch (tiktokenError) {
                            console.warn('Error using tiktoken (WASM version):', tiktokenError);
                            // Fall through to check other versions/approximation methods
                        }
                    }
                    
                    // Check for the js-tiktoken library (pure JS version)
                    if (typeof jstiktoken !== 'undefined' || window.jstiktoken) {
                        const jsLib = typeof jstiktoken !== 'undefined' ? jstiktoken : window.jstiktoken;
                        console.log('Using js-tiktoken (pure JS version) for GPT tokenization');
                        
                        try {
                            const encoding = jsLib.get_encoding('cl100k_base');
                            
                            const gptTokenizer = (text) => {
                                return encoding.encode(text).length;
                            };
                            
                            loadedTokenizers[modelType] = gptTokenizer;
                            return gptTokenizer;
                        } catch (jsError) {
                            console.warn('Error using js-tiktoken (pure JS version):', jsError);
                            // Fall through to approximation method
                        }
                    }
                    
                    // If neither version of tiktoken is available or fails, use improved approximation
                    console.log('Using GPT tokenizer approximation (tiktoken not available)');
                    
                    // Improved approximation for GPT models
                    const gptTokenizer = (text) => {
                        // Start with a rough approximation based on characters
                        let baseEstimate = Math.ceil(text.length / 4);
                        
                        // Then adjust based on text characteristics
                        
                        // Count tokens in different text elements
                        const wordCount = text.trim().split(/\s+/).length;
                        // Words are typically ~1.3 tokens each in English for GPT models
                        const wordEstimate = Math.ceil(wordCount * 1.3);
                        
                        // GPT tends to treat spaces as part of the previous word
                        // But newlines and special characters often get their own tokens
                        const newlines = (text.match(/\n/g) || []).length;
                        const codeBlocks = (text.match(/```/g) || []).length / 2;
                        const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
                        
                        // Average the character-based and word-based estimates
                        // and add adjustments for special elements
                        const finalEstimate = Math.ceil((baseEstimate + wordEstimate) / 2) + 
                                            newlines + (codeBlocks * 4) + (specialChars * 0.5);
                        
                        return finalEstimate;
                    };
                    
                    loadedTokenizers[modelType] = gptTokenizer;
                    return gptTokenizer;
                    
                case 'claude':
                    // Claude tokenizer approximation
                    console.log('Loading Claude tokenizer approximation...');
                    
                    const claudeTokenizer = (text) => {
                        // Claude uses a BPE tokenizer similar to GPT but with some differences
                        // Specifically how it handles whitespace and special characters
                        
                        // Get word count for base approximation
                        const wordCount = text.trim().split(/\s+/).length;
                        // Character-based approximation (Claude tends to be slightly more compact than GPT)
                        const charEstimate = Math.ceil(text.length / 3.8);
                        
                        // For Claude, whitespace and formatting can significantly affect token count
                        const newlines = (text.match(/\n/g) || []).length;
                        const codeBlocks = (text.match(/```/g) || []).length / 2;
                        
                        // Count XML/HTML tags which Claude often counts as multiple tokens
                        const xmlTags = (text.match(/<\/?[^>]+(>|$)/g) || []).length;
                        
                        // Count URLs which can have unique tokenization
                        const urls = (text.match(/https?:\/\/[^\s]+/g) || []).length;
                        
                        // Special character adjustments
                        const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
                        
                        // Blend word and character estimates
                        const baseEstimate = (charEstimate + (wordCount * 1.25)) / 2;
                        
                        // Apply adjustments
                        const finalEstimate = baseEstimate + 
                                             (newlines * 0.8) + 
                                             (codeBlocks * 5) + 
                                             (xmlTags * 2) + 
                                             (urls * 5) + 
                                             (specialChars * 0.3);
                        
                        return Math.ceil(finalEstimate);
                    };
                    
                    loadedTokenizers[modelType] = claudeTokenizer;
                    return claudeTokenizer;
                
                case 'palm':
                case 'gemini':
                    // PaLM/Gemini tokenizer approximation
                    console.log('Loading PaLM/Gemini tokenizer approximation...');
                    
                    const palmTokenizer = (text) => {
                        // PaLM/Gemini uses SentencePiece tokenization
                        // This is a rough approximation
                        const wordCount = text.trim().split(/\s+/).length;
                        const charCount = text.length;
                        
                        // Blend character and word-based approximations
                        return Math.ceil((charCount / 4 + wordCount * 1.25) / 2);
                    };
                    
                    loadedTokenizers[modelType] = palmTokenizer;
                    return palmTokenizer;
                    
                case 'llama':
                    // LLaMA tokenizer approximation
                    console.log('Loading LLaMA tokenizer approximation...');
                    
                    const llamaTokenizer = (text) => {
                        // LLaMA uses a byte-level BPE tokenizer
                        // Typically results in slightly higher token counts than GPT for the same text
                        const wordCount = text.trim().split(/\s+/).length;
                        const charCount = text.length;
                        
                        // Blend approaches with LLaMA-specific adjustments
                        return Math.ceil((charCount / 3.6 + wordCount * 1.4) / 2);
                    };
                    
                    loadedTokenizers[modelType] = llamaTokenizer;
                    return llamaTokenizer;
                    
                default:
                    // Default simple tokenizer for unknown models
                    console.log(`No specific tokenizer for ${modelType}, using default approximation`);
                    
                    const defaultTokenizer = (text) => {
                        // Generic approximation for unknown models
                        // Blended approach to be somewhat reasonable across different model types
                        const wordCount = text.trim().split(/\s+/).length;
                        const charCount = text.length;
                        
                        return Math.ceil((charCount / 4 + wordCount * 1.2) / 2);
                    };
                    
                    loadedTokenizers[modelType] = defaultTokenizer;
                    return defaultTokenizer;
            }
        } catch (error) {
            console.error(`Error loading tokenizer for ${modelType}:`, error);
            
            // Return a fallback tokenizer
            const fallbackTokenizer = (text) => {
                return Math.ceil(text.length / 4);
            };
            
            loadedTokenizers[modelType] = fallbackTokenizer;
            return fallbackTokenizer;
        } finally {
            // Clear the promise
            delete tokenizerLoadPromises[modelType];
        }
    })();
    
    return tokenizerLoadPromises[modelType];
}

// Function to get token count using the appropriate tokenizer
async function getTokenCount(text, modelType = 'unknown') {
    if (!text || text === '') return 0;
    
    try {
        // Use cache if available
        const CACHE_VERSION = '1.1'; // Update this when tokenization logic changes
        const cacheKey = `token_${CACHE_VERSION}_${modelType}_${hashString(text)}`;
        
        // Try to get from cache first
        try {
            const cachedCount = sessionStorage.getItem(cacheKey);
            if (cachedCount !== null) {
                return parseInt(cachedCount);
            }
        } catch (cacheError) {
            console.warn('Error accessing token cache:', cacheError);
            // Continue without cache
        }
        
        // Default to a simple approximation for unknown models
        if (modelType === 'unknown' || !modelType) {
            const count = Math.ceil(text.length / 4);
            // Cache the result
            try {
                sessionStorage.setItem(cacheKey, count.toString());
            } catch (e) {
                console.warn('Failed to cache token count', e);
                // Try to clear some space in the cache
                pruneTokenCache();
            }
            return count;
        }
        
        // Load the tokenizer if not already loaded
        const tokenizer = await loadTokenizer(modelType);
        
        // Use the tokenizer
        const count = Math.round(tokenizer(text));
        
        // Cache the result
        try {
            sessionStorage.setItem(cacheKey, count.toString());
        } catch (e) {
            console.warn('Failed to cache token count', e);
            // Try to clear some space in the cache
            pruneTokenCache();
            // Try one more time
            try {
                sessionStorage.setItem(cacheKey, count.toString());
            } catch (retryError) {
                console.warn('Failed to cache token count even after pruning', retryError);
            }
        }
        
        return count;
    } catch (error) {
        console.error('Error counting tokens:', error);
        // Fallback to simple approximation
        return Math.ceil(text.length / 4);
    }
}

// Simple hash function for creating cache keys
function hashString(str) {
    // If the string is very long, use a portion of it plus its length
    if (str.length > 100) {
        // Use first 50 chars, last 50 chars, and length
        const shortStr = str.substring(0, 50) + str.substring(str.length - 50);
        str = shortStr + str.length;
    }
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36); // Convert to base36 to keep it shorter
}

// Helper function to clear the token count cache
function clearTokenCache() {
    try {
        const keys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('token_')) {
                keys.push(key);
            }
        }
        
        keys.forEach(key => sessionStorage.removeItem(key));
        console.log(`Cleared ${keys.length} token cache entries`);
        return keys.length;
    } catch (error) {
        console.error('Error clearing token cache:', error);
        return 0;
    }
}

// Prune the oldest or least important entries from the token cache
function pruneTokenCache(percentToClear = 50) {
    try {
        // Get all token cache keys
        const tokenKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('token_')) {
                tokenKeys.push(key);
            }
        }
        
        if (tokenKeys.length === 0) return 0;
        
        // Calculate how many to remove (default: 50%)
        const removeCount = Math.ceil(tokenKeys.length * (percentToClear / 100));
        
        // Sort by key (which will group by model and version)
        // Then take the first removeCount keys
        const keysToRemove = tokenKeys.sort().slice(0, removeCount);
        
        // Remove the selected keys
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        console.log(`Pruned ${keysToRemove.length} token cache entries to make space`);
        return keysToRemove.length;
    } catch (error) {
        console.error('Error pruning token cache:', error);
        return 0;
    }
}

// Load a JavaScript file dynamically
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
} 