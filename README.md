# 🧠 EduSage: AI-Powered Assessment & Defensible Grading Platform

EduSage is an end-to-end educational platform designed to streamline quiz orchestration, generation, and grading. Built with a focus on **AI Engineering and MLOps**, this project moves beyond standard API wrappers to solve a critical problem in EdTech: the unreliability of "black box" LLM grading.

By implementing a **3-Tier Hybrid AI Grading System** and preparing for advanced Hybrid RAG (BM25 + Vector Search), EduSage provides teachers with transparent, defensible, and highly accurate automated assessments.

---

## 🚀 Core Features

### 1. Defensible Hybrid AI Grading
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

## 🧠 Engineering Decisions & Philosophy

As a final-year Software Engineering project focusing on AI systems, several architectural trade-offs were made to prioritize depth over breadth:

* **Dropping "Feature Bloat" for Core Quality:** Feature creep (such as slide/presentation generation) was actively audited and removed from the codebase. The engineering focus was redirected entirely to improving the **Retrieval-Augmented Generation (RAG)** pipeline and the defensible grading engine.
* **The Grading UI ("Glass Box" AI):** Instead of hiding the AI's grading process, the Teacher Dashboard exposes the semantic score and keyword detection. This builds trust with educators by keeping the human in the loop as the final arbiter of the grade.
* **Upcoming Benchmark (WIP):** Currently upgrading the naive vector search to **Hybrid Search (BM25 + Vector)** using Weaviate's native capabilities. This will include a measurable benchmark evaluating question generation relevance (Old RAG vs. Hybrid RAG) to mathematically prove the performance gain on dense educational texts.

---

## 📂 Repository Structure

\`\`\`bash
EduSage/
├── backend/                  # FastAPI application, AI logic, and DB models
│   ├── app/
│   │   ├── api/              # Route handlers (quizzes, submissions, student portal)
│   │   ├── services/         # Core business logic (vector_service, grading_service)
│   │   ├── models/           # SQLAlchemy schemas
│   │   └── crud/             # Database interactions
│   └── requirements.txt      
└── edusage-frontend/         # Next.js web application
    ├── app/
    │   ├── quiz-workspace/   # Teacher dashboard & grading interface
    │   ├── take-quiz/        # Live quiz session UI
    │   ├── results/          # Grade reports and student history
    │   └── components/       # Reusable UI elements
    └── package.json
\`\`\`

---

## 👨‍💻 Author

**Muhammad Amad** *B.S. Software Engineering | Aspiring AI Engineer & MLOps Practitioner* -
- [Portfolio/Upwork](#) *https://www.upwork.com/freelancers/~015db1c1b95482aad2?mp_source=share*

\`\`\`