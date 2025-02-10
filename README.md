# AI Chat Application

A modern web application built with Astro and React that provides an intelligent chat interface with AI capabilities. The application supports multiple AI models and includes features for SVG handling and visual interactions.

## ✨ Features

- 🤖 Multi-model AI chat support (Anthropic, OpenAI)
- 🎨 Modern, responsive UI built with React and Tailwind CSS
- 🖼️ SVG preview and manipulation capabilities
- ⚡ Fast performance with Astro's static site generation
- 📱 Mobile-friendly design
- 🔄 Real-time chat interactions
- 🎯 OpenReplay integration for analytics

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
# Add your required environment variables here
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

## 🛠️ Development

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:4321`

## 📦 Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 🧱 Project Structure

```text
/
├── src/
│   ├── assets/          # Static assets (SVGs, images)
│   ├── components/      # React components
│   │   ├── logo/       # Logo-related components
│   │   └── svg/        # SVG handling components
│   ├── layouts/        # Astro layout components
│   ├── pages/          # Astro pages and API routes
│   │   └── api/        # API endpoints
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── backend/        # Backend configuration
└── public/             # Public static files

## 🔧 Technologies

- [Astro](https://astro.build/) - Web framework
- [React](https://reactjs.org/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [@ai-sdk](https://www.npmjs.com/package/ai) - AI integration
- [OpenReplay](https://openreplay.com/) - Analytics and monitoring

## 📄 License

[Add your license information here]

## 👥 Contributing

[Add contribution guidelines here]

