# LeanFeastAI

> **Feast smart. Stay Lean.**

LeanFeastAI is an intelligent recipe generation and meal planning platform designed to help users achieve their health goals without compromising on taste. By leveraging advanced AI, it provides personalized recipe suggestions, nutritional breakdowns, and smart ingredient replacements tailored to individual dietary preferences and restrictions.

## 🚀 Key Features

### 🥗 Smart Recipe Generation
- **Structured Inputs**: Easy-to-use forms for detailing meal preferences, including dietary restrictions (vegan, keto, etc.) and taste profiles.
- **RAG-Based Generation**: Uses a semantic database (Pinecone) to search for similar existing recipes and evolves them using Google Gemini 2.5 Flash API for high accuracy.
- **Nutritional Analytics**: Automated calculation of calories, macronutrients, vitamins, and minerals via the Spoonacular API.

### 🍳 Interactive & Hands-Free Cooking
- **Hands-Free Voice Control**: Navigate steps completely hands-free using voice commands like "Next", "Back", "Repeat", and "Start timer". Powered by the Web Speech API.
- **Step-by-Step Audio Guidance**: Text-to-Speech (TTS) narration for every instruction.
- **Smart Timers**: Automatically detects cooling durations and sets timers with audio alerts.

### 🤖 AI-Powered Tools
- **Ingredient Replacement**: Suggests healthy or locally available alternatives for any ingredient.
- **Meal Optimizer**: Optimizes any existing recipe (from memory or URL) to be healthier based on your diet.
- **Visuals**: Generates high-quality food images using Pollinations.ai (Flux Model).

### 👥 Community Hub
- **Share & Explore**: Submit your own recipes or AI-generated ones to the community.
- **Engagement**: Like, view, share, and comment on recipes.
- **Real-Time Updates**: Live interactions powered by Supabase Realtime.

### 📊 Admin Dashboard
- **Analytics**: Track user growth, recipe generation stats, and community engagement.
- **Moderation**: Tools to moderate comments and manage community content.

## 🛠️ Tech Stack

**Frontend**
- **Framework**: React.js 19, TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Redux Toolkit
- **Voice AI**: Web Speech API, Picovoice
- **Deployment**: Vercel

**Backend**
- **Language**: Python 3.11
- **Framework**: FastAPI
- **Database**: Supabase (PostgreSQL), Pinecone (Vector DB)
- **AI/ML**: LangChain, Google Gemini 2.5 Flash
- **Deployment**: Render

**APIs**
- Google Gemini 2.5 Flash API (LLM)
- Spoonacular API (Nutrition)
- Pollinations.ai (Image Generation)
- TTS API

## 🗄️ Database Structure (Supabase)

### Core Tables
- **`recipes`**: Stores generated recipes, ingredients, steps, and nutritional data.
- **`community`**: Manages shared recipes, likes, views, and featured status.
- **`profiles`**: User profiles including dietary preferences, allergies, and goals.
- **`auth.users`**: Managed by Supabase Auth.

### Analytics & Feedback
- **`analytics_recipe_performance`**: Tracks views, saves, and rating metrics.
- **`analytics_user_activity`**: Logs user actions (view, cook, save) for personalization.
- **`feedback`**: User ratings and feedback text.
- **`user_recipe_actions`**: Granular tracking of user interactions.

### Admin
- **`admin_users`**: Admin roles and permissions.
- **`admin_actions`**: Audit log of administrative actions.

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- Supabase Account
- Google Gemini API Key
- Spoonacular API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/LeanFeastAI.git
    cd LeanFeastAI
    ```

2.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Backend Setup**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```

4.  **Environment Variables**
    Create `.env` files in both `frontend` and `backend` directories with the necessary API keys and Supabase credentials.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
