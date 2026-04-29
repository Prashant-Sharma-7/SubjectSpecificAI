from langchain_community.document_loaders import PyPDFLoader
from langchain_core.prompts import PromptTemplate
from langchain_text_splitters import CharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from PIL import Image
from pdf2image import convert_from_path
from datetime import datetime
from dotenv import load_dotenv
from groq import Groq
import os
import re
from google import genai
import time
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
import platform

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=groq_api_key)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
INDEX_NAME = "subject-specific-ai"

def sanitize_cloud_name(name: str) -> str:
    name = name.replace(" ", "_")
    return re.sub(r'[^a-zA-Z0-9_-]', '', name)



def get_pinecone_vectorstore(subject, user):
    embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001",
        output_dimensionality=768
    )

    safe_user = sanitize_cloud_name(user)
    safe_subject = sanitize_cloud_name(subject)
    namespace = f"{safe_user}_{safe_subject}"

    return PineconeVectorStore(
        index_name=INDEX_NAME,
        embedding=embeddings,
        namespace=namespace
    )

def save_to_vector(docs, original_filename, subject, user):
    """Saves documents to Pinecone with the filename attached for easy deletion"""
    # Inject the filename into metadata so we can delete it later if needed
    for doc in docs:
        doc.metadata["source"] = original_filename 
        
    vectorstore = get_pinecone_vectorstore(subject, user)
    vectorstore.add_documents(docs)

def process_pdf(file_path, original_filename, subject, user):
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    docs = splitter.split_documents(documents)

    save_to_vector(docs, original_filename, subject, user)

def delete_file_from_vectorstore(filename, subject, user):
    """Deletes only the vectors associated with a specific file without rebuilding"""
    index = pc.Index(INDEX_NAME)
    
    safe_user = sanitize_cloud_name(user)
    safe_subject = sanitize_cloud_name(subject)
    namespace = f"{safe_user}_{safe_subject}"
    try:
        # Delete vectors where the metadata 'source' equals the filename
        index.delete(filter={"source": {"$eq": filename}}, namespace=namespace)
        print(f"🗑️ Deleted {filename} vectors from Pinecone.")
    except Exception as e:
        print("Pinecone delete error:", e)


def generate_answer(query: str, subject_id: str, subject_name: str, user: str, chat_history: list):

    #Rewrite query
    rewritten_query = rewrite_query(query, chat_history)
    print("🔁 Rewritten Query:", rewritten_query)

    #Load vector DB
    db = get_pinecone_vectorstore(subject_id, user)
    docs = []
    if db:
        docs = db.similarity_search(rewritten_query, k=4)

    sources = []

    if docs:
        sources = list(set([
            doc.metadata.get("source", "")
            for doc in docs
        ]))

    context = "\n".join([doc.page_content for doc in docs]) if docs else "NO STUDY MATERIAL AVAILABLE."


    #preparing history for giving it to ai
    history_text = "\n".join([
        f"Q: {q}\nA: {a}"
        for q, a in chat_history
    ]) if chat_history else "No previous Coversation."


    prompt = rf"""You are a strict RAG-based AI study tutor for the subject: {subject_name}.
    You have ONLY the study material given below. Never hallucinate or use external knowledge unless explicitly allowed.

    <context>
    {context}
    </context>

    <chat_history>
    {history_text}
    </chat_history>

    <question>
    {query}
    </question>

    CRITICAL RULES (follow exactly):

    1. Read the <context> carefully.
    2. Decide: Does the <context> contain information that directly answers the <question>?

    IF YES (context has relevant content):
    - Use the study material as the PRIMARY source.
    - You may add your own knowledge ONLY to explain clearly, give simple examples, or add exam tips.
    - Start with a 1-2 line definition.
    - Use proper Markdown: ## for main headings, ### for sub-headings.
    - Use **bold** ONLY for important terms (never as headings).
    - Use ONLY '-' for bullet points. Never use '•' or any other symbol.
    - Use numbered lists (1., 2., 3.) for processes.
    - For any mathematical expressions, formulas, coordinates, or matrices, ALWAYS use proper LaTeX syntax: enclose inline math in $...$ and display/block math (equations, matrices, arrays) in $$...$$. For coordinates use (x+1, y) with no extra spaces. For matrices, you MUST use this exact format inside $$...$$ (never use Unicode characters like  or plain text grids): $$ \begin{{bmatrix}} 1 & 2 \\ 3 & 4 \end{{bmatrix}} $$ or $$ \begin{{array}}{{ccc}} a & b & c \\ d & e & f \end{{array}} $$. Use & between columns and \\ between rows.
    - Keep headings short (max 5 words).
    - Keep paragraphs short and conversational.
    - Do NOT add any extra sections like "Exam Tips" unless the context itself mentions them.

    IF NO (context does NOT contain the answer OR says "NO STUDY MATERIAL AVAILABLE."):
    - Your response MUST start with EXACTLY this line and nothing before it:
        **This topic is not found in your {subject_name} notes.**
    - Then, immediately give a **clear, detailed, and student-friendly explanation** using your general knowledge.
    - Make it educational and helpful — like a good tutor would explain in class.
    - Use proper structure: definitions, key points, examples, and simple analogies where useful.
    - Use Markdown formatting (## headings, **bold**, bullet points with '-', numbered lists, LaTeX for math if needed).

    GENERAL RULES (apply always):
    - Answer directly and conversationally. Never start with "To answer your question", "Let's recall", etc.
    - Never create fake definitions.
    - Keep total response natural and connected to the <chat_history>.

    Few-shot examples:

    Example 1 (YES):
    <context>
    [some text explaining quantization levels and uniform vs non-uniform]
    </context>
    <question>What is quantization in digital image processing?</question>

    Correct output:
    Quantization is the process of mapping continuous analog intensity values to a finite set of discrete levels.

    ## Quantization Process
    - The range of intensity values is divided into discrete levels.
    - Each pixel is assigned one of these levels.

    ## Types of Quantization
    - Uniform quantization...
    (etc. — clean formatted answer)

    Example 2 (NO):
    <context>
    [notes about sampling and quantization in DIP]
    </context>
    <question>What is cricket?</question>

    Correct output:
    **This topic is not found in your {subject_name} notes, but here is a general explanation:**
    Cricket is a bat-and-ball team sport played between two teams of 11 players on a large oval field. The aim is to score more runs than the opposing team by hitting the ball and running between wickets.

    Now answer the actual question following the rules above.

    Answer:
    """
    
    #Generate answer
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.35,
            max_tokens=1100,
        )
        answer_text = response.choices[0].message.content

        # Format sources
        if "This topic is not found in your" not in answer_text:
            source_text = "\n\n---\n**Sources used:**\n"
            for s in sources:
                filename = os.path.basename(s)
                # Remove the UUID prefix from the filename (e.g., 'uuid_filename.pdf' -> 'filename.pdf')
                if "_" in filename:
                    filename = filename.split("_", 1)[-1]
                source_text += f"- {filename}\n"

            answer_text += source_text

        return answer_text

    except Exception as e:
        print("❌Error:", e)
        return "Error: " + str(e)

def rewrite_query(query, chat_history):
    
    history_text = "\n".join([
        f"Q: {q}\nA: {a}"
        for q, a in chat_history
    ]) if chat_history else "No previous history."

    prompt = f"""You are an expert query refiner for a RAG study tutor.

        Your ONLY job: Turn the Current Question into a standalone search query that a vector database can understand without seeing the chat history.

        STRICT RULES:
        - If the question is a follow-up (uses "it", "this", "them", "more", "explain", "example", etc.), expand it with the exact topic from history.
        - If the question is completely new/unrelated, return it UNCHANGED.
        - Output EXACTLY ONE LINE — the rewritten question only. No explanations, no quotes, no "Standalone:", nothing else.
        - Keep the user's original intent 100%.

        FEW-SHOT EXAMPLES:

        Example 1:
        Chat History:
        Q: What is mitosis?
        A: Mitosis is cell division...

        Current Question: What are the stages?
        Standalone Question: What are the stages of mitosis?

        Example 2:
        Chat History:
        Q: Explain vector addition.
        A: ...

        Current Question: Give an example of it.
        Standalone Question: Give an example of vector addition.

        Example 3:
        Chat History:
        Q: What is photosynthesis?
        A: ...

        Current Question: What is Newton's first law?
        Standalone Question: What is Newton's first law?

        NOW APPLY TO THIS:

        Chat History:
        {history_text}

        Current Question:
        {query}

        Standalone Question:
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print("Rewrite Error:", e)
        return query
    


# def save_chat(chat_path, question, answer):
    
#     history = load_chat(chat_path)

#     history.append({
#         "question": question,
#         "answer": answer
#     })

#     with open(chat_path, "w") as f:
#         json.dump(history, f, indent=2)

# def load_chat(chat_path):
#     if not os.path.exists(chat_path):
#         return []
    
#     with open(chat_path, "r") as f:
#         return json.load(f)



def extract_keywords_from_pyq(pyq_text: str):
    prompt = f"""
    You are an expert data extractor. Read the following exam questions and identify the 5 to 7 most important core concepts/topics being asked about.
    
    RULES:
    1. Output ONLY a single, comma-separated list of topics.
    2. Do NOT write sentences. Do NOT use bullet points.
    3. Example output: Histogram Equalization, High Pass Filters, Image Segmentation, Edge Detection
    4. Focus on frequently repeated or high-weightage topics.
    Exam Questions:
    {pyq_text}
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant", # Fast model for quick extraction
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=120,
        )
        print(response.choices[0].message.content.strip())
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("Keyword extraction failed:", e)
        # Fallback to a generic search if it fails
        return pyq_text[:600]

def generate_exam_blueprint(pyq_paths: list, exam_type: str, subject: str, user: str):
    print(f"🧠 Analyzing {len(pyq_paths)} PYQs and cross-referencing notes for {exam_type} exam...")
    
    # 1. Extract text from all PYQs (better handling for multiple files)
    all_pyq_text = ""
    pyq_sections = []   # Keep each PYQ separate for better analysis

    for i, path in enumerate(pyq_paths, 1):
        try:
            if path.endswith(".pdf"):    
                loader = PyPDFLoader(path)
                docs = loader.load()
                text = "\n".join([doc.page_content for doc in docs])
            
                if len(text) < 50: 
                    print(f"⚠️ PDF {i} appears to be scanned. Running OCR...")
                    text = ocr_pdf(path)
            else:
                print(f"🧠 Using OCR for image PYQ {i}...")
                text = ocr_image(path)

            if text.strip():
                all_pyq_text += f"\n\n=== PYQ {i} ===\n{text}\n"
                pyq_sections.append(text)
            else:
                print(f"⚠️ No text extracted from PYQ {i}")
        except Exception as e:
            print(f"Error reading PYQ {i}: {e}")

    if not all_pyq_text.strip():
        raise ValueError("Could not extract any text from the uploaded PYQs.")

    # Limit PYQ text size to prevent token crashing
    pyq_text_limited = all_pyq_text[:15000] 
    
    # 2. Better Keyword/Topic Extraction
    keywords_string = extract_keywords_from_pyq(pyq_text_limited[:5000])  # Increased from 3000
    keywords_list = [k.strip() for k in keywords_string.split(',') if k.strip()]

    # 3. Get relevant context from student's notes
    notes_context = "" 
    try:
        db = get_pinecone_vectorstore(subject, user)
        print("📚 Searching notes for relevant topics...")
        for keyword in keywords_list[:8]:   # Limit to top 8 keywords
            matched_docs = db.similarity_search(keyword, k=3)  # Increased from k=2
            notes_context += f"\n--- Notes for '{keyword}' ---\n"
            notes_context += "\n".join([doc.page_content for doc in matched_docs]) + "\n"
    except Exception as e:
        print(f"Vector search error: {e}")
        notes_context = "No notes available or error reading notes."
    


    # 3. Create the specialized Prompt
    prompt_template = """
    You are an expert college professor generating an Exam Blueprint. 
    
    Here are the Past Year Questions (PYQs):
    ---------------------
    {pyq_text}
    ---------------------

    Here is the student's uploaded Study Material / Notes:
    ---------------------
    {notes_context}
    ---------------------
    
    Based on BOTH the PYQs and the Study Material, generate a structured "{exam_type}" Exam Blueprint.
    Analyze the PYQs carefully:
    - Which topics appear most frequently across the question papers?
    - Which topics carry high weightage (long answers, numericals, derivations, diagrams, etc.)?
    - What kind of questions are usually asked?
    Then create the blueprint grounded in the student's notes.

    FORMATTING RULES:
    - Use Markdown properly.
    - Use ONLY '-' for bullet points. NEVER use '•'.
    - Use **bold** for important terms.
    
    # 🎯 {exam_type} Exam Blueprint

    ## 🔥 High-Priority Topics (Most Important - Frequently Asked)
    - **Topic Name**: Short description from notes + why it is important (based on how often it appeared in PYQs).

    ## ⚠️ Medium-Priority Topics
    - **Topic Name**: Short description + reason.

    ## 📌 Common Question Patterns
    - List 4-5 typical question styles seen in PYQs (e.g., "Derive the formula...", "Explain with diagram...", "Solve numerical problems on...").

    ## 💡 Pro Tips to Score High
    - Give 3-4 practical, actionable tips.

    Keep language simple, motivational, and student-friendly.
    Do not add any extra sections.
    """

    final_prompt = prompt_template.format(
        exam_type=exam_type.upper(), 
        pyq_text=pyq_text_limited,
        notes_context=notes_context[:9000]
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.3,
            max_tokens=1600,
        )
        blueprint_content = response.choices[0].message.content
        
        return blueprint_content

    except Exception as e:
        raise ValueError(f"Failed to generate blueprint: {str(e)}")

# def save_blueprint_history(blueprint_path, exam_type, content):
#     history = []
#     if os.path.exists(blueprint_path):
#         with open(blueprint_path, "r") as f:
#             history = json.load(f)
            
#     history.append({
#         "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
#         "exam_type": exam_type,
#         "content": content
#     })
    
#     with open(blueprint_path, "w") as f:
#         json.dump(history, f, indent=2)


def ocr_image(image_path):
    try:
        print(f"👁️ Extracting handwriting with Gemini Vision from: {image_path}")
        img = Image.open(image_path)
        
        prompt = """
        Extract ALL the text from this image exactly as written.
        - If there is messy handwriting, do your best to transcribe it accurately.
        - If there are math formulas, equations, or matrices, format them in proper LaTeX (use $ for inline, $$ for block).
        - Do not add any introductory or conversational text, just return the extracted text.
        """
        
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, img]
        )
        return response.text.strip()
        
    except Exception as e:
        print("Gemini OCR image error:", e)
        return ""

def ocr_pdf(pdf_path):
    try:
        print(f"👁️ Converting PDF to images for Gemini Vision: {pdf_path}")
        if platform.system() == "Windows":
            pages = convert_from_path(pdf_path, dpi=100, poppler_path=r"C:\poppler\poppler\Library\bin")
        # If running on the deployed Linux server, use the default system path
        else:
            pages = convert_from_path(pdf_path, dpi=100)
        
        full_text = ""
        batch_size = 3 # Process 3 pages at a time to stay under the 15 Requests/Min limit
        
        for i in range(0, len(pages), batch_size):
            batch = pages[i : i + batch_size]
            end_page = min(i + batch_size, len(pages))
            
            print(f"   -> Reading handwriting on pages {i+1} to {end_page}/{len(pages)}...")
            
            prompt = """
            Extract all text from these document pages. Transcribe handwriting carefully. 
            Format any math or equations in LaTeX. Return ONLY the text, keeping the logical order.
            """
            
            # Combine the prompt and all images in this batch into one payload
            contents = [prompt] + batch
            
            try:
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents
                )
                full_text += f"\n\n--- Pages {i+1} to {end_page} ---\n\n" + response.text
                
                # If there are still more pages to process, pause for 5 seconds to cool down the API
                if end_page < len(pages):
                    print("   ⏳ Pausing for 5 seconds to respect API rate limits...")
                    time.sleep(8)
                    
            except Exception as e:
                print(f"Error on batch {i+1}-{end_page}: {e}")
                raise e
                
        return full_text.strip()

    except Exception as e:
        print("Gemini OCR PDF error:", e)
        raise Exception(f"OCR PDF failed: {str(e)}")









