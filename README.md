# AI PDF Quiz Generator

A fast, interactive web application that transforms lecture slides, notes, and textbook PDFs into customized quizzes with instant scoring and explanations.

Built with a sleek, high-contrast dark theme.

---

## ⚡ Features

- **Direct Document Upload**: Upload any `.pdf`, `.docx`, or `.txt` document (up to 25MB).
- **Grounded Question Synthesis**: Extracts key definitions, operational concepts, and core mechanisms directly from the text to formulate Multiple Choice and True/False questions.
- **Customizable Quizzes**:
  - Select question count: **5**, **10**, or **15** questions.
  - Choose difficulty: **Easy**, **Medium**, or **Hard**.
  - Choose question types: **Multiple Choice**, **True / False**, or **Mixed**.
- **Interactive Quiz Player**: Clean question-by-question navigation, answer selection, and quick-jump question numbers.
- **Instant Grading & Answer Key**: Complete performance score percentage with detailed review showing correct answers and source explanations extracted from the document.
- **Quick Demo Samples**: 1-click preloaded demo topics (*Operating Systems*, *Cellular Respiration*, *Thermodynamics*) for instant live demonstrations.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express, TypeScript, Multer, `pdf-parse`
- **Styling**: Modern high-contrast dark UI/UX (`bg-zinc-950 text-white`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Open in Browser
Visit [http://localhost:5173](http://localhost:5173) in your browser.
