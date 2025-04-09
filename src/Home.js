import React, { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import EmojiPicker from 'emoji-picker-react';
import "./Home.css";

// Category icons and data
const categories = [
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'accessories', name: 'Accessories', icon: '👜' },
    { id: 'keys', name: 'Keys', icon: '🔑' },
    { id: 'clothing', name: 'Clothing', icon: '👕' },
    { id: 'other', name: 'Other', icon: '📦' }
];

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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [filteredItems, setFilteredItems] = useState([]);
    const [showShareOptions, setShowShareOptions] = useState({});

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
        const itemsQuery = query(collection(db, 'items'), orderBy('timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
            const itemsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || 'Item Title Missing',
                    description: data.description || 'No description provided',
                    location: data.location || 'Location not specified',
                    status: data.status || 'unknown',
                    date: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
                    image: data.imageUrl || data.imageData || 'https://via.placeholder.com/300?text=No+Image',
                    category: data.category || 'other',
                    comments: data.comments || [],
                    contactInfo: data.contactInfo || 'Contact information not provided',
                    reward: data.reward || 'No reward specified',
                    lastSeen: data.lastSeen || 'Last seen location not specified',
                    itemDetails: {
                        brand: data.itemDetails?.brand || '',
                        color: data.itemDetails?.color || '',
                        model: data.itemDetails?.model || '',
                        serialNumber: data.itemDetails?.serialNumber || ''
                    },
                    urgency: data.urgency || 'normal',
                    claimStatus: data.claimStatus || 'unclaimed'
                };
            });
            setItems(itemsData);
            setFilteredItems(itemsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching items:", error);
            setLoading(false);
        });

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

    // Filter and sort items
    useEffect(() => {
        if (!items || items.length === 0) {
            setFilteredItems([]);
            return;
        }

        let filtered = [...items];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(item =>
                (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (item.location?.toLowerCase() || '').includes(searchQuery.toLowerCase())
            );
        }

        // Category filter
        if (selectedCategory) {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'latest') {
                return b.date - a.date;
            }
            return a.date - b.date;
        });

        setFilteredItems(filtered);
    }, [items, searchQuery, selectedCategory, sortBy]);

    // Share functionality
    const handleShare = (item) => {
        if (!item) return;

        const shareData = {
            title: item.title || 'Shared Item',
            text: `Check out this ${item.status || 'item'}: ${item.title || 'Untitled'}`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            setShowShareOptions(prev => ({
                ...prev,
                [item.id]: !prev[item.id]
            }));
        }
    };

    return (
        <div className="home-container">
            <header>
                <h1>Retrievio - Lost and Found</h1>
                <div className="profile-dropdown">
                    <div className="profile-circle" onClick={toggleDropdown}>
                        {user?.email?.[0]?.toUpperCase() || 'U'}
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
                            <button onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="content">
                {/* Left Sidebar */}
                <div className="sidebar">
                    <div className="welcome-section">
                        <h2>Welcome back, {user?.email ? user.email.split('@')[0] : 'User'}</h2>
                    </div>

                    <div className="search-filter-container">
                        <div className="search-bar">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search lost or found items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="category-tags">
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    className={`category-tag ${selectedCategory === category.id ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(prev => prev === category.id ? '' : category.id)}
                                >
                                    <span>{category.icon}</span>
                                    {category.name}
                                </button>
                            ))}
                        </div>

                        <div className="filter-options">
                            <div className="filter-group">
                                <label className="filter-label">Sort By</label>
                                <select
                                    className="filter-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="latest">Latest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="main-content">
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                        </div>
                    ) : (
                        <div className="items-grid">
                            {filteredItems && filteredItems.length > 0 ? (
                                filteredItems.map((item) => item && (
                                    <div key={item.id} id={`post-${item.id}`} className="item-card">
                                        <div className="item-image">
                                            <img 
                                                src={item.image} 
                                                alt={item.title} 
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                                                }}
                                            />
                                            <div className="item-overlay">
                                                <button 
                                                    className="view-full-post"
                                                    onClick={() => handleCommentClick(item)}
                                                >
                                                    <span>View Details</span>
                                                    <i className="fas fa-arrow-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="item-content">
                                            <div className="item-header">
                                                <h3 className="item-title">{item.title}</h3>
                                                <span className={`status-badge status-${item.status} ${item.urgency}`}>
                                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                </span>
                                            </div>
                                            <div className="item-details">
                                                <p className="item-description">{item.description}</p>
                                                <div className="item-info-grid">
                                                    <div className="item-location">
                                                        <i className="fas fa-map-marker-alt"></i>
                                                        <span>{item.location}</span>
                                                    </div>
                                                    {item.lastSeen && (
                                                        <div className="item-last-seen">
                                                            <i className="fas fa-clock"></i>
                                                            <span>Last seen: {item.lastSeen}</span>
                                                        </div>
                                                    )}
                                                    {item.itemDetails.color && (
                                                        <div className="item-color">
                                                            <i className="fas fa-palette"></i>
                                                            <span>Color: {item.itemDetails.color}</span>
                                                        </div>
                                                    )}
                                                    {item.reward && item.status === 'lost' && (
                                                        <div className="item-reward">
                                                            <i className="fas fa-gift"></i>
                                                            <span>Reward: {item.reward}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="item-footer">
                                                <div className="item-contact">
                                                    <button className="contact-button">
                                                        <i className="fas fa-envelope"></i>
                                                        Contact
                                                    </button>
                                                </div>
                                                <div className="item-status-info">
                                                    <span className={`claim-status ${item.claimStatus}`}>
                                                        {item.claimStatus === 'unclaimed' ? 'Available' : 'In Process'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-results">
                                    <h3>No items found</h3>
                                    <p>Try adjusting your search or filters to find what you're looking for.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
                <div className="comment-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>{selectedItem?.title || 'Item Details'}</h3>
                        <button className="close-modal" onClick={closeModal}>&times;</button>
                    </div>
                    <div className="modal-content">
                        <div className="modal-item-details">
                            <div className="modal-image-container">
                                <img 
                                    src={selectedItem?.image || 'https://via.placeholder.com/300'} 
                                    alt={selectedItem?.title || 'Item image'}
                                    onError={(e) => {e.target.src = 'https://via.placeholder.com/300'}}
                                />
                                <span className={`status-badge status-${selectedItem?.status || 'unknown'}`}>
                                    {(selectedItem?.status?.charAt(0).toUpperCase() + selectedItem?.status?.slice(1)) || 'Unknown'}
                                </span>
                            </div>
                            <div className="modal-info">
                                <div className="modal-title-section">
                                    <h2>{selectedItem?.title || 'Untitled'}</h2>
                                    <p className="modal-date">
                                        {selectedItem?.date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="modal-description">
                                    <p>{selectedItem?.description || 'No description available'}</p>
                                </div>
                                <div className="modal-location">
                                    <i className="fas fa-map-marker-alt"></i>
                                    <span>{selectedItem?.location || 'Location not specified'}</span>
                                </div>
                                <div className="modal-category">
                                    <i className="fas fa-tag"></i>
                                    <span>{categories.find(cat => cat.id === selectedItem?.category)?.name || 'Other'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-comments-section">
                            <h4>Comments ({selectedItem?.comments?.length || 0})</h4>
                            <div className="modal-comments">
                                {selectedItem?.comments?.map((comment, index) => (
                                    <div key={`${selectedItem.id}-comment-${index}`} className="comment">
                                        <div className="comment-header">
                                            <div className="comment-user-info">
                                                <div className="comment-user-avatar">
                                                    {comment.userEmail?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <p className="comment-user">{comment.userEmail?.split('@')[0]}</p>
                                            </div>
                                            <p className="comment-time">
                                                {comment.timestamp instanceof Timestamp 
                                                    ? comment.timestamp.toDate().toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : new Date().toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                            </p>
                                        </div>
                                        <p className="comment-text">{comment.text}</p>
                                    </div>
                                ))}
                            </div>
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