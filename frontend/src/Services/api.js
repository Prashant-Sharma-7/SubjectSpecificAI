const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const askQuestion = async (question, subject, user, subjectName, yt) => {
    try {
        const res = await fetch(`${BASE_URL}/ask`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
                question, 
                subject,
                user: user,
                subject_name: subjectName,
                yt
            }),
        });

        if (!res.ok) throw new Error("API Error");

        return await res.json();
    } catch (err) {
        console.error("Error:", err);
        return { answer: "Something went wrong" };
    }
};


export const uploadFile = async (file, user, subject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user", user);
    formData.append("subject", subject);

    // Assuming user is hardcoded as "testUser" for now, just like in your backend tests
    const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("File upload failed");
    }

    return await response.json();
};


export const fetchChatHistory = async (subject, user) => {
    try {
        const params = new URLSearchParams({ user, subject });
        const res = await fetch(`${BASE_URL}/history?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch history");
        return await res.json();
    } catch (err) {
        console.error("Error fetching history:", err);
        return { history: [] }; // Return empty array if it fails so the app doesn't crash
    }
};


export const generatePaper = async (user, subject, examType, fileArray) => {
    const formData = new FormData();
    formData.append("user", user);
    formData.append("subject", subject);
    formData.append("exam_type", examType);

    // Loop through the array of PDFs and append them all under the name "files"
    for (let i = 0; i < fileArray.length; i++) {
        formData.append("files", fileArray[i]);
    }

    try {
        const response = await fetch(`${BASE_URL}/generate-paper`, {
            method: "POST",
            body: formData, // Notice we do NOT set headers. The browser sets the multipart boundary automatically!
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to generate paper");
        }

        const data = await response.json();
        console.log("✅ Generate Paper Response:", data);   // ← Add this log
        return data;

    } catch (err) {
        console.error("Error in generatePaper:", err);
        throw err;
    }
};

export const fetchBlueprints = async (subject, user) => {
    try {
        const params = new URLSearchParams({ user, subject });
        const res = await fetch(`${BASE_URL}/blueprints?${params.toString()}`);
        
        if (!res.ok) {
            throw new Error("Failed to fetch blueprints")
        };

        const data = await res.json();
        console.log("Blueprints data:", data);
        return data;
        
    } catch (err) {
        console.error("Error fetching blueprints:", err);
        return { blueprints: [] }; 
    }
};

export const fetchFiles = async(subjectId, user)=>{
    try {
        const params = new URLSearchParams({ subjectId, user });
        const res = await fetch(`${BASE_URL}/files?${params.toString()}`);
        return res.json();
    } catch (err) {
        console.error("Error fetching files:", err);
        return { files: [] }; 
    }
}
export const deleteFile = async (filename, subject, user) => {
    try{
        const params = new URLSearchParams({ filename, subject, user });
        const res = await fetch(`${BASE_URL}/delete-file?${params.toString()}`, { 
            method: "DELETE" 
        });
        return await res.json();
    }catch(err){
        console.error("Error Deleting file:", err);
        return { files: [] }; 
    }

};


// 1. Fetch all subjects from MongoDB
export const fetchSubjects = async (user) => {
    try {
        const params = new URLSearchParams({ user });
        const response = await fetch(`${BASE_URL}/api/subjects?${params.toString()}`);
        const data = await response.json();
        return data.subjects;
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return [];
    }
};

// 2. Save a new subject to MongoDB
export const createSubjectDB = async (subjectData) => {
    try {
        const response = await fetch(`${BASE_URL}/api/subjects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subjectData),
        });
        return await response.json();
    } catch (error) {
        console.error("Error creating subject:", error);
    }
};

// 3. Delete a subject (and its local files)
export const deleteSubjectDB = async (subjectId, user) => {
    try {
        const encodedSubjectId = encodeURIComponent(subjectId);
        const params = new URLSearchParams({ user });
        
        const response = await fetch(`${BASE_URL}/api/subjects/${encodedSubjectId}?${params.toString()}`, {
            method: "DELETE",
        });
        return await response.json();
    } catch (error) {
        console.error("Error deleting subject:", error);
    }
};