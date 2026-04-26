import { useEffect, useRef, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import TypingBubble from "./TypingBubble";
import "./MessageArea.css";

const MessageArea = memo(function MessageArea({ messages, onTypingComplete, handleSend }) {
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }, []);

    // Scroll when new permanent messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    return (
        <div className="msg-area">
            <div className="msg-wrapper">

            {messages.map((msg, index) => {
                if (msg.isLoading) {
                    return (
                        <div key={`${msg.id}-${index}`} className="bot ans-loader">
                            <span></span><span></span><span></span>
                        </div>
                    );
                }  
                if (msg.type === "typing") {
                    return (
                        <TypingBubble 
                            key={`${msg.id}-${index}`}
                            fullText={msg.text} 
                            originalInput={msg.originalInput}
                            onComplete={onTypingComplete}
                            scrollToBottom={scrollToBottom}
                            videos={msg.videos}
                        />
                    );
                }
                if (msg.type === "error") {
                    return (
                        <div key={`${msg.id}-${index}`} className="error-msg">
                            <span>{msg.text}</span>
                            {msg.retry && (
                                <button 
                                    className="retry-btn"
                                    onClick={() => handleSend(msg.retry)}
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    );
                }
                return (
                    <div key={`${msg.id}-${index}`} className={msg.type}>
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            PreTag="div"
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {msg.text}
                        </ReactMarkdown>
                        {msg.videos && msg.videos.length > 0 && (
                            <div className="yt-container">
                                {msg.videos.map(video => (
                                    <div 
                                        key={video.videoId} 
                                        className="yt-card"
                                        onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, "_blank")}
                                    >
                                        <div className="yt-thumbnail-wrapper">
                                            <img 
                                                src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`} 
                                                alt={video.title}
                                            />
                                            <div className="yt-play-overlay">
                                                {/* A clean, inline SVG play button */}
                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm115.7 272l-176 101c-15.8 8.8-35.7-2.5-35.7-21V152c0-18.4 19.8-29.8 35.7-21l176 107c16.4 9.2 16.4 32.9 0 42z"></path></svg>
                                            </div>
                                            <div className="yt-badge">YouTube</div>
                                        </div>
                                        <div className="yt-title">{video.title}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                    
                );
            })}

            <div className="chat-spacer" />
            <div ref={messagesEndRef} />
            </div>
        </div>
    );
});

export default MessageArea;