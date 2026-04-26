import { useState } from "react";
import { generatePaper } from "../../Services/api";
import "./PaperGen.css";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export default function PaperGen({subjects, user}) {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [subject, setSubject] = useState("");
    const [examType, setExamType] = useState("Mid Sem");
    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const handleGenerate = async () => {
        if (files.length === 0) {
            alert("Please upload at least one PYQ!");
            return;
        }

        setLoading(true);

        try {
            await generatePaper(user.uid, subject, examType, files);
            navigate(`/show-imp/${subject}`);
        } catch (error) {
            console.error(error);
            alert("❌ Failed to generate blueprint.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="paper-gen-container">

            <div className="cancel-cross"
            onClick={() => navigate(-1)}
            >
                <FontAwesomeIcon icon={faXmark} />
            </div>

            <div className="pg-modal-box">
                <h2>Generate Important</h2>

                {/* SUBJECT */}
                <div className="pg-form-group">
                    <label>Select Subject</label>
                    <div className="capsule-grid">
                        {subjects.map((sub) => (
                            <button
                                key={sub.id}
                                type="button"
                                className={`capsule ${subject === sub.id ? "active" : ""}`}
                                onClick={() => setSubject(sub.id)}
                            >
                                <span
                                    className="capsule-dot"
                                    style={{ backgroundColor: sub.iconColor }}
                                />
                                {sub.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* EXAM TYPE */}
                <div className="pg-form-group">
                    <label>Exam Type</label>
                    <div className="segmented-control">
                        <div
                            className={`selection-pill ${
                                examType === "End Sem" ? "shift-right" : ""
                            }`}
                        />

                        <button
                            type="button"
                            className={`segment-btn ${
                                examType === "Mid Sem" ? "active" : ""
                            }`}
                            onClick={() => setExamType("Mid Sem")}
                        >
                            Mid Sem
                        </button>

                        <button
                            type="button"
                            className={`segment-btn ${
                                examType === "End Sem" ? "active" : ""
                            }`}
                            onClick={() => setExamType("End Sem")}
                        >
                            End Sem
                        </button>
                    </div>
                </div>

                {/* FILE UPLOAD */}
                <div className="pg-form-group">
                    <label>Upload PYQs (Previous Year Questions)</label>
                    <div className="file-input-wrapper">
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleFileChange}
                        />
                        {/* Optional: Add a small text indicator if files are selected */}
                        {files.length > 0 && (
                            <p style={{fontSize: '0.8rem', color: '#9D4EDD', marginTop: '5px'}}>
                                {files.length} file(s) selected
                            </p>
                        )}
                    </div>
                </div>

                {/* BUTTON */}
                <button
                    className="pg-generate-btn"
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? "Analyzing Papers..." : "Generate"}
                </button>
            </div>
        </div>
    );
}