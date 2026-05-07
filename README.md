# StudyAI – Subject Specific AI Study Assistant

StudyAI is a subject-focused AI learning platform built using Retrieval-Augmented Generation (RAG) and Large Language Models. Instead of giving generic AI responses, the system answers questions strictly from the student's uploaded study materials such as notes, PDFs, handwritten documents, and previous year question papers.

The goal of the project is to create a smarter and more reliable academic assistant that helps students study from their own syllabus-oriented content.

---

# Features

## Subject-Based Workspace

* Create separate subjects for different courses
* Every subject has its own isolated knowledge base
* User-specific storage using namespaces in Pinecone

## AI Chat Assistant

* Ask questions related to uploaded study material
* Answers are generated using RAG
* Context-aware conversations with chat history support
* Query rewriting for better retrieval accuracy

## PDF & Notes Upload

* Upload normal PDFs directly
* Automatic chunking and vector embedding
* Notes stored inside Pinecone vector database

## Handwritten Notes OCR

* Supports handwritten notes and scanned PDFs
* Uses Gemini Vision for OCR extraction
* Extracted text is converted into searchable embeddings

## Previous Year Question (PYQ) Analysis

* Upload PYQs for analysis
* Generates probable exam blueprint and important topics
* Cross references PYQs with uploaded notes

## YouTube Recommendation Support

* Optional YouTube recommendations for better learning
* Helps students find additional explanations visually

## Cloud Storage & Database

* MongoDB Atlas for application data
* Cloudinary for file handling
* Pinecone for vector storage

## Modern Frontend

* Built using React + Vite
* Responsive UI
* Smooth chat-based learning experience

---

# Tech Stack

## Frontend

* React
* Vite
* Axios
* Firebase Authentication
* CSS

## Backend

* FastAPI
* LangChain
* Groq API (LLM)
* Gemini API
* Pinecone Vector Database
* MongoDB Atlas
* Cloudinary

## AI / RAG Pipeline

* Retrieval-Augmented Generation (RAG)
* Query Rewriting
* Semantic Search
* OCR Processing
* Embedding-based Retrieval

---

# How the System Works

1. User creates a subject.
2. Notes, PDFs, handwritten files, or PYQs are uploaded.
3. Files are processed using OCR if needed.
4. Text is split into chunks.
5. Embeddings are generated and stored in Pinecone.
6. When the user asks a question:

   * Query rewriting improves the search query
   * Relevant chunks are retrieved from Pinecone
   * Retrieved context is passed to the LLM
   * Final answer is generated strictly from uploaded material

This reduces hallucination and keeps answers syllabus-focused.

---

# Project Structure

```bash
MiniProject_StudyAI/
│
├── backend/
│   ├── main.py
│   ├── rag.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# Important Backend Modules

## main.py

Handles:

* FastAPI routes
* Subject management
* File upload APIs
* Chat APIs
* Database operations
* Cloud integrations

## rag.py

Handles:

* PDF processing
* OCR extraction
* Vector storage
* Similarity search
* Query rewriting
* Answer generation
* Exam blueprint generation

---

# AI Workflow Used

## Step 1 – Document Processing

* PDFs are loaded using PyPDFLoader
* Text is chunked using CharacterTextSplitter

## Step 2 – Embedding Generation

* Gemini Embedding model generates embeddings
* Stored in Pinecone vector database

## Step 3 – Retrieval

* User query is rewritten for better context
* Similar chunks are retrieved using semantic search

## Step 4 – Generation

* Retrieved context is sent to Groq LLM
* AI generates syllabus-focused responses

---

# OCR Support

The project supports:

* Handwritten notes
* Scanned PDFs
* Images containing text
* Mathematical equations

Gemini Vision is used to extract text and convert equations into LaTeX format when possible.

---

# Database Design

## MongoDB Collections

* subjects
* chats
* blueprints
* files

## Pinecone

* Stores vector embeddings
* Uses separate namespaces for every subject and user

---

# Setup Instructions

## 1. Clone Repository

```bash
git clone <your-repository-link>
cd MiniProject_StudyAI
```

---

## 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside backend:

```env
GROQ_API_KEY=
GEMINI_API_KEY=
PINECONE_API_KEY=
MONGODB_URL=
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_API_SECRET=
```

Run backend:

```bash
uvicorn main:app --reload
```

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# Future Improvements

* Voice-based learning assistant
* Multi-agent academic workflow
* Flashcard generation
* AI-generated quizzes
* Better analytics dashboard
* Real-time collaborative study rooms
* Mobile application

---

# Why This Project?

Most AI chatbots provide generic answers using internet knowledge, which may not match a student's syllabus or study material.

StudyAI solves this problem by:

* Restricting responses to uploaded academic content
* Reducing hallucination
* Supporting handwritten notes
* Making exam preparation more focused and efficient

---

# Learning Outcomes

This project helped in understanding:

* RAG architecture
* Vector databases
* Semantic search
* OCR pipelines
* LLM integration
* FastAPI backend development
* React frontend architecture
* Cloud deployment workflow

---

# Author

Prashant Sharma
B.Tech CSE (AIML)

---

# License

This project is built for academic and educational purposes.
