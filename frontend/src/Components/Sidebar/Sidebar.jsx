import {useEffect, useState, memo} from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Sidebar.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAnglesLeft, faAnglesRight, faTrash, faFolderPlus,faFolderOpen, faPaperclip, faCaretDown } from "@fortawesome/free-solid-svg-icons";
import {SparklesAlt, History } from '@boxicons/react';
import { fetchFiles, deleteFile } from "../../Services/api";

const Sidebar = memo(function Sidebar({ 
    subjects,
    collapsed, 
    setCollapsed, 
    subjectId, 
    history, 
    navigate, 
    onNew,
    mobileOpen,
    setMobileOpen,
    user
}) {

    const [isMobile, setIsMobile] = useState(false);
    const [showFiles, setShowFiles] = useState(false);
    const [files, setFiles] = useState([]);
    const [filesMap, setFilesMap] = useState({});
    const [deletingFile, setDeletingFile] = useState(null);

    useEffect(() => {
        if (!user || !subjectId) return;
        setShowFiles(false);
        const loadFiles = async () => {
            if (filesMap[subjectId]) { // already present in cache
                setFiles(filesMap[subjectId]);
                return;
            }

            const data = await fetchFiles(subjectId, user.uid);

            setFiles(data.files);
            setFilesMap(prev => ({
                ...prev,
                [subjectId]: data.files
            }));
        };

        if (subjectId) loadFiles();
    }, [user, subjectId]);
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize(); // Check on mount
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (collapsed && !isMobile) {
            setShowFiles(false);
        }
    }, [collapsed, isMobile]);

    // Framer Motion Variants for smooth transitions
    const sidebarVariants = {
        expanded: { width: 260, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
        collapsed: { width: 70, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
        mobileOpen: { width: 260, x: 0, marginTop:"1.5vh", position: "fixed", transition: { type: "spring", stiffness: 300, damping: 30 } },
        mobileClosed: { width: 260, x: -280,marginTop:"1.5vh", position: "fixed", transition: { type: "spring", stiffness: 300, damping: 30 } }
    };

    let currentState = "expanded";
    if (isMobile) {
        currentState = mobileOpen ? "mobileOpen" : "mobileClosed";
    } else {
        currentState = collapsed ? "collapsed" : "expanded";
    }


    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isMobile && mobileOpen && (
                    <motion.div 
                        className="mobile-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            <motion.div 
            className={`side-bar`}
            variants={sidebarVariants}
            initial={currentState}
            animate={currentState}
            >
                <div className="sidebar-content">
                    <div className="sidebar-main">

                        <div 
                        className="option-bar" 
                        style={collapsed? {
                            display:"flex", 
                            flexDirection:"column",
                            gap:"1rem", 
                        }: {}
                        } 
                        >
                            <img 
                            src="/testLogo.png" 
                            alt="profile" 
                            className="logo" 
                            onClick={()=> navigate("/")}
                            />

                            {!isMobile && (
                                <button 
                                    className="collapse-btn"
                                    onClick={() => setCollapsed(!collapsed)}
                                >
                                    {collapsed ? <FontAwesomeIcon icon={faAnglesRight} /> : <FontAwesomeIcon icon={faAnglesLeft} />}
                                </button>
                            )}
                            {isMobile && (
                                <button 
                                className="collapse-btn"
                                onClick={() => setMobileOpen(false)}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* New button */}
                        <div 
                        className="sidebar-item new-btn" 
                        onClick={onNew}
                        style={collapsed? {
                            marginBottom:"1.8rem"
                        }:{}}
                        >
                            <span className="icon-wrapper"><FontAwesomeIcon icon={faFolderPlus} /></span>
                            {(!collapsed || isMobile) && <span>New Subject</span>}
                        </div>

                        {/* Subject list */}
                        {(!collapsed || isMobile) && <div className="sidebar-title">Subjects</div>}
                        {subjects.map((sub) => (
                            <div
                            key={sub.id}
                            className={`sidebar-item ${subjectId === sub.id ? "active" : ""}`}
                            onClick={() => {
                                navigate(`/chat/${sub.id}`);
                                if (isMobile) setMobileOpen(false); // Auto-close on mobile
                            }}
                            style={{color: sub.iconColor}}
                            >
                                <span className="icon-wrapper"><FontAwesomeIcon icon={faFolderOpen} /></span>
                                {(!collapsed || isMobile) && <span>{sub.name}</span>}
                            </div>
                        ))}


                        {/* Files attached */}
                        <div
                            className={`sidebar-item Files-btn ${showFiles ? "active" : ""}`}
                            onClick={() => {
                                if (collapsed && !isMobile) {
                                    // Collapsed → expand sidebar + open files
                                    setCollapsed(false);
                                    setShowFiles(true);
                                    } else {
                                        // Already expanded → just toggle
                                        setShowFiles((prev) => !prev);
                                    }
                                }}
                        >
                            <span className="icon-wrapper">
                                <FontAwesomeIcon icon={faPaperclip} />
                            </span>
                            {(!collapsed || isMobile) && <span>Attachments ({files.length})</span>}

                            {(!collapsed || isMobile) && 
                                <div className="show-arrow">
                                    <FontAwesomeIcon icon={faCaretDown} />
                                </div>
                            }
                        </div>
                        {/* Smooth accordion animation */}
                        <AnimatePresence>
                            {showFiles && (
                                <motion.div
                                className="file-list"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    {files.length === 0 ? (
                                        <div className="file-item empty">No files uploaded</div>
                                    ) : (
                                        files.map((f, i) => (
                                            <div key={i} className="file-item">

                                                <span className="file-name">{f.filename}</span>
                                                
                                                <button
                                                className="delete-btn"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    
                                                    setDeletingFile(f.filename);
                                                    
                                                    await deleteFile(f.filename, subjectId, user.uid);
                                                    
                                                    // update UI instantly
                                                    setFiles(prev => prev.filter(file => file.filename !== f.filename));
                                                    
                                                    // update cache too
                                                    setFilesMap(prev => ({
                                                        ...prev,
                                                        [subjectId]: prev[subjectId].filter(file => file.filename !== f.filename)
                                                    }));
                                                    
                                                    setDeletingFile(null);
                                                }}
                                                >
                                                    {deletingFile === f.filename ? (
                                                        <div className="loader"></div>
                                                    ) : (
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    )}
                                                
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* //history */}
                        {(!collapsed || isMobile) && history.length > 0 && (
                            <div style={{ marginTop: "1rem" }}>
                                <div className="sidebar-title">Recent</div>
                                {history.map((item, i) => (
                                    <div key={i} className="sidebar-item history">
                                        <span className="icon-wrapper"><History /></span>
                                        {(!collapsed || isMobile) && (
                                            <span>{item.slice(0, 15)}...</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="sidebar-bottom">
                        {/* Tools*/}
                        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                            {(!collapsed || isMobile) && <div className="sidebar-title">Tools</div>}
                            <div className="sidebar-item" onClick={() => navigate("/paper-gen")}>
                                <span className="icon-wrapper"><SparklesAlt /></span>
                                {(!collapsed || isMobile) && <span>Generate Important</span>}
                            </div>
                        </div>
                    </div>        

                </div>
            </motion.div>
        </>
    );
});

export default Sidebar;