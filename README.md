# 🧠 EduSage: AI Quiz Generation & Grading Platform

EduSage is an end-to-end educational platform designed to streamline quiz orchestration, generation, and grading. Built with a focus on **AI Engineering and MLOps**, this project moves beyond standard API wrappers to solve a critical problem in EdTech: the unreliability of "black box" LLM grading.

By implementing a **3-Tier Hybrid AI Grading System** and preparing for advanced Hybrid RAG (BM25 + Vector Search), EduSage provides teachers with transparent, defensible, and highly accurate automated assessments.

---

## 🚀 Core Features

### 1. Hybrid AI Grading
Subjective answers are graded using a deterministic + probabilistic pipeline to prevent LLM hallucinations and ensure fair scoring:
* **Semantic Match (Vector Search):** Calculates the topical overlap between the student's answer and the model answer using `sentence-transformers`.
* **Keyword Extraction:** Ensures critical domain-specific terminology is present.
* **LLM Logic Check:** Evaluates the actual understanding and reasoning of the answer, penalizing conceptually flawed arguments even if the vocabulary matches.

### 2. Full-Lifecycle Quiz Orchestration
* **Teacher Workspace:** Create quizzes manually or generate them from uploaded documents using AI. Generate shareable 6-character access codes for live class sessions.
* **AI-Assisted Grading Workbench:** Teachers review the AI's scoring breakdown (Semantic %, Keywords Found/Missing, LLM Feedback), adjust grades if necessary, and publish final results.
* **CSV Export:** One-click export of class results for easy integration with external gradebooks.

### 3. Frictionless Student Portal
* **Guest Access:** Students can join live sessions instantly using a share code—no account creation required.
* **Result Hub:** Authenticated users can view their entire historical portfolio of quizzes. Guest users can securely retrieve their specific grade reports using their unique Submission ID.
* **Quick Study:** A dedicated self-assessment module for students to generate instant practice quizzes from their own study materials.

---

## 🛠️ Technical Architecture

EduSage is structured as a monorepo containing a decoupled frontend and backend.

### Backend (Python / FastAPI)
* **Framework:** FastAPI, Uvicorn, SQLAlchemy
* **AI & Orchestration:** LangChain, LangGraph
* **Models:** Groq (Llama 3), Google GenAI, HuggingFace (`sentence-transformers`)
* **Vector Database:** Weaviate (Local instance)
* **Database:** PostgreSQL / SQLite
* **Authentication:** JWT (python-jose, passlib)

### Frontend (React / Next.js)
* **Framework:** Next.js (App Router), React
* **Styling:** Tailwind CSS, Headless UI
* **Icons & Assets:** Lucide React
* **Architecture:** Client/Server component separation with secure HTTP-only cookie session handling.

---

## 📂 Repository Structure

```

backend/                  # FastAPI application, AI logic, and DB models
    ├── app/
    │   ├── api/              # Route handlers (quizzes, submissions, student portal)
    │   ├── services/         # Core business logic (vector_service, grading_service)
    │   ├── models/           # SQLAlchemy schemas
    │   └── crud/             # Database interactions
    └── requirements.txt      
edusage-frontend/         # Next.js web application
    ├── app/
    │   ├── quiz-workspace/   # Teacher dashboard & grading interface
    │   ├── take-quiz/        # Live quiz session UI
    │   ├── results/          # Grade reports and student history
    │   └── components/       # Reusable UI elements
    └── package.json
```

---

## 👨‍💻 Author

**Muhammad Amad** *B.S. Software Engineering | AI Engineer

\`\`\`