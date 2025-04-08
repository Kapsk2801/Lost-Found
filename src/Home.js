import React, { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, query, orderBy, where } from "firebase/firestore";
import { db } from "./firebase";
import EmojiPicker from 'emoji-picker-react';
import "./Home.css";
import ItemMatching from './components/ItemMatching';
import Analytics from './components/Analytics';

const Home = () => {
    const auth = getAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [modalActive, setModalActive] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [activePost, setActivePost] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [collapsedComments, setCollapsedComments] = useState({});
    const [selectedTab, setSelectedTab] = useState('feed');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [error, setError] = useState(null);

    // Handle scroll events
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowScrollTop(scrollTop > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Set up real-time listener for items
    useEffect(() => {
        let q = collection(db, 'items');
        
        // Apply filters
        if (statusFilter !== 'all') {
            q = query(q, where('status', '==', statusFilter));
        }
        if (categoryFilter !== 'all') {
            q = query(q, where('category', '==', categoryFilter));
        }
        if (locationFilter !== 'all') {
            q = query(q, where('location', '==', locationFilter));
        }
        
        // Apply sorting
        q = query(q, orderBy('timestamp', sortBy === 'newest' ? 'desc' : 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const itemsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Apply search filter
                const filteredItems = itemsData.filter(item => 
                    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.location?.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                setItems(filteredItems);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching items:', err);
                setError('Failed to load items. Please try again later.');
                setLoading(false);
            }
        }, (error) => {
            console.error('Error in snapshot listener:', error);
            setError('Failed to load items. Please try again later.');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [statusFilter, categoryFilter, locationFilter, sortBy, searchQuery]);

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

    const handleCommentClick = (item) => {
        setSelectedItem(item);
        setModalActive(true);
        setShowEmojiPicker(false);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setModalActive(false);
        setSelectedItem(null);
        setNewComment("");
        setShowEmojiPicker(false);
        document.body.style.overflow = 'auto';
    };

    const onEmojiClick = (emojiObject) => {
        setNewComment(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const handleReply = (postId, commentId) => {
        setActivePost(postId);
        setReplyingTo(commentId);
        // Focus the comment input
        const textarea = document.querySelector(`#post-${postId} .add-comment textarea`);
        if (textarea) {
            textarea.focus();
        }
    };

    const addComment = async (postId, commentData) => {
        try {
            const itemRef = doc(db, 'items', postId);
            await updateDoc(itemRef, {
                comments: arrayUnion({
                    id: Date.now().toString(),
                    text: commentData.text,
                    userEmail: user.email,
                    timestamp: Timestamp.now(),
                    replies: []
                })
            });
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    const addReplyToComment = async (postId, commentId, replyData) => {
        try {
            const itemRef = doc(db, 'items', postId);
            const currentItem = items.find(item => item.id === postId);
            
            if (!currentItem) return;

            const updatedComments = currentItem.comments.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        replies: [
                            ...(comment.replies || []),
                            {
                                id: Date.now().toString(),
                                text: replyData.text,
                                userEmail: user.email,
                                timestamp: Timestamp.now(),
                                parentId: commentId
                            }
                        ]
                    };
                }
                return comment;
            });

            await updateDoc(itemRef, {
                comments: updatedComments
            });
        } catch (error) {
            console.error("Error adding reply:", error);
        }
    };

    const handleAddComment = async (postId) => {
        if (!commentText.trim()) return;

        try {
            if (replyingTo) {
                await addReplyToComment(postId, replyingTo, {
                    text: commentText,
                    user: user.email,
                    timestamp: Timestamp.now()
                });
            } else {
                await addComment(postId, {
                    text: commentText,
                    user: user.email,
                    timestamp: Timestamp.now()
                });
            }

            setCommentText('');
            setReplyingTo(null);
            setActivePost(null);
        } catch (error) {
            console.error("Error handling comment:", error);
        }
    };

    // Toggle comments collapse state
    const toggleComments = (itemId) => {
        setCollapsedComments(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Get comments count
    const getCommentsCount = (comments = []) => {
        return comments.reduce((total, comment) => {
            return total + 1 + (comment.replies?.length || 0);
        }, 0);
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCategoryFilter('all');
        setLocationFilter('all');
        setSortBy('newest');
    };

    return (
        <div className="home-container">
            <header>
                <h1>Retrievio - Lost and Found</h1>
                <div className="nav-tabs">
                    <button 
                        className={`tab-btn ${selectedTab === 'feed' ? 'active' : ''}`}
                        onClick={() => setSelectedTab('feed')}
                    >
                        Feed
                    </button>
                    <button 
                        className={`tab-btn ${selectedTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setSelectedTab('analytics')}
                    >
                        Analytics
                    </button>
                </div>
                <div className="profile-dropdown">
                    <div className="profile-circle" onClick={toggleDropdown}>
                        {user?.email[0].toUpperCase()}
                    </div>
                    {showDropdown && (
                        <div className="dropdown-menu">
                            <button onClick={() => navigate("/report-lost")}>
                                Report Lost Item
                            </button>
                            <button onClick={() => navigate("/report-found")}>
                                Report Found Item
                            </button>
                            <button onClick={() => navigate("/settings")}>
                                Settings
                            </button>
                            <button onClick={handleSignOut}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="content">
                {selectedTab === 'feed' ? (
                    <>
                        <div className="content-header">
                            <h2>Recent Items</h2>
                            <div className="filters-container">
                                <div className="search-bar">
                                    <input
                                        type="text"
                                        placeholder="Search items..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="search-input"
                                    />
                                    <button 
                                        className="filter-toggle"
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                                    </button>
                                </div>
                                
                                {showFilters && (
                                    <div className="filters-panel">
                                        <div className="filter-group">
                                            <label>Status</label>
                                            <select 
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="lost">Lost</option>
                                                <option value="found">Found</option>
                                            </select>
                                        </div>
                                        
                                        <div className="filter-group">
                                            <label>Category</label>
                                            <select 
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">All Categories</option>
                                                <option value="electronics">Electronics</option>
                                                <option value="books">Books</option>
                                                <option value="clothing">Clothing</option>
                                                <option value="accessories">Accessories</option>
                                                <option value="documents">Documents</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        
                                        <div className="filter-group">
                                            <label>Location</label>
                                            <select 
                                                value={locationFilter}
                                                onChange={(e) => setLocationFilter(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="all">All Locations</option>
                                                <option value="library">Library</option>
                                                <option value="cafeteria">Cafeteria</option>
                                                <option value="classroom">Classroom</option>
                                                <option value="lab">Laboratory</option>
                                                <option value="gym">Gym</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        
                                        <div className="filter-group">
                                            <label>Sort By</label>
                                            <select 
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="filter-select"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                            </select>
                                        </div>
                                        
                                        <button 
                                            className="clear-filters"
                                            onClick={clearFilters}
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>Loading items...</p>
                            </div>
                        ) : error ? (
                            <div className="error-container">
                                <p>{error}</p>
                                <button onClick={() => window.location.reload()}>Retry</button>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="no-items">
                                <p>No items found. Be the first to report a lost or found item!</p>
                                <div className="report-buttons">
                                    <button className="report-button">Report Lost Item</button>
                                    <button className="report-button">Report Found Item</button>
                                </div>
                            </div>
                        ) : (
                            <div className="items-grid">
                                {items.map((item) => (
                                    <div key={item.id} id={`post-${item.id}`} className="item-card">
                                        <div className="item-header">
                                            <div className="item-info">
                                                <span className={`status-badge ${item.isLost ? 'status-lost' : 'status-found'}`}>
                                                    {item.isLost ? 'Lost Item' : 'Found Item'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {(item.imageUrl || item.imageData) && (
                                            <div className="item-image">
                                                <img src={item.imageUrl || item.imageData} alt={item.itemName} />
                                            </div>
                                        )}
                                        
                                        <div className="item-content">
                                            <div className="item-details">
                                                <h4>{item.itemName}</h4>
                                                <p>{item.description}</p>
                                                <p><strong>Location:</strong> {item.location}</p>
                                                <p><strong>Date:</strong> {new Date(item.date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}</p>
                                            </div>
                                            
                                            <div className={`comments-section ${collapsedComments[item.id] ? '' : 'collapsed'}`}>
                                                <div className={`comments-header ${!collapsedComments[item.id] ? 'collapsed' : ''}`}>
                                                    <div 
                                                        className={`comments-toggle ${!collapsedComments[item.id] ? 'collapsed' : ''}`}
                                                        onClick={() => toggleComments(item.id)}
                                                    >
                                                        <span className="toggle-icon">▼</span>
                                                        <span>Comments</span>
                                                        <span className="comments-count">
                                                            ({getCommentsCount(item.comments)})
                                                        </span>
                                                    </div>
                                                </div>

                                                {collapsedComments[item.id] && (
                                                    <>
                                                        <div className="comments-list">
                                                            {item.comments?.map((comment, index) => (
                                                                <div key={`${item.id}-comment-${index}`} className="comment">
                                                                    <div className="comment-header">
                                                                        <p className="comment-user">{comment.userEmail.split('@')[0]}</p>
                                                                        <div className="comment-actions">
                                                                            <button 
                                                                                className="reply-button" 
                                                                                onClick={() => handleReply(item.id, comment.id)}
                                                                            >
                                                                                Reply
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <p className="comment-text">{comment.text}</p>
                                                                    <p className="comment-time">
                                                                        {comment.timestamp?.toDate?.() 
                                                                            ? comment.timestamp.toDate().toLocaleDateString('en-US', {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })
                                                                            : new Date(comment.timestamp).toLocaleDateString('en-US', {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                    </p>
                                                                    
                                                                    {comment.replies && comment.replies.length > 0 && (
                                                                        <div className="comment-replies">
                                                                            {comment.replies.map(reply => (
                                                                                <div key={reply.id} className="comment">
                                                                                    <div className="comment-header">
                                                                                        <p className="comment-user">{reply.userEmail.split('@')[0]}</p>
                                                                                    </div>
                                                                                    <p className="comment-text">{reply.text}</p>
                                                                                    <p className="comment-time">
                                                                                        {reply.timestamp?.toDate?.() 
                                                                                            ? reply.timestamp.toDate().toLocaleDateString('en-US', {
                                                                                                month: 'short',
                                                                                                day: 'numeric',
                                                                                                hour: '2-digit',
                                                                                                minute: '2-digit'
                                                                                            })
                                                                                            : new Date(reply.timestamp).toLocaleDateString('en-US', {
                                                                                                month: 'short',
                                                                                                day: 'numeric',
                                                                                                hour: '2-digit',
                                                                                                minute: '2-digit'
                                                                                            })}
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className={`add-comment ${!collapsedComments[item.id] ? 'collapsed' : ''}`}>
                                                            <textarea
                                                                placeholder={replyingTo && activePost === item.id ? 
                                                                    "Write a reply..." : "Write a comment..."}
                                                                value={activePost === item.id ? commentText : ''}
                                                                onChange={(e) => {
                                                                    setActivePost(item.id);
                                                                    setCommentText(e.target.value);
                                                                }}
                                                            />
                                                            <button onClick={() => handleAddComment(item.id)}>
                                                                {replyingTo && activePost === item.id ? 'Reply' : 'Post'}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <Analytics />
                )}
            </div>

            {/* Scroll to Top Button */}
            <button 
                className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
                onClick={scrollToTop}
                aria-label="Scroll to top"
            >
                ↑
            </button>

            {/* Comment Modal */}
            <div className={`comment-modal-overlay ${modalActive ? 'active' : ''}`} onClick={closeModal}>
                <div className="comment-modal ${modalActive ? 'active' : ''}" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>{selectedItem?.itemName}</h3>
                        <button className="close-modal" onClick={closeModal}>&times;</button>
                    </div>
                    <div className="modal-content">
                        <div className="modal-comments">
                            {selectedItem?.comments?.map((comment, index) => (
                                <div key={`${selectedItem.id}-comment-${index}`} className="comment">
                                    <p className="comment-user">{comment.userEmail.split('@')[0]}</p>
                                    <p className="comment-text">{comment.text}</p>
                                    <p className="comment-time">
                                        {comment.timestamp?.toDate?.() 
                                            ? comment.timestamp.toDate().toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : new Date(comment.timestamp).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="comment-input-container">
                            {showEmojiPicker && (
                                <div className="emoji-picker-container">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        theme="dark"
                                        width={300}
                                    />
                                </div>
                            )}
                            <button 
                                className="emoji-trigger"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                😊
                            </button>
                            <textarea
                                placeholder="Write a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (newComment.trim()) {
                                            handleAddComment();
                                        }
                                    }
                                }}
                            />
                            <button 
                                className="post-comment-btn"
                                onClick={handleAddComment}
                                disabled={!newComment.trim()}
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;