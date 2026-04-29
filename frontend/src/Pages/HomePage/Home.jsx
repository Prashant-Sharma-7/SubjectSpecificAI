import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "./Home.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faTrash } from "@fortawesome/free-solid-svg-icons";
import { fetchFiles, fetchChatHistory } from "../../Services/api";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase"; // adjust path if needed
import Loader from "../../Components/Loader/Loader"
import { motion, AnimatePresence } from "framer-motion";
import Particles from "../../blocks/background/Particles/Particles.jsx";



export default function Home({ subjects,subjectsLoaded, onOpenModal, onDeleteSubject, user }) {
    const navigate = useNavigate();
    const profileRef = useRef();

    const [fileCounts, setFileCounts] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [loading, setLoading] = useState(true);
    const [showProfile, setShowProfile] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const truncateText = (text, limit = 40) => {
        if (!text) return "";
        return text.length > limit ? text.slice(0, limit) + "..." : text;
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfile(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user || !subjectsLoaded) return;

        const fetchAllData = async () => {
            try {
                // PARALLEL FILE COUNT
                const filePromises = subjects.map(sub =>
                    fetchFiles(sub.id, user.uid)
                );

                // PARALLEL CHAT HISTORY
                const chatPromises = subjects.map(sub =>
                    fetchChatHistory(sub.id, user.uid)
                );

                const fileResults = await Promise.all(filePromises);
                const chatResults = await Promise.all(chatPromises);

                // FILE COUNTS
                const counts = {};
                fileResults.forEach((data, index) => {
                    counts[subjects[index].id] = data.files.length;
                });

                // LAST MESSAGES
                const lastMsgs = {};
                chatResults.forEach((data, index) => {
                    const history = data.history;
                    if (history.length > 0) {
                        const last = history[history.length - 1];

                        lastMsgs[subjects[index].id] = {
                            text: last.question,
                            time: new Date(last.timestamp).toLocaleTimeString()
                        };
                    }
                });

                setFileCounts(counts);
                setLastMessages(lastMsgs);

            } catch (err) {
                console.error(err);
            }finally {
                setLoading(false);
            }
        };

        setLoading(true);
        fetchAllData();

    }, [subjects, user]);

    const handleLogout = async () => {
        await signOut(auth);
    };

    if (loading) {
        return <Loader text="Loading your subjects..." />;
    }

    return (
        <div className="home-bg">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <Particles
                particleColors={["#9D4EDD", "#c084fc", "#3D1A43"]}
                // particleColors={["#9D4EDD"]}
                particleCount={180}
                particleSpread={10}
                speed={0.08}
                particleBaseSize={90}
                moveParticlesOnHover={false}
                alphaParticles={false}
                disableRotation={false}
                pixelRatio={window.devicePixelRatio || 1}
                />
            </div>

            <div className="relative z-10">
                <div className="navbar">
                    <div className="Ailogo">
                        <img src="/testLogo.png" alt="Logo" />
                    </div>

                    {/* DESKTOP ONLY BUTTONS */}
                    <div className="functions desktop-only">
                        <button className="fn-button" onClick={onOpenModal}>
                            New Sub
                        </button>
                        <button className="fn-button" onClick={() => navigate("/paper-gen")}>
                            Generate Imp
                        </button>
                    </div>

                    {/* PROFILE (Always Visible) */}
                    <div className="profile-wrapper" ref={profileRef}>
                        <div className="profile-photo" onClick={() => setShowProfile(prev => !prev)}>
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>

                        <AnimatePresence>
                            {showProfile && (
                                <motion.div 
                                    className="profile-dropdown"
                                    initial={{ opacity: 0, y: -15, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                >
                                    <p className="profile-email">{user.email}</p>
                                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                {/* MOBILE BOTTOM DOCK (Visible only on phone) */}
                <div className="mobile-bottom-dock">
                    <button className="dock-btn main-action" onClick={onOpenModal}>
                        <span className="plus-icon">+</span> New Sub
                    </button>
                    <button className="dock-btn secondary-action" onClick={() => navigate("/paper-gen")}>
                        Generate Imp
                    </button>
                </div>

                <h2 className="home-heading">AI NAME</h2>

                <div className="card-container">
                    {subjects.length === 0 && (
                        <div className="empty-state">
                            <h3>No Subjects Yet</h3>
                            <p>Create your first subject to get started</p>
                            <button onClick={onOpenModal}>Create Subject</button>
                        </div>
                    )}
                    {subjects.map((sub) => (
                        <div
                            key={sub.id}
                            onClick={() => navigate(`/chat/${sub.id}`, { state: { subjectName: sub.name } })}
                            className="sub-box"
                        >
                            <div
                                className="img-container"
                                style={{ backgroundColor: sub.iconColor }}
                            >
                                <img src={sub.image} alt={`${sub.name} pattern`} />
                            </div>

                            <div className="info-container">
                                <div className="details">
                                    <h3 className="sub-name">{sub.name}</h3>

                                    <div className="attachment-detail">
                                        <FontAwesomeIcon icon={faBook} size="sm" /> 
                                        <span className="attached-text">Attached</span> {fileCounts[sub.id] || 0}
                                    </div>
                                </div>
                                <div className="last-detail">
                                    <p className="last-msg">
                                        {lastMessages[sub.id]?.text || "No messages yet"}
                                    </p>
                                    <p className="last-msg-time">
                                        {lastMessages[sub.id]?.time || ""}
                                    </p>
                                </div>
                                <div className="card-functions">
                                    
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/show-imp/${sub.id}`);
                                        }}
                                        className="view-btn"
                                    >
                                        View Important
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Stop it from opening the chat
                                            onDeleteSubject(sub.id);
                                        }}
                                        className="del-btn"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}