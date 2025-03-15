# Forkify Command Line 🍽️

![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Maintained by HumainLabs.ai](https://img.shields.io/badge/Maintained%20by-HumainLabs.ai-orange)

A powerful command-line tool for managing conversational context windows with Claude AI. Forkify enables intelligent document processing and "forking" of conversation branches, allowing you to explore multiple conversational paths from a shared context trunk.

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
* [Conversation Branching](#-conversation-branching)
* [Requirements](#-requirements)
* [Installation](#-installation)
* [Usage](#-usage)
* [Command Reference](#-command-reference)
* [Development](#-development)
* [License](#-license)

## 🔍 Overview

Forkify Command Line redefines AI document analysis by enabling sophisticated context window management with Anthropic's Claude AI. The name "Forkify" comes from its core ability to "fork" conversation contexts—creating branches that explore different paths while maintaining a shared base trunk.

The application manages the entire document lifecycle:
1. **Loading documents** into Claude's cache (`input-docs`)
2. **Processing them** into AI-optimized summaries (`processed-docs`)
3. **Storing conversation outputs** for future reference (`output-docs`)

By removing the web and API components, this command-line version focuses exclusively on providing a lightweight yet powerful tool for context-aware document processing and conversation management.

## ✨ Features

| Feature | Description |
| ------- | ----------- |
| **Context Window Management** | Precisely control how much conversational history is included in Claude's attention window |
| **Document Processing Pipeline** | Three-stage pipeline with raw documents, processed summaries, and conversation outputs |
| **Conversation Branching** | Fork conversations to explore different paths while maintaining a shared context trunk |
| **System Prompt Customization** | Choose different system prompts for analysis, QA, or content generation tasks |
| **Response Length Control** | Adjust response length from extremely short (128 tokens) to very detailed (4096+ tokens) |
| **Token Usage Monitoring** | Track token usage and associated costs across all conversations |
| **Document Source Tracking** | View which documents are being used in the current conversation |
| **Session Persistence** | Automatically save and restore conversation state between sessions |

## 🌿 Conversation Branching

The core innovation of Forkify is its conversation branching capability:

```
                    ┌── Branch A: Explore technical details
                    │
Main Conversation ──┼── Branch B: Focus on business implications
                    │
                    └── Branch C: Investigate edge cases
```

**How it works:**
1. You establish a base context "trunk" with your initial documents and conversation
2. Create branches to explore different tangents or conversation paths
3. Each branch maintains its own context window but shares the base trunk
4. Switch between branches without losing your place in either conversation

This approach allows you to:
- Explore multiple analytical angles from the same document set
- Try different prompting strategies without starting over
- Maintain separate conversations that share foundational context
- Preserve trunk attention mechanisms while exploring new directions

## 📦 Requirements

* Python 3.8 or higher
* Anthropic API key (for Claude)

## 📥 Installation

### Using git

```bash
# Clone the repository
git clone https://github.com/HumainLabs/forkify-cmdline.git
cd forkify-cmdline

# Run the setup script
./scripts/setup.sh
```

### Configuration

Update the `.env` file with your API keys:

```
ANTHROPIC_API_KEY=your_api_key_here
```

## 🚀 Usage

Start the command-line interface:

```bash
python claude.py
```

Or use the development script:

```bash
./scripts/dev.sh
```

### Document Flow Process

Forkify implements a three-stage document processing pipeline:

1. **Input Documents** (`input-docs/`): Raw documents loaded into Claude's context
2. **Processed Documents** (`processed-docs/`): AI-optimized summaries and analysis
3. **Output Documents** (`output-docs/`): Conversation history and generated content

This approach ensures efficient token usage while maintaining comprehensive context.

### Working with Documents

1. Place your documents in the `input-docs/main` or create subdirectories for organization
2. Start a conversation with `/sw <name>` to create a new conversation
3. Refer to documents in your queries with `@@filename` syntax
4. Ask questions about your documents
5. Create branches with the branching commands to explore different conversation paths

### Sample Session

```
> /sw research_project
Created new conversation 'research_project'
> I need to analyze @@research_paper.pdf
Processing document 'research_paper.pdf'...
Document analysis complete.
> What are the key findings in this paper?
The key findings from the research paper include:
[Claude generates response analyzing the document]
> /branch technical_details
Created new branch 'technical_details' from 'research_project'
> Let's focus on the implementation details in section 3
[Claude responds with technical analysis]
> /sw research_project
Switched to 'research_project' conversation
> Let's discuss the business implications instead
[Claude responds with business analysis while maintaining original context]
```

## 🧰 Command Reference

| Command | Description |
| ------- | ----------- |
| `/q` | Quit the program |
| `/sw` | List all conversations |
| `/sw <name>` | Create new conversation or switch to existing |
| `/reload` | Reprocess all documents for current conversation |
| `/ld <n>` | Reload documents and update context (default: last 20 messages) |
| `/docs` | Show document sources for current conversation |
| `/p` | List available system prompts |
| `/p <type>` | Switch system prompt type (analysis\|qa\|generation) |
| `/xxs` | Switch to extremely short responses (128 tokens) |
| `/xs` | Switch to very short responses (256 tokens) |
| `/s` | Switch to short responses (512 tokens) |
| `/m` | Switch to medium responses (1024 tokens) |
| `/l` | Switch to long responses (2048 tokens) |
| `/xl` | Switch to very long responses (4096 tokens) |
| `/xxl` | Switch to extremely long responses (8192 tokens) |
| `/clearall` | Clear ALL sessions and conversations (requires confirmation) |
| `/clearconv` | Clear ALL conversations and related files/folders (requires confirmation) |
| `/usage` | Display total token usage and costs |
| `/` | Show help message |

## 🛠️ Development

### Directory Structure

* `input-docs/` - Place your input documents here
* `processed-docs/` - Contains processed document data
* `output-docs/` - Contains output generated from conversations
* `sessions/` - Contains conversation session data
* `data/` - Contains application data
* `scripts/` - Contains utility scripts

### Scripts

* `setup.sh` - Sets up the application environment
* `dev.sh` - Starts the command-line interface

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Maintained with ❤️ by HumainLabs.ai 