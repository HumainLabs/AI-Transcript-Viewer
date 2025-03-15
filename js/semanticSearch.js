// Semantic search variables
let isSemanticSearch = false;
let useModel = null;
let messageEmbeddings = [];
let modelLoaded = false;
let isModelLoading = false;

// Load the Universal Sentence Encoder model
async function loadModel() {
    isModelLoading = true;
    modelLoadingElement.style.display = 'block';
    regenerateEmbeddingsBtn.style.display = 'none';
    progressBarFill.style.width = '20%';
    
    try {
        // Load the model
        useModel = await use.load();
        modelLoaded = true;
        isModelLoading = false;
        
        progressBarFill.style.width = '100%';
        
        // Generate embeddings for all messages if there are messages loaded
        if (messageList && messageList.length > 0) {
            await generateEmbeddings();
            // Show regenerate button after embeddings are generated
            regenerateEmbeddingsBtn.style.display = 'block';
        }
        
        // Hide loading indicator after a short delay
        setTimeout(() => {
            if (!isSemanticSearch) {
                modelLoadingElement.style.display = 'none';
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error loading semantic search model:', error);
        modelLoadingElement.innerHTML = `<p>Error loading model: ${error.message}</p>`;
        isModelLoading = false;
        isSemanticSearch = false;
        keywordSearchBtn.classList.add('active');
        semanticSearchBtn.classList.remove('active');
    }
}

// Calculate cosine similarity between two embedding vectors
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
}

// Function to find similar messages based on a message index
async function findSimilarMessages(messageIndex) {
    if (!modelLoaded) {
        // Load model if not already loaded
        await loadModel();
    }
    
    // Make sure we have embeddings
    if (messageEmbeddings.length === 0 || messageIndex >= messageList.length) {
        return [];
    }
    
    // Find the embedding for the reference message
    const referenceEmbeddingObj = messageEmbeddings.find(item => item.index === messageIndex);
    
    if (!referenceEmbeddingObj) {
        console.error('Could not find embedding for message index:', messageIndex);
        return [];
    }
    
    const referenceEmbedding = referenceEmbeddingObj.embedding;
    
    // Calculate similarity scores for each message
    const results = messageEmbeddings.map(item => {
        // Skip comparing to itself
        if (item.index === messageIndex) {
            return { index: item.index, similarity: 0 };
        }
        
        const similarity = cosineSimilarity(referenceEmbedding, item.embedding);
        const message = messageList[item.index];
        
        // Get role information
        const role = message.author?.role || message.role || 'unknown';
        const name = message.author?.name || '';
        
        // Extract content to display in results
        const content = extractSearchableContent(message);
        
        // Create snippet
        let snippet = content.substring(0, 200);
        if (content.length > 200) snippet += '...';
        
        return {
            index: item.index,
            role: role,
            name: name,
            similarity: similarity,
            snippet: snippet
        };
    });
    
    // Sort by similarity (descending) and filter out low similarities
    const filteredResults = results
        .filter(item => item.similarity > 0.5) // Higher threshold for message similarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20); // Limit results
    
    return filteredResults;
}

// Semantic search implementation
async function executeSemanticSearch(searchTerm) {
    modelLoadingElement.style.display = 'block';
    progressBarFill.style.width = '50%';
    
    try {
        // Generate embedding for the search term
        const searchEmbedding = await useModel.embed([searchTerm]);
        const searchVector = await searchEmbedding.data();
        
        progressBarFill.style.width = '75%';
        
        // Calculate similarity scores for each message
        const results = messageEmbeddings.map(item => {
            const similarity = cosineSimilarity(searchVector, item.embedding);
            const messageIndex = item.index;
            const message = messageList[messageIndex];
            
            // Get role information
            const role = message.author?.role || message.role || 'unknown';
            const name = message.author?.name || '';
            
            // Extract content to display in results
            const content = extractSearchableContent(message);
            
            // Create snippet (just take the first 150 chars for semantic search)
            let snippet = content.substring(0, 200);
            if (content.length > 200) snippet += '...';
            
            return {
                index: messageIndex,
                role: role,
                name: name,
                similarity: similarity,
                snippet: snippet
            };
        });
        
        // Sort by similarity (descending)
        const filteredResults = results
            .filter(item => item.similarity > 0.3) // Lower threshold to include more results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 30); // Increase limit to show more results
        
        progressBarFill.style.width = '100%';
        
        // Hide loading indicator after a short delay
        setTimeout(() => {
            modelLoadingElement.style.display = 'none';
        }, 300);
        
        return filteredResults;
        
    } catch (error) {
        console.error('Error in semantic search:', error);
        modelLoadingElement.style.display = 'none';
        
        // Fall back to keyword search
        alert('Error in semantic search. Falling back to keyword search.');
        isSemanticSearch = false;
        keywordSearchBtn.classList.add('active');
        semanticSearchBtn.classList.remove('active');
        
        return executeKeywordSearch(searchTerm.toLowerCase());
    }
} 