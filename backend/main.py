from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from langchain_community.document_loaders import PyPDFLoader
from rag import process_pdf, ocr_image, ocr_pdf, generate_answer, generate_exam_blueprint, save_to_vector, delete_file_from_vectorstore
from typing import List
from pydantic import BaseModel
import tempfile
import os
import shutil
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from langchain_core.documents import Document
import requests
import cloudinary
import cloudinary.uploader
from pinecone import Pinecone
import re
import cloudinary.api




# Load the secret variables from the .env file
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

#GLobal variable
db_client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global db_client, db
    mongo_url = os.getenv("MONGODB_URL")
    # Connect to Atlas
    db_client = AsyncIOMotorClient(mongo_url)
    db = db_client["study_agent_db"]
    print("✅ Connected to MongoDB Atlas Cloud!")

@app.on_event("shutdown")
async def shutdown_db_client():
    db_client.close()
    print("❌ Disconnected from MongoDB.")


cloudinary.config(
    cloud_name=os.getenv("CLOUD_NAME"),
    api_key=os.getenv("CLOUD_API_KEY"),
    api_secret=os.getenv("CLOUD_API_SECRET")
)

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))


class AskRequest(BaseModel):
    question: str
    user: str
    subject: str
    subject_name: str
    yt: bool = False

class Subject(BaseModel):
    id: str
    name: str
    iconColor: str
    image: str
    user_id: str

def sanitize_cloud_name(name: str) -> str:
    # Replaces spaces with underscores and removes special characters like &
    name = name.replace(" ", "_")
    return re.sub(r'[^a-zA-Z0-9_-]', '', name)


@app.get("/")
def home():
    return {"message": "Study AI running 🚀"}

# --- 1. CREATE SUBJECT ---
@app.post("/api/subjects")
async def create_subject(subject: Subject):
    subject_dict = subject.dict()
    await db["subjects"].insert_one(subject_dict)

    return {"message": "Subject created successfully in cloud"}

# --- 2. GET ALL SUBJECTS ---
@app.get("/api/subjects")
async def get_subjects(user: str):
    subjects = []
    cursor = db["subjects"].find({"user_id": user}, {"_id": 0}) 
    async for document in cursor:
        subjects.append(document)

    return {"subjects": subjects}

# --- 3. DELETE SUBJECT ---
@app.delete("/api/subjects/{subject_id}")
async def delete_subject(subject_id: str, user: str):
    # 1. Delete from MongoDB Atlas Cloud
    delete_result = await db["subjects"].delete_one({
        "id": subject_id,
        "user_id": user
    })

    # delete chats, blueprints, files
    await db["chats"].delete_many({"subject_id": subject_id, "user_id": user})
    await db["blueprints"].delete_many({"subject_id": subject_id, "user_id": user})
    await db["files"].delete_many({"subject_id": subject_id, "user_id": user})

    # 2. Completely wipe the Pinecone Namespace for this subject
    try:
        index = pc.Index("subject-specific-ai") # Ensure this matches your Pinecone index name
        
        safe_user = sanitize_cloud_name(user)
        safe_subject = sanitize_cloud_name(subject_id)
        namespace = f"{safe_user}_{safe_subject}"

        index.delete(delete_all=True, namespace=namespace)
        print(f"🗑️ Wiped Pinecone namespace: {namespace}")
    except Exception as e:
        print(f"⚠️ Pinecone delete error (might be empty): {e}")


    # 3. Delete entire folder from Cloudinary
    try:
        safe_user = sanitize_cloud_name(user)
        safe_subject = sanitize_cloud_name(subject_id)
        folder_path = f"{safe_user}/{safe_subject}"
        
        # This deletes all files inside the folder, then deletes the folder itself
        cloudinary.api.delete_resources_by_prefix(folder_path)
        cloudinary.api.delete_folder(folder_path)
        print(f"🗑️ Wiped Cloudinary folder: {folder_path}")
    except Exception as e:
        print(f"⚠️ Cloudinary folder delete error: {e}") 

    if delete_result.deleted_count == 1:
        return {"message": "Subject, DB records, and Vectors permanently deleted"}
    

    return {"message": "Subject not found in database"}


# Helper function for the heavy ML stuff
def run_heavy_ml(temp_file_path, file_ext, stored_name, subject, user):
    if file_ext == "pdf":
        loader = PyPDFLoader(temp_file_path)
        documents = loader.load()
        full_text = "".join([doc.page_content for doc in documents]).strip()
        
        if len(full_text) > 50:
            process_pdf(temp_file_path, stored_name, subject, user) 
        else:
            print("pdf is not readable, switching to OCR")
            text = ocr_pdf(temp_file_path)
            if not text.strip(): raise Exception("OCR failed")
            docs = [Document(page_content=text, metadata={"source": stored_name})]
            save_to_vector(docs, stored_name, subject, user)
    elif file_ext in ["png", "jpg", "jpeg"]:
        print("Its an image, starting OCR")
        text = ocr_image(temp_file_path)
        if not text.strip(): raise Exception("OCR failed")
        docs = [Document(page_content=text, metadata={"source": stored_name})]
        save_to_vector(docs, stored_name, subject, user)

# The Async Background Task
async def process_and_log_background(temp_file_path: str, file_ext: str, filename: str, stored_name: str, subject: str, user: str):
    try:
        # 1. Run the heavy ML in a threadpool so the server doesn't freeze (Allows switching subjects!)
        await run_in_threadpool(run_heavy_ml, temp_file_path, file_ext, stored_name,  subject, user)

        # 2. It succeeded! Save to MongoDB history
        chat_document = {
            "subject_id": subject,
            "user_id": user,
            "question": f"📎 Uploaded file: {filename}",
            "answer": f"✅ Successfully processed **{filename}**! It is now saved in my memory.",
            "videos": [],
            "timestamp": datetime.now()
        }
        await db["chats"].insert_one(chat_document)

    except Exception as e:
        print(f"❌ Background error for {filename}:", e)
        # It failed! Save the error to history
        error_document = {
            "subject_id": subject,
            "user_id": user,
            "question": f"📎 Attempted to upload: {filename}",
            "answer": f"❌ Failed to process **{filename}**. The file might be corrupted or too complex.",
            "videos": [],
            "timestamp": datetime.now()
        }
        await db["chats"].insert_one(error_document)
        
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)



MAX_FILE_SIZE = 10 * 1024 * 1024
@app.post("/upload")
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: str = Form(...),
    subject: str = Form(...)
):

    if not file:
        return {"error": "No file uploaded"}
    
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    content = await file.read()

    # Sanitize the names so Cloudinary doesn't crash!
    safe_user = sanitize_cloud_name(user)
    safe_subject = sanitize_cloud_name(subject)

    upload_result = cloudinary.uploader.upload(
        content,
        resource_type="auto",
        folder=f"{safe_user}/{safe_subject}"
    )
    file_url = upload_result["secure_url"]
    print(f"✅ File saved to Cloudinary: {file_url}")

    file_document = {
        "subject_id": subject,
        "user_id": user,
        "filename": file.filename,
        "stored_name": unique_name,
        "cloudinary_url": file_url,
        "cloudinary_public_id": upload_result["public_id"],
        "resource_type": upload_result["resource_type"],
        "uploaded_at": datetime.now()
    }
    await db["files"].insert_one(file_document)

    file_ext = file.filename.split(".")[-1].lower()

    print("⏳ Starting vector processing...")

    # 1. Create file with delete=False so Windows doesn't lock it aggressively
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}")
    temp_file_path = temp_file.name
    
    # Write the content and explicitly close it to release the Windows lock!
    temp_file.write(content)
    temp_file.flush()
    temp_file.close() 
    # Trigger the new background task!
    background_tasks.add_task(
        process_and_log_background, 
        temp_file_path, 
        file_ext, 
        file.filename, 
        unique_name,
        subject, 
        user
    )

    # Instantly release the user!
    return {"status": "uploaded", "filename": file.filename}

@app.delete("/delete-file")
async def delete_file(stored_name: str, subject: str, user: str):

    file_doc = await db["files"].find_one({
        "subject_id": subject,
        "user_id": user,
        "stored_name": stored_name
    })
    if not file_doc:
        return {"error": "File not found"}
    
    # 1. Delete from Cloudinary Cloud
    if "cloudinary_public_id" in file_doc:
        try:
            cloudinary.uploader.destroy(
                file_doc["cloudinary_public_id"],
                resource_type=file_doc.get("resource_type", "image") # Defaults to image if not found
            )
            print(f"🗑️ Deleted {stored_name} from Cloudinary.")
        except Exception as e:
            print(f"⚠️ Cloudinary delete error: {e}")
    

    # Delete from MongoDB
    await db["files"].delete_one({
        "subject_id": subject,
        "user_id": user,
        "stored_name": stored_name
    })

    #delete from pinecone
    delete_file_from_vectorstore(stored_name, subject, user)

    return {"message": "File deleted"}


@app.post("/ask")
async def ask(req: AskRequest):

    # GRAB RECENT CHAT HISTORY FROM MONGODB
    cursor = db["chats"].find(
        {"subject_id": req.subject, "user_id": req.user}, 
        {"_id": 0}
    ).sort("timestamp", -1).limit(5)
    
    raw_history = []
    async for doc in cursor:
        raw_history.append(doc)
    raw_history.reverse() #old to new
    chat_history = [(msg["question"], msg["answer"]) for msg in raw_history]
    
    response = generate_answer(req.question, req.subject, req.subject_name, req.user, chat_history)

    videos = []

    if req.yt:
        search_query = f"{req.question} {req.subject_name} tutorial"
        videos = get_youtube_videos(search_query)


    #Saving
    chat_document = {
        "subject_id": req.subject,
        "user_id": req.user,
        "question": req.question,
        "answer": response,
        "videos": videos,
        "timestamp": datetime.now()
    }
    await db["chats"].insert_one(chat_document)

    
    return {
        "answer": response,
        "videos": videos
        }



@app.get("/history")
async def get_history(subject: str, user: str):
    # Fetch all chats for this specific subject, sorted by oldest to newest
    cursor = db["chats"].find(
        {"subject_id": subject, "user_id": user}, 
        {"_id": 0} # Hide the ugly Mongo ID
    ).sort("timestamp", 1)
    
    history = []
    async for document in cursor:
        history.append(document)
        
    return {"history": history}


@app.post("/generate-paper")
async def generate_paper_endpoint(
    user: str = Form(...), 
    subject: str = Form(...), 
    exam_type: str = Form(...),
    files: List[UploadFile] = File(...)
):
    temp_pyq_paths = [] 
    
    try:
        # Create secure temp files for each uploaded PYQ
        for file in files:
            content = await file.read()
            file_ext = file.filename.split(".")[-1].lower()
            
            # Use delete=False and manually close it
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}")
            temp_file.write(content)
            temp_file.flush()
            temp_file.close() # Release the Windows lock
            
            temp_pyq_paths.append(temp_file.name)

        # Run the AI Analysis
        blueprint_markdown = generate_exam_blueprint(
            pyq_paths=temp_pyq_paths, 
            exam_type=exam_type,
            subject=subject, 
            user=user
        )

        # Save to MongoDB
        blueprint_document = {
            "subject_id": subject,
            "user_id": user,
            "exam_type": exam_type,
            "content": blueprint_markdown,
            "date": datetime.now().strftime("%d-%m-%Y")
        }
        await db["blueprints"].insert_one(blueprint_document)
        
        return {"status": "success", "blueprint": blueprint_markdown}

    except Exception as e:
        print(f"❌ Error generating paper: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Explicitly destroy all the temporary PYQs, even if the AI crashes
        for path in temp_pyq_paths:
            if os.path.exists(path):
                os.remove(path)
        print("🗑️ Temporary PYQs securely destroyed.")
    

@app.get("/blueprints")
async def get_blueprints(subject: str, user: str):
    try:
        print(f"📥 Fetching blueprints for subject={subject}, user={user}")
        cursor = db["blueprints"].find(
            {"subject_id": subject, "user_id": user},
            {"_id": 0}
        ).sort("date", 1)
        
        blueprints = []
        async for document in cursor:
            blueprints.append(document)
            
        return {"blueprints": blueprints}

    except Exception as e:
        print(f"❌ Error in get_blueprints: {e}")
        import traceback
        traceback.print_exc()
        return {"blueprints": []}


@app.get("/files")
async def get_files(subjectId: str, user: str):
    cursor = db["files"].find(
        {"subject_id": subjectId, "user_id": user},
        {"_id": 0}
    )

    files = []
    async for doc in cursor:
        files.append(doc)

    return {"files": files}


def get_youtube_videos(query):
    YT_API_KEY = os.getenv("YT_API_KEY")

    url = "https://www.googleapis.com/youtube/v3/search"

    params = {
        "part": "snippet",
        "q": query,
        "key": YT_API_KEY,
        "maxResults": 3,
        "type": "video"
    }

    res = requests.get(url, params=params).json()

    print(res)

    videos = []
    for item in res.get("items", []):
        videos.append({
            "title": item["snippet"]["title"],
            "videoId": item["id"]["videoId"]
        })

    return videos