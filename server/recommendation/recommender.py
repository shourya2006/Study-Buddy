import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from googleapiclient.discovery import build
from pinecone import Pinecone
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY) if YOUTUBE_API_KEY else None

pc = Pinecone(api_key=PINECONE_API_KEY) if PINECONE_API_KEY else None
index = pc.Index(PINECONE_INDEX_NAME) if pc and PINECONE_INDEX_NAME else None

openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1024


def generate_embedding(text):
    if not openai_client:
        raise ValueError("OPENAI_API_KEY is not set")
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return response.data[0].embedding


def get_rag_chunks(topic_title, subject_id, top_k=8):
    if not index:
        print("[RAG] Pinecone not configured, skipping RAG retrieval")
        return []

    try:
        query_embedding = generate_embedding(topic_title)
        results = index.query(
            namespace=subject_id,
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
        )

        chunks = []
        for match in results.get("matches", []):
            if match["score"] > 0.25:
                chunk_text = match["metadata"].get("chunkText", "")
                if chunk_text:
                    chunks.append({
                        "text": chunk_text,
                        "score": match["score"],
                        "title": match["metadata"].get("title", ""),
                    })

        print(f"[RAG] Retrieved {len(chunks)} relevant chunks for '{topic_title}'")
        return chunks
    except Exception as e:
        print(f"[RAG] Error querying Pinecone: {e}")
        return []


def extract_subtopics(topic_title, chunks, max_subtopics=5):
    if not chunks:
        return []

    all_text = " ".join([c["text"] for c in chunks])

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=200,
        ngram_range=(1, 3),
        sublinear_tf=True,
    )

    try:
        tfidf_matrix = vectorizer.fit_transform([all_text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray().flatten()

        topic_words = set(topic_title.lower().split())
        scored_terms = []
        for i, term in enumerate(feature_names):
            term_words = set(term.lower().split())
            if not term_words.issubset(topic_words) and len(term) > 3:
                scored_terms.append((term, scores[i]))

        scored_terms.sort(key=lambda x: x[1], reverse=True)

        subtopics = [term for term, score in scored_terms[:max_subtopics]]
        print(f"[Subtopics] Extracted for '{topic_title}': {subtopics}")
        return subtopics
    except Exception as e:
        print(f"[Subtopics] Error extracting: {e}")
        return []


def fetch_youtube_candidates(query, max_results=15):
    if not youtube:
        raise ValueError("YOUTUBE_API_KEY is not set")

    try:
        request = youtube.search().list(
            part="snippet",
            q=query,
            type="video",
            maxResults=max_results,
            relevanceLanguage="en",
            videoDuration="medium",
            order="relevance",
        )
        response = request.execute()
    except Exception as e:
        print(f"[YouTube] Error searching: {e}")
        return []

    candidates = []
    seen_ids = set()
    for item in response.get("items", []):
        video_id = item["id"]["videoId"]
        if video_id in seen_ids:
            continue
        seen_ids.add(video_id)

        snippet = item["snippet"]
        candidates.append({
            "videoId": video_id,
            "title": snippet["title"],
            "description": snippet["description"],
            "channelTitle": snippet["channelTitle"],
            "thumbnail": snippet["thumbnails"]["high"]["url"],
            "publishedAt": snippet["publishedAt"],
        })

    return candidates


def compute_relevance_scores(context_text, candidates):
    if not candidates:
        return []

    candidate_texts = [
        f"{c['title']} {c['description']}" for c in candidates
    ]

    corpus = [context_text] + candidate_texts

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=5000,
        ngram_range=(1, 2),
        sublinear_tf=True,
    )

    tfidf_matrix = vectorizer.fit_transform(corpus)

    context_vector = tfidf_matrix[0:1]
    candidate_vectors = tfidf_matrix[1:]

    similarities = cosine_similarity(context_vector, candidate_vectors).flatten()

    scored_candidates = []
    for i, candidate in enumerate(candidates):
        scored_candidates.append({
            **candidate,
            "similarityScore": round(float(similarities[i]), 4),
        })

    scored_candidates.sort(key=lambda x: x["similarityScore"], reverse=True)
    return scored_candidates


def recommend(topic_title, course_name="", subject_id="", top_k=1):
    rag_chunks = []
    subtopics = []
    if subject_id:
        rag_chunks = get_rag_chunks(topic_title, subject_id)
        subtopics = extract_subtopics(topic_title, rag_chunks)

    main_topic = topic_title.split(",")[0].strip()

    if subtopics:
        subtopic_str = " ".join(subtopics[:3])
        search_query = f"{main_topic} {subtopic_str} lecture tutorial".strip()
    else:
        search_query = f"{main_topic} {course_name} lecture tutorial".strip()

    print(f"[Search] Query: '{search_query}'")

    candidates = fetch_youtube_candidates(search_query, max_results=15)
    print(f"[YouTube] Got {len(candidates)} candidates")

    context_parts = [topic_title, course_name]
    if subtopics:
        context_parts.extend(subtopics)
    if rag_chunks:
        context_parts.extend([c["text"] for c in rag_chunks[:3]])
    context_text = " ".join(filter(None, context_parts))

    scored = compute_relevance_scores(context_text, candidates)

    results = scored[:top_k]

    for r in results:
        r["url"] = f"https://www.youtube.com/watch?v={r['videoId']}"
        r["subtopicsUsed"] = subtopics

    return results


def recommend_for_subject(topics, subject_id="", top_k_per_topic=1):
    all_recommendations = []

    for topic in topics:
        title = topic.get("title", "")
        course_name = topic.get("courseName", "")

        try:
            recs = recommend(title, course_name, subject_id=subject_id, top_k=top_k_per_topic)
            all_recommendations.append({
                "topic": title,
                "courseName": course_name,
                "recommendations": recs,
            })
        except Exception as e:
            print(f"[Recommender] Error for topic '{title}': {e}")
            all_recommendations.append({
                "topic": title,
                "courseName": course_name,
                "recommendations": [],
                "error": str(e),
            })

    return all_recommendations
