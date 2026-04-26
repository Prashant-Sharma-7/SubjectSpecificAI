import "./NewSubModal.css"; // Assuming it uses the same CSS


export default function NewSubModal({ 
    closeModal, 
    newSubName, 
    setNewSubName, 
    selectedColor, 
    setSelectedColor, 
    availableColors, 
    handleCreateSubject,
    isCreating
}) {
    return (
        <div className="home-modal-overlay" onClick={closeModal}>
            <div className="home-modal-box" onClick={(e) => e.stopPropagation()}>
                
                <button className="home-modal-close" onClick={closeModal}>×</button>
                
                <h2>Create New Subject</h2>

                <div className="home-form-group">
                    <label>Subject Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Computer Networks" 
                        value={newSubName} 
                        onChange={(e) => setNewSubName(e.target.value)} 
                    />
                </div>

                <div className="home-form-group">
                    <label>Theme Color</label>
                    <div className="color-picker-container">
                        {availableColors.map((color) => (
                            <div 
                                key={color}
                                className={`color-circle ${selectedColor === color ? "active" : ""}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setSelectedColor(color)}
                            ></div>
                        ))}
                    </div>
                </div>

                <button 
                className="home-create-btn" 
                onClick={handleCreateSubject}
                disabled={isCreating || !newSubName.trim()} // Disable if empty or loading
                style={{ opacity: (isCreating || !newSubName.trim()) ? 0.6 : 1 }}
                >
                    {isCreating ? "⏳ Initializing Agent..." : "Create Subject"}
                </button>

            </div>
        </div>
    );
}