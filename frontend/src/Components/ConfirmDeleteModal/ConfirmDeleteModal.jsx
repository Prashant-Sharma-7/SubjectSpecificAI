import "./ConfirmDeleteModal.css";

export default function ConfirmDeleteModal({closeModal, executeDelete, isDeleting}){
    return(
        <div className="home-modal-overlay" onClick={() => !isDeleting && closeModal()}>
            <div className="home-modal-box delete-modal-box" onClick={(e) => e.stopPropagation()}>
                
                <h2>Delete Subject?</h2>
                
                <p className="delete-warning-text">
                    Are you absolutely sure? This will permanently erase all chats, uploaded files, and generated blueprints. 
                    <strong className="delete-warning-strong">This action cannot be undone.</strong>
                </p>
                
                <div className="delete-btn-group">
                    <button 
                        className="home-create-btn cancel-btn" 
                        onClick={closeModal}
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    
                    <button 
                        className="home-create-btn confirm-delete-btn" 
                        onClick={executeDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
                    </button>
                </div>

            </div>
        </div>
    )
} 