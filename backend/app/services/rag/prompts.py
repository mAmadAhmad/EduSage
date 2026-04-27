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
        You are an expert educator and quiz creator. Your task is to generate a quiz based ONLY on the provided context.
        Do not use any external knowledge.

        Follow these instructions precisely:
        1.  Generate exactly {num_mcq} Multiple Choice Questions (MCQ).
        2.  Generate exactly {num_short_answer} Short Answer questions.
        3.  The quiz difficulty should be {difficulty}.
        4.  For MCQs, provide exactly 4 options.
        5.  For Short Answer questions, the "options" field MUST be null.
        6.  Every question MUST have a "correct_answer" field. For Short Answer questions, the "correct_answer" MUST be a detailed, comprehensive explanation consisting of at least 2 to 3 full sentences.
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
