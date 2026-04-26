import { useState } from "react";
import { auth } from "../../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";

import "./LoginPage.css"


export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("signup");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    const handleForgot = async () => {
        try {
            if (!email) return setError("Enter email first");

            setLoading(true);
            setError("");

            if (!isValidEmail(email)) {
                setError("Invalid email format");
                return;
            }
            await sendPasswordResetEmail(auth, email);

            setError("✅ Reset email sent!");

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        try {
            setLoading(true);
            setError("");

            if (!isValidEmail(email)) {
                setError("Invalid email format");
                return;
            }
            await createUserWithEmailAndPassword(auth, email, password);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogin = async () => {
        try {
            setLoading(true);
            setError("");
            if (!isValidEmail(email)) {
                setError("Invalid email format");
                return;
            }
            await signInWithEmailAndPassword(auth, email, password);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const isValidEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    return (
        <div className="login-container">
            <h1 className="ai-name">AI NAME</h1>
            <div className="login-card">
            {mode !== "forgot" && (

                <div className="mode-switch">
                    <div className={`active-pill ${mode==="login"? "shift-right": ""}`} />
                    <button 
                    className={`mode-btn ${mode==="signup"? "active" : ""}`}
                    onClick={()=>setMode("signup")}
                    >Sign-Up</button>
                    <button 
                    className={`mode-btn ${mode==="login"? "active" : ""}`}
                    onClick={()=>setMode("login")}
                    >Login</button>
                </div>
            )}

            <h2 className="login-title">
                {mode === "login" && "Welcome Back"}
                {mode === "signup" && "Create Account"}
                {mode === "forgot" && "Reset Password"}
            </h2>

            <p className="login-sub">AI Study Assistant</p>

            <input 
                className="login-input"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
            />

            {mode !== "forgot" && (
                <input 
                className="login-input"
                type="password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                />
            )}
            {error && <p className="error-text">{error}</p>}

            {/* MAIN BUTTON */}
            {mode === "login" && (
                <button className="login-btn primary" disabled={loading} onClick={handleLogin}>
                {loading ? "Processing..." : "Login"}
                </button>
            )}

            {mode === "signup" && (
                <button className="login-btn primary" disabled={loading} onClick={handleSignup}>
                {loading ? "Processing..." : "Sign Up"}
                </button>
            )}

            {mode === "forgot" && (
                <button className="login-btn primary" disabled={loading} onClick={handleForgot}>
                {loading ? "Processing..." : "Send Reset Link"}
                </button>
            )}

            {/* GOOGLE ONLY FOR LOGIN/SIGNUP */}
            {mode !== "forgot" && (
                <>
                <div className="divider">OR</div>

                <button className="google-btn" onClick={handleGoogle}>
                    <img className="google-logo" src="/googlelogo.webp" alt="" />
                    Continue with Google
                </button>
                </>
            )}

            {/* LINKS */}
            <div className="auth-switch">

                {mode === "login" && (
                    <span onClick={() => setMode("forgot")}>
                        Forgot password?
                    </span>
                )}

                {mode === "forgot" && (
                <span onClick={() => setMode("login")}>
                    Back to Login
                </span>
                )}

            </div>

            </div>
        </div>
    );
}