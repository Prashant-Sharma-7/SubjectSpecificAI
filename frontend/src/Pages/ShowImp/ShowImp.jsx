import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { fetchBlueprints } from "../../Services/api";
import "../PaperGen/PaperGen.css";
import "./ShowImp.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function ShowImp({subjects, user}) {
    const { subjectId } = useParams();
    const navigate = useNavigate();
 
    const currentSubject = subjects?.find(s => s.id === subjectId);
    const subjectName = currentSubject?.name || "Chat";

    const [blueprints, setBlueprints] = useState([]);
    const [loading, setLoading] = useState(true);

    const bottomRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            console.log("Fetching blueprints for subject:", subjectId, "user:", user.uid);
            const data = await fetchBlueprints(subjectId, user.uid);
            console.log("Blueprints received from API:", data);
            if (data.blueprints) {
                setBlueprints(data.blueprints);
            }
            setLoading(false);
        };
        loadData();
    }, [subjectId, user]);

    useEffect(() => {
        if (!loading && blueprints.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [blueprints, loading]);

    return (
        <div className="showimp-page">

            {/* Navbar */}
            <div className="showimp-navbar">
                <button className="pg-back-btn" onClick={() => navigate("/")}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    <span className="back-text">Home</span>
                </button>

                <span className="pg-title">
                    {subjectName.toUpperCase()} IMPORTANT TOPICS
                </span>

                <img 
                onClick={()=> navigate("/")}
                src="/testLogo.png" 
                alt="Profile" 
                className="pg-profile" 
                />
            </div>

            {/* Content */}
            <div className="showimp-container">

                {loading && (
                    <p className="showimp-loading">
                        Loading Important...
                    </p>
                )}

                {!loading && blueprints.length === 0 && (
                    <div className="showimp-empty">
                        <p>
                            No important topics generated yet for {subjectName.toUpperCase()}.
                        </p>

                        <button
                            className="showimp-new-btn"
                            onClick={() => navigate("/paper-gen")}
                        >
                            Generate One Now
                        </button>
                    </div>
                )}

                {!loading && blueprints.map((bp, index) => (
                    <div key={index} className="showimp-card">

                        <div className="showimp-card-header">
                            <span className="showimp-exam">
                                {bp.exam_type}
                            </span>

                            <span className="showimp-date">
                                {bp.date}
                            </span>
                        </div>

                        <div className="markdown-body showimp-markdown">
                            <ReactMarkdown>{bp.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}

                <div ref={bottomRef} className="showimp-bottom-space" />
            </div>
            
            {/* Bottom Button */}
            {blueprints.length > 0 && (
                <div className="bottom-btn-container">
                    <button
                        className="showimp-new-btn"
                        onClick={() => navigate("/paper-gen")}
                    >
                        Generate New
                    </button>
                </div>
            )}
        </div>
    );
}