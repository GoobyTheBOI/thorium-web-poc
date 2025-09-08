# 📖 Thorium Web App - Complete Documentation

An advanced web-based EPUB reader built on Thorium Web with comprehensive Text-to-Speech (TTS) functionality. This document provides complete technical documentation for developers and implementers.

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## 🎯 About the Project

This project is a comprehensive implementation of a web-based EPUB reader with a focus on accessibility and Text-to-Speech functionality. Built as part of a graduation project, it demonstrates the integration of modern TTS providers (ElevenLabs and Azure Speech) with a robust web application.

### Problem Statement

Digital accessibility for people with reading difficulties or visual impairments is crucial. Existing EPUB readers often have limited TTS support or are not web-based. This project provides a solution that:

- Offers high-quality TTS synthesis via multiple providers
- Works entirely in the browser without installation
- Seamlessly integrates EPUB documents with speech synthesis
- Features a modern, responsive user interface

## ✨ Features

### Core Features

- 📚 **EPUB Reader**: Fully functional web-based EPUB reader
- 🗣️ **Text-to-Speech**: Integrated TTS with multiple providers
- 🎙️ **Voice Selection**: Choice of different voices and languages
- ⏯️ **Playback Controls**: Play, pause, stop, resume functionality
- 🎯 **Word Highlighting**: Visual feedback during reading
- 🎛️ **Voice Settings**: Speed, pitch, and volume controls

### TTS Providers

- **ElevenLabs**: High-quality AI-generated voices
- **Azure Speech**: Microsoft's robust speech service
- **Dynamic Adapter Switching**: Seamlessly switch between providers

### User Interface

- 🎨 **Modern Design**: Clean, accessible interface
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- 🌓 **Theme Support**: Light and dark mode
- ♿ **Accessibility**: WCAG-compliant design

## 🛠️ Technology Stack

### Frontend

- **Next.js 14**: React framework with server-side rendering
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **React Hooks**: State management and lifecycle handling

### Backend

- **Next.js API Routes**: Serverless API endpoints
- **Node.js**: JavaScript runtime
- **TypeScript**: End-to-end type safety

### TTS Integration

- **ElevenLabs JS SDK**: ElevenLabs API integration
- **Azure Speech SDK**: Microsoft Speech Services
- **Custom Adapters**: Abstraction layer for TTS providers

### Testing

- **Jest**: Unit and integration testing
- **React Testing Library**: Component testing
- **MSW**: API mocking for tests
- **Coverage Reports**: Code coverage tracking

### Development Tools

- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **PNPM**: Package management

## 🚀 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **PNPM** >= 8.0.0
- **Git**

### API Keys

You need API keys for the TTS providers:

1. **ElevenLabs API Key**:
   - Register at [ElevenLabs](https://elevenlabs.io)
   - Go to your account settings
   - Copy your API key

2. **Azure Speech Service**:
   - Create an Azure account
   - Create a Speech Service resource
   - Note your API key and region

### Step-by-step Installation

1. **Clone the repository**

```bash
git clone https://github.com/GoobyTheBOI/thorium-web-poc.git
cd thorium-web-poc
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Azure Speech Configuration
AZURE_API_KEY=your_azure_speech_key_here
AZURE_REGION=your_azure_region_here

# Optional: Default voice settings
AZURE_VOICE_NAME=en-US-AriaNeural
```

4. **Start the development server**

```bash
pnpm dev
```

5. **Open the application**

Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

### Basic Functionality

1. **Loading EPUB**:
   - Upload an EPUB file via the interface
   - Or use one of the demo publications

2. **Activate TTS**:
   - Click the TTS button in the toolbar
   - Select a TTS provider (ElevenLabs or Azure)
   - Choose a voice from available options

3. **Text reading**:
   - Select text in the document
   - Click 'Play' to start reading
   - Use controls for pause/resume/stop

### Advanced Features

#### Voice Selection

```typescript
// Programmatically select a voice
voiceService.selectVoice('en-US-AriaNeural');

// Load voices from provider
const voices = await voiceService.loadAzureVoices();
```

#### TTS Configuration

```typescript
// Custom TTS settings
const ttsConfig = {
  provider: 'elevenlabs',
  voiceId: 'rachel-voice-id',
  speed: 1.2,
  pitch: 1.0
};
```

## 🔌 API Documentation

### TTS Endpoints

#### ElevenLabs Text-to-Speech

```http
POST /api/tts/elevenlabs
Content-Type: application/json

{
  "text": "Text to read aloud",
  "voiceId": "EXAVITQu4vr4xnSDxMaL",
  "modelId": "eleven_multilingual_v2"
}
```

**Response**: Audio buffer (MP3)

#### Azure Text-to-Speech

```http
POST /api/tts/azure
Content-Type: application/json

{
  "text": "Text to read aloud",
  "voiceId": "en-US-AriaNeural"
}
```

**Response**: Audio buffer (MP3)

#### Voice Endpoints

##### ElevenLabs Voices

```http
GET /api/tts/elevenlabs/voices
```

**Response**:

```json
{
  "voices": [
    {
      "id": "voice-id",
      "name": "Rachel",
      "language": "en",
      "gender": "female"
    }
  ]
}
```

##### Azure Voices

```http
GET /api/tts/azure/voices
```

**Response**:

```json
[
  {
    "id": "en-US-AriaNeural",
    "name": "Aria (English United States)",
    "language": "en-US",
    "gender": "female"
  }
]
```

### Error Handling

All API endpoints return structured error responses:

```json
{
  "error": "Error description",
  "details": "Detailed error information",
  "code": "ERROR_CODE"
}
```

## 🔧 Development

### Project Structure

```
src/
├── app/                    # Next.js app directory
├── Components/             # React components
│   ├── Actions/           # TTS control components
│   ├── Settings/          # Settings components
│   └── UI/                # Reusable UI components
├── lib/                   # Core library code
│   ├── adapters/          # TTS provider adapters
│   ├── services/          # Business logic services
│   ├── factories/         # Object factories
│   └── managers/          # State managers
├── pages/api/             # API routes
│   └── tts/               # TTS-related endpoints
├── types/                 # TypeScript type definitions
└── __tests__/             # Test files
```

### Key Concepts

#### Adapter Pattern

The project uses the Adapter pattern for TTS providers:

```typescript
interface IPlaybackAdapter {
  play(textChunk: TextChunk): Promise<Buffer>;
  pause(): void;
  resume(): void;
  stop(): void;
  voices: IVoiceProvider;
}
```

#### Service Layer

Business logic is organized in services:

- `VoiceManagementService`: Voice loading and selection
- `TtsOrchestrationService`: TTS workflow coordination
- `TextExtractionService`: EPUB text extraction

#### State Management

Centralized state management via `TtsStateManager`:

```typescript
class TtsStateManager {
  getState(): TtsState;
  updateState(updates: Partial<TtsState>): void;
  subscribe(listener: StateListener): void;
}
```

### Development Commands

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Linting
pnpm lint

# Type checking
pnpm type-check

# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Setup

For development you need the following environment variables:

```env
# Development
NODE_ENV=development

# TTS Configuration
ELEVENLABS_API_KEY=your_key
AZURE_API_KEY=your_key
AZURE_REGION=eastus

# Optional debugging
DEBUG_TTS=true
```

## 🧪 Testing

The project has extensive test coverage:

### Test Types

1. **Unit Tests**: Individual component and service tests
2. **Integration Tests**: Service integration tests
3. **API Tests**: Endpoint testing with mock providers

### Test Commands

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test src/__tests__/integration/

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

### Test Structure

```
__tests__/
├── integration/           # Integration tests
│   ├── services.integration.test.ts
│   ├── voice-api.integration.test.ts
│   └── text-extraction.integration.test.ts
├── pages/api/             # API tests
│   └── tts/
│       ├── azure.test.ts
│       └── elevenlabs.test.ts
└── components/            # Component tests
```

### Coverage Requirements

- **Statements**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Vercel account setup**

```bash
npm i -g vercel
vercel login
```

2. **Project configuration**

```bash
vercel
```

3. **Environment variables**
   - Go to your Vercel dashboard
   - Add your API keys to environment variables
   - Redeploy for changes

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t thorium-tts-app .

# Run container
docker run -p 3000:3000 \
  -e ELEVENLABS_API_KEY=your_key \
  -e AZURE_API_KEY=your_key \
  -e AZURE_REGION=eastus \
  thorium-tts-app
```

### Manual Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## 🤝 Contributing

Contributions are welcome! Follow these steps:

### Development Workflow

1. **Fork the project**

```bash
git clone https://github.com/your-username/thorium-web-poc.git
```

2. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

3. **Commit your changes**

```bash
git commit -m 'Add: amazing feature'
```

4. **Push to the branch**

```bash
git push origin feature/amazing-feature
```

5. **Open a Pull Request**

### Code Standards

- **TypeScript**: All code must be type-safe
- **ESLint**: Code must follow linting rules
- **Tests**: New features must have tests
- **Documentation**: Document complex functionality

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(tts): add voice speed control
fix(api): resolve Azure authentication issue
docs(readme): update installation instructions
test(integration): add voice selection tests
```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 GoobyTheBOI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

## 📞 Contact

### Project Maintainer

**Name**: [Your Name]
**Email**: [your.email@example.com]
**LinkedIn**: [linkedin.com/in/your-profile]
**GitHub**: [@GoobyTheBOI](https://github.com/GoobyTheBOI)

### Project Links

- **Repository**: [https://github.com/GoobyTheBOI/thorium-web-poc](https://github.com/GoobyTheBOI/thorium-web-poc)
- **Issues**: [GitHub Issues](https://github.com/GoobyTheBOI/thorium-web-poc/issues)
- **Documentation**: [Wiki](https://github.com/GoobyTheBOI/thorium-web-poc/wiki)

### Support

For questions, bugs, or feature requests:

1. **Bug Reports**: Use GitHub Issues with the "bug" label
2. **Feature Requests**: Use GitHub Issues with the "enhancement" label
3. **Questions**: Start a GitHub Discussion
4. **Email**: For direct questions and support

### Acknowledgments

This project was made possible by:

- **Thorium Web Team** - Base EPUB reader implementation
- **ElevenLabs** - High-quality TTS API
- **Microsoft Azure** - Speech Services
- **Readium Foundation** - EPUB standards and toolkit
- **Next.js Team** - Excellent React framework

---

## 📊 Project Status

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Test Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Last Update**: September 2024
**Status**: Active Development
**Version**: 1.0.0

---

*This documentation is regularly updated. Check the [changelog](CHANGELOG.md) for recent changes.*
