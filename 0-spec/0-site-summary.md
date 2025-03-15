# AI Transcript Viewer

## Repository Overview

This repository contains a web application for viewing, analyzing, and managing AI conversation transcripts from various platforms including ChatGPT, Claude, PaLM/Gemini, and LLaMA. The application provides a user-friendly interface for navigating through AI conversations with features for token counting, searching, and formatting.

## Key Components

### Core Application
- `TranscriptViewer.html` - The main HTML file that serves as the entry point for the application
- `serve.js` - A Node.js script that creates a simple HTTP server for serving the application
- `start-server.js` - Extended server functionality for the application

### JavaScript Modules
- `js/main.js` - Core application logic and initialization
- `js/display.js` - Handles the rendering and display of conversation messages
- `js/transcript.js` - Manages transcript data and processing
- `js/keywordSearch.js` & `js/semanticSearch.js` - Search functionality implementations
- `js/searchUI.js` - User interface for search features
- `js/storage.js` - Handles local storage of transcripts and application state
- `js/starredMessages.js` - Functionality for saving and managing important messages

### Styling
- `css/styles.css` - Stylesheet for the application's appearance and layout

### Conversion Scripts
- `scripts/claude_json_to_viewer.js` - Converts Claude JSON format to the viewer's format
- `scripts/claude_specstory_to_json.js` - Converts Claude SpecStory MD format to standard JSON
- `scripts/update_claude_specstory.js` - Updates Claude SpecStory files to maintain compatibility

### Sample Data
- `transcripts-json/` - Contains sample AI conversation transcripts in various formats
  - Includes ChatGPT logs, Claude JSON and SpecStory formats
  - Sample conversations cover various AI research and development topics

## Features

- **Conversation Display**: Three-pane message display with navigation tools
- **Search Capabilities**: Both keyword and semantic search options
- **Token Counting**: Approximates token counts for different AI models
- **Message Metadata**: Display of relevant message information
- **Local Storage**: Caching of token counts and application state
- **Format Conversion**: Tools to convert between different transcript formats

## Three-Pane View Structure

The application uses a three-pane view to display conversation messages:

1. **Left Pane (previous-message-container)**: Displays message n (current index)
2. **Middle Pane (current-message-container)**: Displays message n+1
3. **Right Pane (next-message-container)**: Displays message n+2

This layout provides context for each message by showing the surrounding messages in the conversation.

## AI Platform-Specific Handling

The application handles AI "thinking" content differently based on the platform:

- **ChatGPT Transcripts**: For "thinking" content, there are two possible patterns handled: 
  1. An assistant message followed by a tool message with name "a8km123" - the tool message is treated as the thinking part.
  2. A tool message with name "a8km123" followed by an assistant message - the tool message is treated as the thinking part, and both are combined.
  
  In both cases, the thinking and response are combined to display as a single message. `transcript.platform: "chatgpt"`

- **Claude JSON**: These transcripts include a dedicated `claude_thinking` field alongside the assistant's message that contains the reasoning/thinking content. Claude JSON also uses "human" role instead of "user" role, which is handled by the application's navigation functions. `transcript.platform: "claude-json"`

- **Claude SpecStory**: These transcripts use `<think>` tags within messages to delineate the reasoning/thinking part from the response content. `transcript.platform: "claude-specstory"`

This handling ensures that regardless of the transcript format, the application properly displays both the reasoning process and the final response from the AI.

## Usage

1. Open `TranscriptViewer.html` directly in a browser, or
2. Run `node serve.js` to start a local HTTP server (recommended for full functionality)
3. Upload a JSON transcript file through the interface
4. Navigate, search, and analyze the conversation

## Dependencies

The application uses:
- Marked (Markdown rendering)
- TensorFlow.js and Universal Sentence Encoder (for semantic search)
- Bootstrap (styling)
- Font Awesome (icons)
- js-tiktoken and uuid (Node.js dependencies) 