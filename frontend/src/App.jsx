import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchSubjects, createSubjectDB, deleteSubjectDB } from "./Services/api.js"; // Import the new API calls
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Home from "./Pages/HomePage/Home.jsx";
import "./Pages/HomePage/Home.css"; //so the modal and banner styles work globally
import ChatPage from "./Pages/ChatPage/ChatPage.jsx";
import PaperGen from "./Pages/PaperGen/PaperGen.jsx";
import ShowImp from "./Pages/ShowImp/ShowImp.jsx";
import NewSubModal from "./Components/NewSubModal/NewSubModal.jsx";
import ConfirmDeleteModal from "./Components/ConfirmDeleteModal/ConfirmDeleteModal.jsx"; 
import LoginPage from "./Pages/LoginPage/LoginPage.jsx";
import Loader from "./Components/Loader/Loader";


// --- 1. CONSTANTS MOVED HERE ---
const patterns = [
    "/pattern1.jpg",
    "/pattern2.png",
    "/pattern3.jpg",
    "/pattern4.jpg",
    "/pattern5.jpg",
];

const availableColors = ["#A8DADC", "#B2F2BB", "#FFC1CC", "#B39CD0", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF"];

export default function App() {

    const [subjects, setSubjects] = useState([]);
    const [subjectsLoaded, setSubjectsLoaded] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newSubName, setNewSubName] = useState("");

    const [selectedColor, setSelectedColor] = useState(availableColors[0]);
    const [isCreating, setIsCreating] = useState(false);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);
    
    const [subjectToDelete, setSubjectToDelete] = useState(null); // Holds the ID of the subject we want to delete
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteBanner, setShowDeleteBanner] = useState(false);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const triggerDeleteModal = (subjectId) => {
        setSubjectToDelete(subjectId);
    };
    const executeDelete = async () => {
        if (!subjectToDelete) return;
        
        setIsDeleting(true);
        
        await deleteSubjectDB(subjectToDelete, user.uid);
        
        setSubjects(subjects.filter(sub => sub.id !== subjectToDelete));
        
        setIsDeleting(false);
        setSubjectToDelete(null);

        setShowDeleteBanner(true);
        setTimeout(() => setShowDeleteBanner(false), 3000);
    };

    useEffect(() => {
        if (!user) return;
        const loadData = async () => {
            setSubjectsLoaded(false);
            const dbSubjects = await fetchSubjects(user.uid);
            setSubjects(dbSubjects);
            setSubjectsLoaded(true);
        };
        loadData();
    }, [user]);
  
    const handleCreateSubject = async () => {
        if (!newSubName.trim()) {
            alert("Please enter a subject name!");
            return;
        }

        // This regex ensures the name ONLY contains letters, numbers, dashes, or underscores.
        const isValid = /^[a-zA-Z0-9_-]+$/.test(newSubName);
        if (!isValid) {
            alert("Please use only letters and numbers. No spaces or special characters like & or @.");
            return;
        }

        setIsCreating(true);

        const randomImage = patterns[Math.floor(Math.random() * patterns.length)];
        const newId = `${newSubName}-${Date.now()}`; 
            
        const newSubject = { 
            id: newId, 
            name: newSubName, 
            iconColor: selectedColor, 
            image: randomImage,
            user_id: user.uid
        }

        await createSubjectDB(newSubject);

        setSubjects([...subjects, newSubject]);
        setShowModal(false);
        setNewSubName(""); 
        setSelectedColor(availableColors[0]);
        setIsCreating(false);
        setShowSuccessBanner(true);
        setTimeout(() => {
            setShowSuccessBanner(false);
        },3000);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Loader text="Authenticating..." />;
    }

    return (
        <Router>
            {/* GLOBAL BANNER */}
            {showSuccessBanner && (
                <div className="success-banner">✅ Subject successfully created!</div>
            )}

            {/* GLOBAL DELETE BANNER */}
            {showDeleteBanner && (
                <div className="success-banner delete-banner">🗑️ Subject permanently deleted.</div>
            )}

            {/* GLOBAL MODAL */}
            {showModal && (
                <NewSubModal 
                    closeModal={() => setShowModal(false)}
                    newSubName={newSubName}
                    setNewSubName={setNewSubName}
                    selectedColor={selectedColor}
                    setSelectedColor={setSelectedColor}
                    availableColors={availableColors}
                    handleCreateSubject={handleCreateSubject}
                    isCreating={isCreating} 
                />
            )}
            {subjectToDelete &&(
                <ConfirmDeleteModal
                closeModal={()=>setSubjectToDelete(null)}
                executeDelete={executeDelete}
                isDeleting={isDeleting}
                />
            )}


            {!user ? (
                <LoginPage />
            ) : (
                <Routes>   
                    <Route path="/"  element={
                        <Home 
                        subjects={subjects} 
                        subjectsLoaded={subjectsLoaded}
                        onOpenModal={() => setShowModal(true)} 
                        onDeleteSubject={triggerDeleteModal}
                        user={user}
                        />
                    }/>
                    
                    <Route path="/chat/:subjectId" element={
                        <ChatPage 
                        subjects={subjects} 
                        onOpenModal={() => setShowModal(true)} 
                        user={user}
                        />} 
                    />
                    <Route path="/paper-gen" element={
                        <PaperGen subjects={subjects} user={user}/>
                    } />
                    <Route path="/show-imp/:subjectId" element={
                        <ShowImp subjects={subjects} user={user}/>
                    } />
                </Routes>
            )}
        </Router>
    );
}