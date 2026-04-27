import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.services import vector_service

# Weights for the Final Weighted Score
WEIGHT_SEMANTIC = 0.4
WEIGHT_KEYWORD = 0.3
WEIGHT_LLM = 0.3


async def calculate_hybrid_grade(question_text: str, correct_answer: str, student_answer: str,
                                 reference_context: str = ""):
    """Calculating hybrid grade: Semantic similarity + Keyword matching + LLM reasoning"""

    # 1. Semantic similarity
    semantic_score = _calculate_cosine_similarity(student_answer, correct_answer)

    # 2. Keyword matching
    # We await the keywords extraction
    keywords = await _extract_keywords(correct_answer)
    keyword_score, matched_keywords, missing_keywords = _calculate_keyword_match(student_answer, keywords)

    # 3. LLM reasoning
    llm_feedback = await _generate_llm_evaluation(
        question=question_text,
        student_answer=student_answer,
        correct_answer=correct_answer,
        semantic_score=semantic_score,
        keyword_score=keyword_score,
        matched_keywords=matched_keywords,
        missing_keywords=missing_keywords,
        context=reference_context
    )

    # 4. Final combined calculation
    llm_score_val = llm_feedback.get('score', 0)
    # Safety check for score type
    if isinstance(llm_score_val, str):
        try:
            llm_score_val = float(llm_score_val)
        except:
            llm_score_val = 0

    llm_score_normalized = llm_score_val / 10.0

    final_score_normalized = (
            (semantic_score * WEIGHT_SEMANTIC) +
            (keyword_score * WEIGHT_KEYWORD) +
            (llm_score_normalized * WEIGHT_LLM)
    )

    final_score = round(final_score_normalized * 10, 1)

    return {
        "final_score": final_score,
        "breakdown": {
            "semantic_score": round(semantic_score, 2),
            "keyword_score": round(keyword_score, 2),
            "llm_score": llm_score_val
        },
        "keywords": {
            "matched": matched_keywords,
            "missing": missing_keywords,
        },
        "feedback": llm_feedback.get('feedback', 'No feedback generated.')
    }


def _calculate_cosine_similarity(text1: str, text2: str) -> float:
    try:
        if not text1 or not text2: return 0.0
        emb1 = vector_service.embedding_model.embed_query(text1)
        emb2 = vector_service.embedding_model.embed_query(text2)
        vec1 = np.array([emb1])
        vec2 = np.array([emb2])
        return float(cosine_similarity(vec1, vec2)[0][0])
    except Exception as e:
        print(f"Error in cosine calc: {e}")
        return 0.0


async def _extract_keywords(text: str):
    """Uses Llama 8b to extract key terms."""
    prompt = ChatPromptTemplate.from_template("""
    You are a keyword extraction API. Extract 3 to 5 most important distinct keywords or phrases from the text below.
    Return ONLY a valid JSON object with a single key "keywords" containing a list of strings.

    Text: {text}

    Output Format: {{ "keywords": ["word1", "word2"] }}
    """)

    # Keep the JSON bind
    llm_json = vector_service.llm_fast.bind(response_format={"type": "json_object"})

    chain = prompt | llm_json | JsonOutputParser()
    try:
        result = await chain.ainvoke({"text": text})
        # Extract the list from the dictionary
        return result.get("keywords", [])
    except Exception as e:
        print(f"Keyword extraction failed: {e}")
        return []

def _calculate_keyword_match(student_text: str, keywords: list):
    if not keywords or len(keywords) == 0:
        return 1.0, [], []

    matched = [
        k for k in keywords
        if re.search(rf'\b{re.escape(k)}\b', student_text, re.IGNORECASE)
    ]
    missing = [k for k in keywords if k not in matched]

    score = len(matched) / len(keywords)
    return score, matched, missing


async def _generate_llm_evaluation(question, student_answer, correct_answer, semantic_score, keyword_score,
                                   matched_keywords, missing_keywords, context):
    prompt = ChatPromptTemplate.from_template("""
    You are a strict and highly analytical grading API. Evaluate the logical correctness of the student's answer.

    Question: {question}
    Correct Answer: {correct_answer}
    Student Answer: {student_answer}
    Reference Context: {context}

    --- BACKGROUND METRICS ---
    Semantic Similarity: {semantic_score:.2f}/1.0
    Missing Keywords: {missing_keywords}

    INSTRUCTIONS:
    1. DO NOT simply restate the background metrics. Use them only to guide your scrutiny.
    2. Focus strictly on logical reasoning: actively hunt for misconceptions, incorrect negations, or flawed justifications in the student's text.
    3. If the student includes factually incorrect statements or defends a wrong concept (even if they used the correct keywords), penalize the score and explicitly explain the logical flaw.
    4. Provide an integer "score" (0-10) based on conceptual accuracy, and a specific "feedback" string.

    You MUST output ONLY valid JSON with keys "score" and "feedback".
        
    """)

    llm_json = vector_service.llm_fast.bind(response_format={"type": "json_object"})
    chain = prompt | llm_json | JsonOutputParser()

    return await chain.ainvoke({
        "question": question,
        "correct_answer": correct_answer,
        "student_answer": student_answer,
        "context": context,
        "semantic_score": semantic_score,
        "missing_keywords": missing_keywords
    })