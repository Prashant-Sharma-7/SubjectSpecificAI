import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function TypingBubble({ fullText, originalInput, onComplete, scrollToBottom, videos }) {
    const [displayedText, setDisplayedText] = useState("");
    const intervalRef = useRef(null);

    useEffect(() => {
        const words = fullText.split(" ");
        let index = 0;

        intervalRef.current = setInterval(() => {
            index+=2;
            setDisplayedText(words.slice(0, index).join(" "));
            
            // Call the DOM scroll function directly (highly performant, no re-renders)
            if (index % 3 === 0) scrollToBottom(); 

            if (index >= words.length) {
                clearInterval(intervalRef.current);
                onComplete(fullText, originalInput, videos);
            }
        }, 30);

        // Handle user switching tabs
        const handleVisibilityChange = () => {
            if (document.hidden && index < words.length) {
                clearInterval(intervalRef.current);
                setDisplayedText(fullText);
                onComplete(fullText, originalInput, videos);
                scrollToBottom();
                document.removeEventListener("visibilitychange", handleVisibilityChange);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalRef.current);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fullText, originalInput, onComplete, scrollToBottom]);

    return (
        <div className="bot">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayedText}
            </ReactMarkdown>
        </div>
    );
}