import {useRef, useState, useEffect} from "react";
import "./InputArea.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faPlus, faArrowUp, faFilePdf, faPlayCircle, faXmark} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";

export default function InputArea({handleSend, handleFileUpload, isSending }) {
    const fileInputRef = useRef(null);
    const menuRef = useRef(null);

    const [text, setText] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [ytEnabled, setYtEnabled] = useState(false);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const onFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
            // Reset the input so you can upload the same file again if needed
            e.target.value = null; 
        }
    };

    const triggerSend = () => {
        if (!text.trim()) return;
        handleSend(text, ytEnabled);   
        setText("");        
        
        // Instantly shrink the text box back to normal size
        const textarea = document.querySelector(".input-box");
        if(textarea) textarea.style.height = "auto";
    };

    return (
        <div className="input-container">
            
            <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg"
                 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                onChange={onFileChange}
            />
            
            <div className="attach-wrapper" ref={menuRef}>
                <button 
                    className={`attach-btn ${showMenu ? 'active' : ''}`} 
                    onClick={() => setShowMenu(prev => !prev)}
                >
                    <motion.div
                        animate={{ rotate: showMenu ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                    </motion.div>
                </button>

                <AnimatePresence>
                    {showMenu && (
                        <motion.div 
                            className="attach-menu"
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 15, scale: 0.95 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 400, 
                                damping: 25 
                            }}
                            style={{ transformOrigin: "bottom left" }}
                        >
                            <button className="menu-item" onClick={() => fileInputRef.current.click()}>
                                <span className="menu-icon"><FontAwesomeIcon icon={faFilePdf} /></span>
                                <div className="menu-text">
                                    <h4>Upload File</h4>
                                    <p>PDFs, Images, Notes</p>
                                </div>
                            </button>

                            <div className="menu-divider"></div>

                            <div className="yt-toggle-container">
                                <div className="menu-text">
                                    <h4>YouTube Mode</h4>
                                    <p>Attach video suggestions</p>
                                </div>
                                <label className="custom-toggle">
                                    <input 
                                        type="checkbox" 
                                        checked={ytEnabled}
                                        onChange={() => setYtEnabled(!ytEnabled)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {ytEnabled && (
                    <motion.div 
                        className="yt-chip"
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, opacity: 0 }}
                    >
                        <FontAwesomeIcon icon={faPlayCircle} className="yt-chip-icon" />
                        <span>YouTube Enabled</span>
                        <button className="yt-chip-close" onClick={() => setYtEnabled(false)}>
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <textarea 
                className="input-box" 
                placeholder="Enter Query" 
                value={text}
                disabled={isSending}
                rows={1}
                onChange={(e) => {
                    setText(e.target.value);
                    // The Auto-Resize Magic
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                    // Send on Enter, New Line on Shift+Enter
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        triggerSend();
                    }
                }}
            />
            <button className="send-btn" disabled={isSending} onClick={triggerSend}>
                <FontAwesomeIcon icon={faArrowUp} />
            </button>
        </div>
    );
}