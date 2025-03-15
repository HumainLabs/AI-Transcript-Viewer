# AI Transcript Viewer 📝

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Maintained by HumainLabs.ai](https://img.shields.io/badge/Maintained%20by-HumainLabs.ai-orange)

A powerful tool for viewing and analyzing AI conversation transcripts from various platforms including ChatGPT, Claude, and SpecStory transcripts from VS Code and Cursor AI. 

I use this tool to view downloaded transcripts using the [HumainLabs Firefox Extension](https://github.com/HumainLabs/claude-chatgpt-backup-extension)



<p align="center">
  <img src="humainlabs.ai.png" alt="HumainLabs.ai logo" width="30%" />
  <br>
  <h3 align="center">HumainLabs.ai</h3>
  <h5 align="center">Cognitive Framework Engineering & <br>Research for AI Cognition</h5>
  <p align="center"><a href="https://humainlabs.ai" align="center">www.HumainLabs.ai</a></p>
</p>

## 📋 Table of Contents

* [Overview](#-overview)
* [Features](#-features)
* [Supported Platforms](#-supported-platforms)
* [Tokenization](#-tokenization-for-ai-models)
* [Installation](#-installation)
* [Usage](#-usage)
* [Advanced Features](#-advanced-features)
* [Development](#-development)

## 🔍 Overview

The AI Transcript Viewer provides a comprehensive interface for analyzing and exploring AI conversation transcripts. Designed to work with multiple AI platforms, it offers powerful capabilities for navigating complex conversations, viewing AI thinking processes, and analyzing token usage patterns.

## ✨ Features

| Feature | Description |
| ------- | ----------- |
| **Multi-Platform Support** | Seamlessly view transcripts from ChatGPT, Claude, PaLM/Gemini, and LLaMA |
| **Three-Message View** | See conversation context with previous, current, and next messages |
| **Thinking Process Visualization** | View AI reasoning and thought processes when available |
| **Message Navigation** | Navigate between messages with keyboard shortcuts or UI buttons |
| **Semantic Search** | Find content based on meaning, not just keywords |
| **Token Count Analysis** | Get accurate approximations of token usage by message and conversation |
| **Metadata Display** | Examine detailed message metadata for technical analysis |
| **Voice Mode Support** | Special handling for voice conversation transcripts |
| **Message Combination** | Intelligent merging of thinking and response messages |
| **Message Export** | Star important messages and export them as JSON for use in AI context windows |

## 🤖 Supported Platforms

The viewer supports transcript formats from the following AI platforms:

- **ChatGPT** - Including thinking process from a8km123 tool messages
- **Claude** - Multiple formats including JSON and SpecStory variants


## 🧮 Tokenization for AI Models

This application uses built-in approximation methods to estimate token counts for different AI models:

| Model | Tokenization Method |
| ----- | ------------------ |
| **GPT models** | Character and word-based approximation with adjustment for special characters and code blocks |
| **Claude models** | Custom approximation considering Claude's tokenization patterns |


### Token Count Accuracy

The token counts provided are approximations and may not match the exact counts used by AI providers. However, they are sufficiently accurate for most practical purposes such as:

- Estimating the cost of API calls
- Checking if a prompt fits within token limits
- Analyzing conversation length and distribution

## 📥 Installation

### Basic Usage

1. Download the repository
2. Open the `index.html` file in any modern web browser
3. Upload a JSON transcript file

### Using the HTTP Server (Advanced)

For developers who want advanced features:

```bash
# Make sure you have Node.js installed
# Navigate to the project directory
node serve.js

# The application will automatically open in your default browser
```

## 🚀 Usage

### Navigation Basics

```
← / → Arrow Keys - Navigate between messages
↑ / ↓ Arrow Keys - Jump to next/previous user message
Space - Toggle between single and three-message view
```

### Uploading Transcripts

1. Click the upload button or drag-and-drop a transcript file
2. The viewer will automatically detect the format and display the conversation
3. Use navigation controls to explore the transcript

### Search Functionality

1. Click the search button in the top navigation
2. Enter search terms
3. Results will highlight matching messages
4. Use navigation buttons to move between matches

## 🔧 Advanced Features

### Token Statistics

Click on the token count in the header to:
- View detailed token usage for each message
- See total token consumption for the entire conversation
- Clear the token cache for fresh calculations

### Message Metadata

Click the metadata button on a message to examine:
- Raw message data
- Platform-specific properties
- Technical details about the message

### Star and Export Messages ⭐

This feature allows you to select specific messages for export to use in AI context windows:

1. Click the star icon (⭐) on any message you want to save
2. Star multiple messages across the conversation as needed
3. Click the "Copy Starred" button in the top navigation bar
4. A JSON array containing the content of all starred messages will be copied to your clipboard
5. Paste this directly into an AI session to provide rich context from previous conversations

This is particularly useful for:
- Continuing conversations across different AI sessions
- Providing key insights from previous discussions to a new AI model
- Creating curated context for complex prompting techniques
- Building composite prompts from multiple transcript segments

The exported JSON preserves the role (user/assistant) and content of each message, making it ready to use in most AI context windows.

### Keyboard Shortcuts

| Key | Function |
| --- | -------- |
| `Space` | Toggle view mode |
| `←/→` | Previous/Next message |
| `↑/↓` | Previous/Next user message |
| `Esc` | Close modals |

## 🛠️ Development

### Adding Support for New Platforms

The application uses a platform handler system that can be extended:

1. Create a new handler in the `js/platforms/` directory
2. Implement the required interface methods
3. Register the handler in the platform interface

### Directory Structure

* `js/` - JavaScript files
  * `platforms/` - Platform-specific handlers
  * `tokenizers/` - Token counting implementations
* `css/` - Stylesheets
* `lib/` - External libraries

### Custom Tokenizers

For developers who want to implement more precise token counting with external libraries, the code includes commented sections for loading tokenization libraries. This is an advanced option and requires serving the application from a proper web server. 