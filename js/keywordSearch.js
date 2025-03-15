// Global variables for search
let lastSearchTerm = ''; // Store the last search term
let lastSearchResults = []; // Store the last search results

// Keyword search implementation
function executeKeywordSearch(searchTerm) {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    const results = [];
    
    // Search through all messages
    for (let i = 0; i < messageList.length; i++) {
        const message = messageList[i];
        const content = extractSearchableContent(message).toLowerCase();
        
        if (content.includes(lowercaseSearchTerm)) {
            // Get role information
            const role = message.author?.role || message.role || 'unknown';
            const name = message.author?.name || '';
            
            // Extract a snippet around the search term
            const snippetStart = Math.max(0, content.indexOf(lowercaseSearchTerm) - 50);
            const snippetEnd = Math.min(content.length, content.indexOf(lowercaseSearchTerm) + lowercaseSearchTerm.length + 100);
            let snippet = content.substring(snippetStart, snippetEnd);
            
            // Add ellipsis if snippet is truncated
            if (snippetStart > 0) snippet = '...' + snippet;
            if (snippetEnd < content.length) snippet += '...';
            
            // Highlight the search term
            const highlightedSnippet = snippet.replace(
                new RegExp(lowercaseSearchTerm, 'gi'), 
                match => `<span class="search-highlight">${match}</span>`
            );
            
            results.push({
                index: i,
                role: role,
                name: name,
                snippet: highlightedSnippet
            });
        }
    }
    
    return results;
}

// Display search results in the UI
function displaySearchResults(results, isPreviousSearch = false) {
    if (results.length > 0) {
        const searchTypeText = isSemanticSearch ? ' (semantic search)' : '';
        const savedResultsText = isPreviousSearch ? ' - Previously saved results' : '';
        searchResultCount.textContent = `Found ${results.length} result${results.length > 1 ? 's' : ''}${searchTypeText}${savedResultsText}`;
        
        let html = '';
        for (const result of results) {
            const similarityText = result.similarity ? 
                ` • Relevance: ${Math.round(result.similarity * 100)}%` : '';
            
            html += `
                <div class="search-result-item" data-index="${result.index}" data-role="${result.role}">
                    <div class="search-result-header">
                        <span>Message ${result.index + 1} • ${result.role}${result.name ? ' (' + result.name + ')' : ''}${similarityText}</span>
                    </div>
                    <div class="search-result-content">${result.snippet}</div>
                </div>
            `;
        }
        
        // Add debug information for semantic search
        if (isSemanticSearch) {
            html += `
                <div style="margin-top: 20px; padding: 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">
                    <h4 style="margin-top: 0;">Semantic Search Information</h4>
                    <p>Results shown have a semantic similarity score of at least 30%. If you're not seeing expected results:</p>
                    <ul>
                        <li>Try using different related terms in your search</li>
                        <li>Click "Regenerate Embeddings" to refresh the semantic index</li>
                        <li>Switch to keyword search for exact text matching</li>
                    </ul>
                </div>
            `;
        }
        
        searchResults.innerHTML = html;
        
        // Add click event to results
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const role = item.dataset.role;
                
                // Always display the exact message index that was clicked
                // This maintains the ability to navigate to any message directly from search
                // While our arrow navigation will still jump between user messages
                displayMessage(index);
                
                searchModal.style.display = 'none';
            });
        });
    } else {
        searchResultCount.textContent = `No results found${isSemanticSearch ? ' (semantic search)' : ''}`;
        let noResultsMessage = '<p>No matches found for your search term.</p>';
        
        // Add suggestions for semantic search
        if (isSemanticSearch) {
            noResultsMessage += `
                <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">
                    <h4 style="margin-top: 0;">Suggestions</h4>
                    <ul>
                        <li>Try different terminology or related concepts</li>
                        <li>Try the keyword search for exact matches</li>
                        <li>Regenerate embeddings to improve search quality</li>
                    </ul>
                </div>
            `;
        }
        
        searchResults.innerHTML = noResultsMessage;
    }
}

// Main search function
async function executeSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm || !messageList || messageList.length === 0) {
        searchResults.innerHTML = '<p>No results found.</p>';
        searchResultCount.textContent = '';
        lastSearchTerm = '';
        lastSearchResults = [];
        return;
    }
    
    // Store the search term for later use
    lastSearchTerm = searchTerm;
    
    let results = [];
    
    if (isSemanticSearch && modelLoaded) {
        results = await executeSemanticSearch(searchTerm);
    } else {
        results = executeKeywordSearch(searchTerm.toLowerCase());
    }

    // Store the results for later use
    lastSearchResults = results;
    
    // Display results
    displaySearchResults(results);
} 