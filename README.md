# AI Transcript Viewer

A tool for viewing and analyzing AI conversation transcripts from various platforms including ChatGPT, Claude, PaLM/Gemini, and LLaMA.

## Features

- View conversations with threaded message display
- Navigate between messages (with focus on user messages)
- Toggle between single and three-message view
- Keyword and semantic search capabilities
- Accurate token count approximations for different AI models
- Message metadata display

## Tokenization for AI Models

This application uses built-in approximation methods to estimate token counts for different AI models:

- For GPT models: Character and word-based approximation with adjustment for special characters and code blocks
- For Claude models: Custom approximation considering Claude's tokenization patterns
- For PaLM/Gemini: SentencePiece-based approximation 
- For LLaMA: Byte-level BPE approximation

These approximation methods provide reasonably accurate token counts without requiring external dependencies.

### Token Count Accuracy

The token counts provided by this application are approximations and may not match the exact counts used by the AI providers. However, they are sufficiently accurate for most practical purposes such as:

- Estimating the cost of API calls
- Checking if a prompt fits within token limits
- Analyzing conversation length and distribution

### Advanced Usage (Optional)

For developers who want to implement more precise token counting with external libraries, the code includes commented sections for loading tokenization libraries. This is an advanced option and requires serving the application from a proper web server.

## Using the HTTP Server

An included server script is provided for advanced users who want to run the application from an HTTP server:

1. Make sure you have Node.js installed
2. Open a terminal in the "Generation Transcripts" directory
3. Run the command: `node serve.js`
4. The application will automatically open in your default browser

## Using the Application

1. Open the TranscriptViewer.html file in a web browser 
2. Upload a JSON transcript file
3. Navigate through messages using arrow keys or the navigation buttons
4. Toggle view modes using the button in the top-right corner
5. Search for content using the search button
6. View token statistics in the header

## Model Selection

The application uses the `platform` field in your JSON transcript to automatically determine the correct model type (GPT, Claude, PaLM/Gemini, or LLaMA) for token counting.

## Caching

Token counts are cached for better performance. To clear the cache and refresh token counts, click on the token count display in the header. 