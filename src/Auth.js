import { useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Auth.css";


// Auth component for user authentication 
function Auth() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const navigate = useNavigate();

    const handleAuth = async () => {
        setError("");
        if (!isLogin && password !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email.trim(), password.trim());
            } else {
                await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
            }
            navigate("/home");
        } catch (error) {
            setError(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        try {
            await signInWithPopup(auth, googleProvider);
            navigate("/home");
        } catch (error) {
            setError("Google login failed. Try again.");
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Please enter your email to reset password.");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email.trim());
            setResetEmailSent(true);
            setError(""); // Clear error on successful email send
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className={`auth-container ${isLogin ? "login-mode" : "signup-mode"}`}>
            <div className="auth-box">
                <h2 className="auth-title">{isLogin ? "Welcome Back!" : "Join Retrievio"}</h2>
                <p className="auth-subtext">{isLogin ? "Log in to continue" : "Create your account"}</p>

                {error && <p className="error-text">{error}</p>}
                {resetEmailSent && <p className="success-text">Password reset email sent! Check your inbox.</p>}

                <input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="password-container">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter your password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span 
                        className={`eye-icon ${showPassword ? "visible" : ""}`} 
                        onClick={() => setShowPassword(!showPassword)}
                    ></span>
                </div>

                {!isLogin && (
                    <div className="password-container">
                        <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Confirm password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <span 
                            className={`eye-icon ${showConfirmPassword ? "visible" : ""}`} 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        ></span>
                    </div>
                )}

                <button className="auth-btn" onClick={handleAuth}>{isLogin ? "Login" : "Sign Up"}</button>
                <button className="google-btn" onClick={handleGoogleLogin}>Sign in with Google</button>

                {isLogin && (
                    <p className="forgot-password-text" onClick={handleForgotPassword}>
                        Forgot Password?
                    </p>
                )}

                <p className="toggle-text" onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </p>
            </div>
        </div>
    );
}

export default Auth;
