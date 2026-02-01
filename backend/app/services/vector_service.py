# app/services/vector_service.py
from langchain_groq import ChatGroq  # CHANGED: Import Groq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
import weaviate
from weaviate.classes.config import Property, DataType, Configure
from langchain_weaviate import WeaviateVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings

# Global variables
weaviate_client = None
embedding_model = None
text_splitter = None
vector_store = None

# We now have TWO models
llm_fast = None  # Llama 3.1 8b (Grading, Simple Tasks)
llm_complex = None  # Llama 3.3 70b (Generation, RAG)

rag_chain = None
quiz_generation_chain = None
grading_chain = None
lesson_plan_chain = None


def init_vector_service():
    """Initializes the base components."""
    global weaviate_client, embedding_model, text_splitter, vector_store, llm_fast, llm_complex
    print("Initializing base vector service components...")

    # 1. Embedding Model (Unchanged - HuggingFace)
    embedding_model = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)

    # 2. Text Splitter (Unchanged)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.TEXT_CHUNK_SIZE,
        chunk_overlap=settings.TEXT_CHUNK_OVERLAP
    )

    # 3. Weaviate Connection (Unchanged)
    weaviate_client = weaviate.connect_to_local()
    print("Successfully connected to Weaviate.")

    if not weaviate_client.collections.exists(settings.WEAVIATE_COLLECTION):
        weaviate_client.collections.create(
            name=settings.WEAVIATE_COLLECTION,
            properties=[
                Property(name="content", data_type=DataType.TEXT),
                Property(name="source", data_type=DataType.TEXT),
                Property(name="page", data_type=DataType.INT),
            ],
            vectorizer_config=Configure.Vectorizer.none(),
        )
        print(f"Collection '{settings.WEAVIATE_COLLECTION}' created.")

    vector_store = WeaviateVectorStore(
        client=weaviate_client,
        index_name=settings.WEAVIATE_COLLECTION,
        text_key="content",
        embedding=embedding_model,
    )
    print("Vector Service Initialized.")

    # 4. Initialize Groq Models (Plug and Play)
    # Fast Model: Llama 3.1 8B Instant (Great for speed/grading)
    llm_fast = ChatGroq(
        temperature=0,
        model_name="llama-3.1-8b-instant",
        api_key=settings.GROQ_API_KEY
    )

    # Complex Model: Llama 3.3 70B Versatile (Great for generation/reasoning)
    llm_complex = ChatGroq(
        temperature=0,
        model_name="llama-3.3-70b-versatile",
        api_key=settings.GROQ_API_KEY
    )

    print("Groq Models Initialized: Fast (8b) & Complex (70b)")


def close_vector_service():
    """Closes the Weaviate client connection."""
    global weaviate_client
    if weaviate_client:
        weaviate_client.close()
        print("Weaviate connection closed.")


def get_rag_chain():
    """RAG Chain - Uses Complex Model for better context synthesis."""
    global rag_chain
    if rag_chain is None:
        print("Initializing RAG chain...")
        prompt_template_str = """
        You are an expert educational assistant. Based ONLY on the following context, provide a clear and concise answer to the question. 
        If the information is not in the context, say that you cannot find the answer in the provided documents.

        Context: {context}
        Question: {question}
        Answer:
        """
        prompt = ChatPromptTemplate.from_template(prompt_template_str)
        # Using 70b for better reasoning on context
        rag_chain = prompt | llm_complex | StrOutputParser()
        print("RAG chain initialized.")
    return rag_chain


def get_quiz_chain():
    """Quiz Generation - Uses Complex Model for instruction following."""
    global quiz_generation_chain
    if quiz_generation_chain is None:
        print("Initializing Quiz Generation chain...")
        quiz_prompt_template = """
        You are an expert educator and quiz creator. Your task is to generate a quiz based ONLY on the provided context.
        Do not use any external knowledge.

        Follow these instructions precisely:
        1.  Generate exactly {num_mcq} Multiple Choice Questions (MCQ).
        2.  Generate exactly {num_short_answer} Short Answer questions.
        3.  The quiz difficulty should be {difficulty}.
        4.  For MCQs, provide exactly 4 options.
        5.  For Short Answer questions, the "options" field MUST be null.
        6.  Every question, including Short Answer ones, MUST have a "correct_answer" field containing the model answer.
        7.  Base every question and its correct answer strictly on the provided context.
        8.  Return the output as a single, valid JSON object following this exact structure:
            {{
              "title": "Quiz on the provided context",
              "questions": [
                {{
                  "question_text": "Text of the first question...",
                  "question_type": "MCQ", // or "Short Answer"
                  "options": ["Option A", "Option B", "Option C", "Option D"], // or null
                  "correct_answer": "The correct answer text..."
                }}
              ]
            }}        

            ADDITIONAL INSTRUCTIONS FROM THE TEACHER:
            ---
            {custom_instructions}
            ---

            Context:
            ---
            {context}
            ---
        """
        prompt = ChatPromptTemplate.from_template(quiz_prompt_template)
        # Using 70b because it handles complex JSON formatting constraints much better
        quiz_generation_chain = prompt | llm_complex | JsonOutputParser()
        print("Quiz Generation Chain initialized.")
    return quiz_generation_chain


def get_grading_chain():
    """Grading - Uses Fast Model (8b) for speed and efficiency."""
    global grading_chain
    if grading_chain is None:
        print("Initializing AI Grading chain...")
        grading_prompt_template = """
            You are an expert AI teaching assistant. Grade the student's submission.

            INPUTS:
            1. Reference Context (Truth source):
            ---
            {reference_context}
            ---

            2. Grading Criteria:
            ---
            {grading_criteria}
            ---

            3. Student Submission:
            ---
            {submission_context}
            ---

            INSTRUCTIONS:
            - Compare the Student's Answer to the Correct Answer AND the Reference Context.
            - If the Reference Context is provided, use it to verify facts.
            - If the Reference Context is missing/empty, use your general knowledge.
            - Provide a score (0-10) and helpful feedback.
            - CRITICAL: You must return a JSON object with a "graded_answers" list.
            - CRITICAL: Each item in the list MUST include the exact "question_id" from the input.

            JSON STRUCTURE:
            {{
                "overall_feedback": "Summary...",
                "graded_answers": [
                    {{
                        "question_id": <int>, 
                        "score": <int>,
                        "feedback": "Specific feedback..."
                    }}
                ]
            }}
            """
        prompt = ChatPromptTemplate.from_template(grading_prompt_template)
        # Using 8b here as requested - it is fast and good at evaluating text against a reference
        grading_chain = prompt | llm_fast | JsonOutputParser()
        print("AI Grading chain initialized.")
    return grading_chain


def get_lesson_plan_chain():
    """Lesson Plan - Uses Complex Model for structured creativity."""
    global lesson_plan_chain
    if lesson_plan_chain is None:
        print("Initializing Lesson Plan chain...")
        lesson_plan_prompt_template = """
                You are an expert instructional designer. Your task is to create a complete lesson plan and presentation based ONLY on the provided context.
                Follow the teacher's instructions carefully.

                TEACHER'S INSTRUCTIONS:
                ---
                {instructions}
                ---

                CONTEXT:
                ---
                {context}
                ---

                Generate a single, valid JSON object following this exact structure:
                {{
                    "lesson_title": "A concise and engaging title for the lesson",
                    "learning_objectives": ["Objective 1", "Objective 2"],
                    "key_concepts": ["Concept 1 with brief definition", "Concept 2 with brief definition"],
                    "slides": [
                        {{
                            "title": "Title of Slide 1",
                            "bullet_points": ["Point 1", "Point 2"],
                            "speaker_notes": "Private notes for the teacher for this slide."
                        }}
                    ],
                    "review_questions": [
                        {{
                          "question_text": "...", "question_type": "...", "options": [...], "correct_answer": "..."
                        }}
                    ]
                }}
                """
        prompt = ChatPromptTemplate.from_template(lesson_plan_prompt_template)
        # Using 70b for high-quality structure generation
        lesson_plan_chain = prompt | llm_complex | JsonOutputParser()
        print("Lesson Plan chain initialized.")
    return lesson_plan_chain