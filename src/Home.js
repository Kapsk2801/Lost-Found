import React, { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import { database } from "./firebase";
import "./Home.css";

const Home = () => {
    const auth = getAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);

    // Set up real-time listener for items
    useEffect(() => {
        const itemsRef = ref(database, 'items');
        
        const unsubscribe = onValue(itemsRef, (snapshot) => {
            const itemsData = [];
            snapshot.forEach((childSnapshot) => {
                itemsData.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            // Sort items by timestamp (newest first)
            itemsData.sort((a, b) => b.timestamp - a.timestamp);
            setItems(itemsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching items:", error);
            setLoading(false);
        });

        // Clean up the listener when component unmounts
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) {
                navigate("/");
            } else {
                setUser(currentUser);
            }
        });
    }, [auth, navigate]);

    const handleLogout = () => {
        signOut(auth).then(() => navigate("/"));
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
        setNewComment("");
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            const itemRef = ref(database, `items/${selectedItem.id}`);
            const updatedComments = [...(selectedItem.comments || []), {
                text: newComment,
                userId: user.uid,
                userEmail: user.email,
                timestamp: Date.now()
            }];

            await update(itemRef, {
                comments: updatedComments
            });

            setNewComment("");
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    return (
        <div className="home-container">
            <header>
                <h1>Retrievio - Lost & Found</h1>
                <div className="profile-dropdown">
                    <div className="profile-circle" onClick={toggleDropdown}>
                        {user?.email[0].toUpperCase()}
                    </div>
                    {showDropdown && (
                        <div className="dropdown-menu">
                            <button onClick={() => navigate("/report-lost")}>Report Lost Item</button>
                            <button onClick={() => navigate("/report-found")}>Report Found Item</button>
                            <button onClick={() => navigate("/settings")}>Settings</button>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                </div>
            </header>

            <div className="content">
                <h2>Welcome, {user?.email}!</h2>

                {loading ? (
                    <div className="loading-container">
                        <p>Loading items...</p>
                    </div>
                ) : (
                    <div className="items-grid">
                        {items.length > 0 ? (
                            items.map((item) => (
                                <div key={item.id} className="item-card" onClick={() => handleItemClick(item)}>
                                    {item.imageUrl && (
                                        <div className="item-image">
                                            <img src={item.imageUrl} alt={item.itemName} />
                                        </div>
                                    )}
                                    <h4>{item.itemName}</h4>
                                    <p>{item.description}</p>
                                    <p><strong>Location:</strong> {item.location}</p>
                                    <p><strong>Date:</strong> {item.date}</p>
                                    <p><strong>Status:</strong> {item.isLost ? "Lost" : "Found"}</p>
                                    <p><strong>Reported by:</strong> {item.reportedBy}</p>
                                </div>
                            ))
                        ) : (
                            <p>No items reported yet.</p>
                        )}
                    </div>
                )}
            </div>

            {selectedItem && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={handleCloseModal}>&times;</button>
                        <div className="modal-item-details">
                            {selectedItem.imageUrl && (
                                <div className="modal-image">
                                    <img src={selectedItem.imageUrl} alt={selectedItem.itemName} />
                                </div>
                            )}
                            <h3>{selectedItem.itemName}</h3>
                            <p>{selectedItem.description}</p>
                            <p><strong>Location:</strong> {selectedItem.location}</p>
                            <p><strong>Date:</strong> {selectedItem.date}</p>
                            <p><strong>Status:</strong> {selectedItem.isLost ? "Lost" : "Found"}</p>
                            <p><strong>Reported by:</strong> {selectedItem.reportedBy}</p>
                            
                            <div className="comments-section">
                                <h4>Comments</h4>
                                <div className="comments-list">
                                    {selectedItem.comments?.map((comment, index) => (
                                        <div key={index} className="comment">
                                            <p className="comment-user">{comment.userEmail}</p>
                                            <p className="comment-text">{comment.text}</p>
                                            <p className="comment-time">{new Date(comment.timestamp).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="add-comment">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                    />
                                    <button onClick={handleAddComment}>Post Comment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;