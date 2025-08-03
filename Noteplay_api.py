from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline, AutoTokenizer
import torch
import re

app = FastAPI()

device = 0 if torch.cuda.is_available() else -1

MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"
classifier = pipeline("text-classification", model=MODEL_NAME, device=device)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

class InputText(BaseModel):
    text: str

@app.post("/analyze")
def analyze_sentiment(input: InputText):
    def smart_chunk_text(text, max_tokens=1536, num_chunks=3):
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=max_tokens)
        input_ids = inputs["input_ids"][0]
        if len(input_ids) < max_tokens:
            repeats_needed = (max_tokens // len(input_ids)) + 1
            input_ids = input_ids.repeat(repeats_needed)
            input_ids = input_ids[:max_tokens]
        full_text = tokenizer.decode(input_ids, skip_special_tokens=True)
        sentences = re.split(r'[.!?]+', full_text)
        sentences = [s.strip() for s in sentences if s.strip()]
        target_chunk_size = max_tokens // num_chunks
        chunks = []
        current_chunk = []
        current_length = 0
        for sentence in sentences:
            sentence_tokens = tokenizer(sentence, return_tensors="pt", truncation=True, max_length=target_chunk_size)
            sentence_length = len(sentence_tokens["input_ids"][0])
            if current_length + sentence_length > target_chunk_size and current_chunk:
                chunk_text = " ".join(current_chunk)
                chunks.append(chunk_text)
                current_chunk = [sentence]
                current_length = sentence_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        if current_chunk:
            chunk_text = " ".join(current_chunk)
            chunks.append(chunk_text)
        while len(chunks) < num_chunks:
            longest_chunk_idx = max(range(len(chunks)), key=lambda i: len(chunks[i]))
            longest_chunk = chunks[longest_chunk_idx]
            sentences_in_chunk = re.split(r'[.!?]+', longest_chunk)
            sentences_in_chunk = [s.strip() for s in sentences_in_chunk if s.strip()]
            if len(sentences_in_chunk) > 1:
                mid_point = len(sentences_in_chunk) // 2
                first_half = ". ".join(sentences_in_chunk[:mid_point]) + "."
                second_half = ". ".join(sentences_in_chunk[mid_point:])
                chunks[longest_chunk_idx] = first_half
                chunks.insert(longest_chunk_idx + 1, second_half)
            else:
                chunks.append(longest_chunk)
        chunks = chunks[:num_chunks]
        return chunks

    text_chunks = smart_chunk_text(input.text, max_tokens=1536, num_chunks=3)
    chunk_results = []
    for i, chunk_text in enumerate(text_chunks):
        chunk_inputs = tokenizer(chunk_text, return_tensors="pt", truncation=True, max_length=512)
        chunk_inputs = {k: v.to(classifier.model.device) for k, v in chunk_inputs.items()}
        outputs = classifier.model(**chunk_inputs)
        logits = outputs.logits if hasattr(outputs, "logits") else outputs[0]
        scores = logits.softmax(dim=1).squeeze()
        label_id = scores.argmax().item()
        label = classifier.model.config.id2label[label_id]
        score = scores[label_id].item()
        chunk_results.append({
            "chunk": i + 1,
            "sentiment": label,
            "score": round(score, 4),
            "text_preview": chunk_text[:100] + "..." if len(chunk_text) > 100 else chunk_text
        })

    emotion_counts = {}
    total_score = 0
    for result in chunk_results:
        emotion = result["sentiment"]
        score = result["score"]
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        total_score += score

    if emotion_counts:
        overall_emotion = max(emotion_counts, key=emotion_counts.get)
        if list(emotion_counts.values()).count(max(emotion_counts.values())) > 1:
            max_count = max(emotion_counts.values())
            tied_emotions = [e for e, c in emotion_counts.items() if c == max_count]
            emotion_avg_scores = {}
            for emotion in tied_emotions:
                scores_for_emotion = [r["score"] for r in chunk_results if r["sentiment"] == emotion]
                emotion_avg_scores[emotion] = sum(scores_for_emotion) / len(scores_for_emotion)
            overall_emotion = max(emotion_avg_scores, key=emotion_avg_scores.get)
    else:
        overall_emotion = "neutral"

    return {
        "sentiment": overall_emotion,
        "score": round(total_score / len(chunk_results), 4),
        "chunk_analysis": chunk_results
    }
