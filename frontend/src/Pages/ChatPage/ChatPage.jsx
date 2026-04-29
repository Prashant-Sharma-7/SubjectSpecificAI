import { useParams, useNavigate} from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { askQuestion, uploadFile,fetchChatHistory } from "../../Services/api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from "@fortawesome/free-solid-svg-icons";

import Sidebar from "../../Components/Sidebar/Sidebar";
import MessageArea from "../../Components/MessageArea/MessageArea";
import InputArea from "../../Components/InputArea/InputArea";

import "./ChatPage.css";

export default function ChatPage({subjects, onOpenModal, user }) {
    const { subjectId } = useParams();
    const navigate = useNavigate();

    const intervalRef = useRef(null);

    const currentSubject = subjects?.find(s => s.id === subjectId);
    const subjectName = currentSubject?.name || "Chat";
    
    const [messages, setMessages] = useState([]);
    const [collapsed, setCollapsed] = useState(false);
    const [history, setHistory] = useState({});
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);


    // This handles replacing the temporary typing bubble with a permanent message
    const handleTypingComplete = useCallback((fullText, originalInput, videos = []) => {
        setMessages(prev => {
            let newMessages = [];

            for (let msg of prev) {
                if (msg.id === "typing-msg") continue; // remove typing only
                newMessages.push(msg);
            }
            // add final bot message
            newMessages.push({
                id: Date.now(),
                type: "bot",
                text: fullText,
                videos: videos
            });

            return newMessages;
        });
        setHistory(prev => [originalInput, ...prev].slice(0, 5));
    }, []);

    const handleSend =  useCallback(async (messageText, ytEnabled) => {
        if (isSending) return; // prevent spam

        setIsSending(true);
        const userMessageId = Date.now() + "-user";
        const userMessage = {id: userMessageId, type: "user", text: messageText };
        setMessages(prev => [...prev, userMessage]);

        //Temp Loader
        const loadingId = Date.now() + "-loader";
        setMessages(prev => [
            ...prev,
            { id: loadingId, type: "bot", isLoading: true }
        ]);


        try {
            const res = await askQuestion(messageText, subjectId, user.uid, subjectName, ytEnabled);
            const fullText = res.answer;
            const videos = res.videos || [];

            // Remove loader, append special typing message
            setMessages(prev => {
                const cleanPrev = prev.filter(msg => msg.id !== loadingId);
                return [...cleanPrev, { 
                    id: "typing-msg", 
                    type: "typing", 
                    text: fullText, 
                    originalInput: messageText,
                    videos:videos
                }];
            });

        } catch (err) {
            console.error(err);

            // remove loader on error too
            setMessages(prev => [
                ...prev.filter(msg => msg.id !== loadingId),
                {
                    id: Date.now(),
                    type: "error",
                    text: "❌ Something went wrong. Please try again.",
                    retry: messageText
                }
            ]);

        }finally{
            setIsSending(false);
        }
    }, [subjectId, isSending]);

    const handleFileUpload = useCallback(async (file) => {
        const tempMsgId = Date.now();
        setMessages(prev => [...prev, { 
            id: tempMsgId, 
            type: "bot", 
            text: `⏳ Uploading and processing **${file.name}** in the background... You can continue asking questions!` 
        }]);

        try {
            await uploadFile(file, user.uid, subjectId);
            setRefreshTrigger(prev => prev + 1);
            // setMessages(prev => prev.map(msg => 
            //     msg.id === tempMsgId 
            //     ? { type: "bot", text: `✅ Successfully processed **${file.name}**! You can now ask questions about it.` }
            //     : msg
            // ));

        } catch (error) {
            console.error(error);
            setMessages(prev => prev.map(msg => 
                msg.id === tempMsgId 
                ? { type: "bot", text: `❌ Failed to process ${file.name}. Please try again.` }
                : msg
            ));
        }
    }, [subjectId, user.uid]);


    useEffect(() => {
        if (!user || !subjectId) return;
        const loadHistory = async () => {
            // Clear the chat box while we fetch the new data
            setMessages([]); 
            
            const data = await fetchChatHistory(subjectId, user.uid);
            
            
            if (data.history && data.history.length > 0) {
                const formattedMessages = [];
                const recentQuestions = [];
                const cappedHistory = data.history.slice(-50);

                // Translate backend JSON format into your React state format
                cappedHistory.forEach(item => {
                    formattedMessages.push({ type: "user", text: item.question });
                    formattedMessages.push({ type: "bot", text: item.answer, videos: item.videos || [] });
                    
                    recentQuestions.push(item.question); // Save questions for the sidebar
                });

                setMessages(formattedMessages);
                
                setHistory(recentQuestions.reverse().slice(0, 5));
            } else {
                setMessages([{ 
                    type: "bot", 
                    text: `Hello! I am your AI study agent for **${subjectName.toUpperCase()}**. Upload your notes or ask a question to get started!` 
                }]);
                setHistory([]);
            }
        };

        loadHistory();
    }, [user, subjectId]);

    return(
        <div className="chat-bg">
            <Sidebar 
                subjects = {subjects}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                subjectId={subjectId}
                history={history}
                navigate={navigate}
                onNew={onOpenModal}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                user={user}
                refreshTrigger={refreshTrigger}
            />

            <div className="chat-area">

                <div className="mobile-navbar">
                    <button 
                        className="hamburger-btn" 
                        onClick={() => setMobileOpen(true)}
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    
                    <span className="navbar-title">{subjectName.toUpperCase()}</span>
                    
                    <img 
                        onClick={()=> navigate("/")}
                        src="/testLogo.png" 
                        alt="Profile" 
                        className="profile-icon" 
                    />
                </div>

                <MessageArea 
                    messages={messages} 
                    onTypingComplete={handleTypingComplete} 
                    handleSend={handleSend}
                />
                
                <InputArea 
                    handleSend={handleSend} 
                    handleFileUpload={handleFileUpload}
                    isSending={isSending}
                />
            </div>
        </div>
    );
}