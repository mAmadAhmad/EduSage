# 1. For general RAG testing
RAG_PROMPT_TEMPLATE = """
You are an expert educational assistant. Based ONLY on the following context, provide a clear and concise answer to the question. 
If the information is not in the context, say that you cannot find the answer in the provided documents.

Context: {context}
Question: {question}
Answer:
"""

# 2. For quiz generation
QUIZ_GENERATION_PROMPT = """
        ROLE:
        You are a Senior Pedagogue and Assessment Specialist. Your goal is to generate a high-quality, high-fidelity assessment based STRICTLY on the provided Context.

        TASK:
        Analyze the Context and generate:
        1. Exactly {num_mcq} Multiple Choice Questions (MCQ).
        2. Exactly {num_short_answer} Short Answer (Subjective) questions.

        CONSTRAINTS & LOGIC:
        - SOURCE TRUTH: Use ONLY the provided context. If a fact is not in the context, do not include it.
        - DIFFICULTY: Maintain a {difficulty} level throughout.
        - MCQ FORMAT: Exactly 4 options per question. Distractors (wrong answers) must be plausible but clearly incorrect based on the text.
        - SUBJECTIVE FORMAT: The "options" field must be null. The "correct_answer" must be a detailed "Model Answer" (2-3 sentences).
        - KEYWORD EXTRACTION (CRITICAL): For every "Short Answer" question, you must identify 3 to 5 "Essential Keywords". These are technical terms, names, or specific concepts found in the "correct_answer" that a student MUST mention to demonstrate mastery.
        - JSON INTEGRITY: Output must be a single, valid JSON object. Do not include any markdown formatting wrappers (like ```json) unless explicitly asked; just the raw JSON.

        TEACHER'S CUSTOM INSTRUCTIONS:
        {custom_instructions}

        JSON SCHEMA:
        {{
          "title": "A concise, descriptive title for the quiz",
          "questions": [
            {{
              "question_text": "string",
              "question_type": "MCQ",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correct_answer": "string",
              "keywords": null
            }},
            {{
              "question_text": "string",
              "question_type": "Short Answer",
              "options": null,
              "correct_answer": "A detailed 2-3 sentence model answer.",
              "keywords": ["keyword1", "keyword2", "keyword3"] 
            }}
          ]
        }}

        CONTEXT:
        ---
        {context}
        ---
        """