// DOM elements for search
const searchBtn = document.getElementById('search-btn');
const searchModal = document.getElementById('search-modal');
const closeModal = document.getElementById('close-modal');
const searchInput = document.getElementById('search-input');
const searchExecute = document.getElementById('search-execute');
const searchResults = document.getElementById('search-results');
const searchResultCount = document.querySelector('.search-result-count');
const keywordSearchBtn = document.getElementById('keyword-search-btn');
const semanticSearchBtn = document.getElementById('semantic-search-btn');
const modelLoadingElement = document.getElementById('model-loading');
const progressBarFill = document.getElementById('progress-bar-fill');
const regenerateEmbeddingsBtn = document.getElementById('regenerate-embeddings');
const clearSearchBtn = document.getElementById('clear-search');

// Initialize search UI
function initializeSearchUI() {
    // Open search modal
    searchBtn.addEventListener('click', () => {
        searchModal.style.display = 'flex';
        
        // Restore previous search term if available
        if (lastSearchTerm) {
            searchInput.value = lastSearchTerm;
        }
        
        // Focus the search input
        searchInput.focus();
        
        // Restore previous search results if available
        if (lastSearchResults.length > 0) {
            displaySearchResults(lastSearchResults, true);  // Add true to indicate these are previously saved results
        }
        
        // If semantic search is selected but model not loaded, load it
        if (isSemanticSearch && !modelLoaded && !isModelLoading) {
            loadModel();
        }
    });

    // Close search modal
    closeModal.addEventListener('click', () => {
        searchModal.style.display = 'none';
        // We don't clear the search results or term here to preserve them
    });

    // Close modal when clicking outside of it
    searchModal.addEventListener('click', (event) => {
        if (event.target === searchModal) {
            searchModal.style.display = 'none';
            // We don't clear the search results or term here to preserve them
        }
    });
    
    // Clear search button handler
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchResultCount.textContent = '';
        lastSearchTerm = '';
        lastSearchResults = [];
        // Focus on the search input after clearing
        searchInput.focus();
    });

    // Execute search on button click
    searchExecute.addEventListener('click', executeSearch);

    // Execute search on Enter key
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            executeSearch();
        }
    });
    
    // Toggle between search types
    keywordSearchBtn.addEventListener('click', () => {
        if (isSemanticSearch) {
            isSemanticSearch = false;
            keywordSearchBtn.classList.add('active');
            semanticSearchBtn.classList.remove('active');
            modelLoadingElement.style.display = 'none';
            regenerateEmbeddingsBtn.style.display = 'none';
        }
    });

    semanticSearchBtn.addEventListener('click', () => {
        if (!isSemanticSearch) {
            isSemanticSearch = true;
            semanticSearchBtn.classList.add('active');
            keywordSearchBtn.classList.remove('active');
            
            // Load the model if not already loaded
            if (!modelLoaded && !isModelLoading) {
                loadModel();
            } else if (modelLoaded) {
                // Show the regenerate embeddings button if model is already loaded
                modelLoadingElement.style.display = 'block';
                regenerateEmbeddingsBtn.style.display = 'block';
            }
        }
    });
    
    // Regenerate embeddings button handler
    regenerateEmbeddingsBtn.addEventListener('click', async () => {
        if (modelLoaded && messageList && messageList.length > 0) {
            regenerateEmbeddingsBtn.style.display = 'none';
            await generateEmbeddings(true); // Force regeneration
            regenerateEmbeddingsBtn.style.display = 'block';
            alert('Embeddings regenerated successfully!');
        }
    });
}

// Call the initialization function when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSearchUI); 