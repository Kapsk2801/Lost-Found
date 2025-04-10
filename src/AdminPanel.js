import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { isAdmin } from './firebase';
import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('claims');
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!auth.currentUser) {
        navigate('/');
        return;
      }

      const adminStatus = await isAdmin(auth.currentUser.uid);
      setIsUserAdmin(adminStatus);
      setLoading(false);

      if (!adminStatus) {
        navigate('/home');
      }
    };

    checkAdminAccess();
  }, [auth.currentUser, navigate]);

  useEffect(() => {
    if (isUserAdmin) {
      fetchPendingClaims();
      fetchItems();
    }
  }, [isUserAdmin]);

  const fetchPendingClaims = async () => {
    try {
      setLoading(true);
      
      // First, check if 'claims' collection exists
      const testQuery = query(collection(db, 'claims'), limit(1));
      const testSnapshot = await getDocs(testQuery);
      
      // If no claims collection exists yet, create an example claim for testing
      if (testSnapshot.empty) {
        console.log("No claims collection found, checking for items with claim info");
        
        // Look for items that have claim information directly in them
        const itemsQuery = query(
          collection(db, 'items'),
          where('claimStatus', 'in', ['pending', 'claimed']),
          orderBy('timestamp', 'desc')
        );
        
        const itemsSnapshot = await getDocs(itemsQuery);
        const claimsData = [];
        
        for (const itemDoc of itemsSnapshot.docs) {
          const itemData = itemDoc.data();
          if (itemData.claimStatus && itemData.claimedBy) {
            // Get user info if available
            let userData = { name: "Unknown User", email: "unknown@email.com" };
            if (itemData.claimedBy) {
              try {
                const userDoc = await getDoc(doc(db, 'users', itemData.claimedBy));
                if (userDoc.exists()) {
                  userData = userDoc.data();
                }
              } catch (error) {
                console.error("Error fetching user data:", error);
              }
            }
            
            claimsData.push({
              id: itemDoc.id + "_claim",
              itemId: itemDoc.id,
              claimStatus: itemData.claimStatus,
              claimDate: itemData.claimDate || itemData.timestamp,
              userId: itemData.claimedBy,
              userName: userData.name || userData.firstName + " " + userData.lastName || "Unknown",
              userEmail: userData.email || "N/A",
              userPhone: userData.phone || "N/A",
              itemTitle: itemData.title || itemData.itemName,
              itemCategory: itemData.category || "Other",
              itemLocation: itemData.location || "Unknown",
              item: {
                id: itemDoc.id,
                ...itemData,
                image: itemData.imageData || itemData.imageUrl || itemData.image || 'https://via.placeholder.com/400x300?text=No+Image'
              }
            });
          }
        }
        
        console.log("Found items with claim info:", claimsData.length);
        setPendingClaims(claimsData);
        setLoading(false);
        return;
      }
      
      // Normal flow - fetch from claims collection
      const claimsQuery = query(
        collection(db, 'claims'),
        orderBy('claimDate', 'desc')
      );
      
      const claimsSnapshot = await getDocs(claimsQuery);
      console.log("Claims snapshot size:", claimsSnapshot.size);
      
      const claimsData = [];
      
      for (const claimDoc of claimsSnapshot.docs) {
        try {
          const claimData = claimDoc.data();
          console.log("Processing claim:", claimDoc.id, claimData);
          
          // Get the related item
          let itemData = null;
          if (claimData.itemId) {
            const itemDoc = await getDoc(doc(db, 'items', claimData.itemId));
            if (itemDoc.exists()) {
              itemData = itemDoc.data();
            } else {
              console.log("Referenced item doesn't exist:", claimData.itemId);
            }
          }
          
          // Get user info if available
          let userData = { name: "Unknown User", email: "unknown@email.com" };
          if (claimData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', claimData.userId));
              if (userDoc.exists()) {
                userData = userDoc.data();
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
            }
          }
          
          claimsData.push({
            id: claimDoc.id,
            ...claimData,
            userName: claimData.userName || userData.name || userData.firstName + " " + userData.lastName || "Unknown",
            userEmail: claimData.userEmail || userData.email || "N/A",
            userPhone: claimData.userPhone || userData.phone || "N/A",
            item: itemData ? {
              id: claimData.itemId,
              ...itemData,
              image: itemData.imageData || itemData.imageUrl || itemData.image || 'https://via.placeholder.com/400x300?text=No+Image'
            } : null
          });
        } catch (error) {
          console.error("Error processing claim document:", error);
        }
      }
      
      console.log("Processed claims data:", claimsData);
      setPendingClaims(claimsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to fetch pending claims: ' + error.message);
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, 'items'),
        orderBy('timestamp', 'desc')
      );
      
      const itemsSnapshot = await getDocs(itemsQuery);
      const itemsData = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        // Debug log to check image data
        if (data.id === itemsSnapshot.docs[0]?.id) {
          console.log("First item image data types:", {
            hasImageData: !!data.imageData,
            imageDataType: typeof data.imageData,
            imageDataLength: data.imageData ? data.imageData.length : 0,
            imageDataStart: data.imageData ? data.imageData.substring(0, 30) + '...' : 'N/A',
            hasImageUrl: !!data.imageUrl,
            hasImage: !!data.image
          });
        }
        return {
          id: doc.id,
          ...data,
          // Use imageData, imageUrl, or image, then fallback to placeholder
          image: data.imageData || data.imageUrl || data.image || 'https://via.placeholder.com/400x300?text=No+Image'
        };
      });
      
      console.log("Fetched items with images:", itemsData.length);
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    }
  };

  const handleClaimAction = async (claimId, action) => {
    try {
      setLoading(true);
      
      // Check if this is a regular claim or an item-based claim
      const isItemBasedClaim = claimId.includes("_claim");
      
      let claimData, itemId;
      
      if (isItemBasedClaim) {
        // Handle item-based claim
        itemId = claimId.split("_claim")[0];
        console.log("Processing item-based claim for item:", itemId);
        
        // Get the claim from our state
        const claim = pendingClaims.find(c => c.id === claimId);
        if (!claim) {
          toast.error('Claim not found in the current list');
          setLoading(false);
          return;
        }
        
        claimData = claim;
      } else {
        // Handle regular claim
        const claimRef = doc(db, 'claims', claimId);
        const claimDoc = await getDoc(claimRef);
        
        if (!claimDoc.exists()) {
          toast.error('Claim not found in the database');
          setLoading(false);
          return;
        }
        
        claimData = claimDoc.data();
        itemId = claimData.itemId;
      }
      
      // Get the item reference
      const itemRef = doc(db, 'items', itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        toast.error('Associated item not found');
        setLoading(false);
        return;
      }
      
      // Process the claim based on the action
      if (action === 'approve') {
        // Update the claim if it's a regular claim
        if (!isItemBasedClaim) {
          const claimRef = doc(db, 'claims', claimId);
          await updateDoc(claimRef, {
            claimStatus: 'approved',
            processedAt: new Date()
          });
        }
        
        // Update the item
        await updateDoc(itemRef, {
          status: 'claimed',
          claimStatus: 'claimed',
          claimedBy: claimData.userId,
          claimId: isItemBasedClaim ? null : claimId,
          claimApprovedAt: new Date(),
          lastUpdated: new Date()
        });
        
        toast.success('Claim approved successfully');
      } else if (action === 'reject') {
        // Update the claim if it's a regular claim
        if (!isItemBasedClaim) {
          const claimRef = doc(db, 'claims', claimId);
          await updateDoc(claimRef, {
            claimStatus: 'rejected',
            processedAt: new Date()
          });
        }
        
        // Update the item
        await updateDoc(itemRef, {
          status: isItemBasedClaim ? 'found' : 'available',
          claimStatus: 'unclaimed',
          claimedBy: null,
          claimId: null,
          lastUpdated: new Date()
        });
        
        toast.success('Claim rejected successfully');
      }
      
      // Refresh the claims list and items list
      fetchPendingClaims();
      fetchItems();
      
      setLoading(false);
    } catch (error) {
      console.error('Error processing claim:', error);
      toast.error('Failed to process claim: ' + error.message);
      setLoading(false);
    }
  };

  const handleMarkAsFound = async (itemId) => {
    try {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        status: 'found',
        foundAt: new Date()
      });
      
      toast.success('Item marked as found successfully');
      fetchItems();
    } catch (error) {
      console.error('Error marking item as found:', error);
      toast.error('Failed to mark item as found');
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => navigate('/'));
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!isUserAdmin) {
    return null;
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <span className="admin-title">Admin Dashboard</span>
        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'claims' ? 'active' : ''}`}
            onClick={() => setActiveTab('claims')}
          >
            Pending Claims
          </button>
          <button 
            className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Manage Items
          </button>
        </div>
        <div className="profile-dropdown">
          <div className="profile-circle" onClick={() => setShowDropdown(!showDropdown)}>
            {auth.currentUser?.email[0].toUpperCase() || 'A'}
          </div>
          {showDropdown && (
            <div className="dropdown-menu">
              <button onClick={() => navigate('/home')}>
                View Homepage
              </button>
              <button onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="admin-content">
        {activeTab === 'claims' && (
          <div className="claims-section">
            <h2>Pending Claims</h2>
            {pendingClaims.length === 0 ? (
              <p className="no-claims">No pending claims</p>
            ) : (
              <div className="claims-list">
                {pendingClaims.map(claim => (
                  <div key={claim.id} className="claim-card">
                    <div className="claim-header">
                      <h3>Claim #{claim.id.slice(0, 8)}</h3>
                      <span className={`status-badge ${claim.claimStatus || 'pending'}`}>
                        {claim.claimStatus || 'pending'}
                      </span>
                      <span className="claim-date">
                        {claim.claimDate && typeof claim.claimDate.toDate === 'function'
                          ? claim.claimDate.toDate().toLocaleString()
                          : (claim.claimDate instanceof Date 
                              ? claim.claimDate.toLocaleString()
                              : (typeof claim.claimDate === 'string' 
                                  ? new Date(claim.claimDate).toLocaleString() 
                                  : 'Unknown date'))}
                      </span>
                    </div>
                    
                    <div className="claim-details">
                      <div className="item-info">
                        <h4>Item Details</h4>
                        {claim.item && claim.item.image && (
                          <div className="item-image">
                            <img 
                              src={claim.item.image} 
                              alt={claim.item?.title || claim.itemTitle || "Item"} 
                              onError={(e) => {
                                console.log('Claim image failed to load:', claim.id);
                                e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                              }}
                            />
                          </div>
                        )}
                        <p><strong>Title:</strong> {claim.item?.title || claim.item?.itemName || claim.itemTitle || "Unknown Item"}</p>
                        <p><strong>Category:</strong> {claim.item?.category || claim.itemCategory || "Other"}</p>
                        <p><strong>Location:</strong> {claim.item?.location || claim.itemLocation || "Unknown"}</p>
                        <p><strong>Status:</strong> {claim.item?.status || "Unknown"}</p>
                      </div>
                      
                      <div className="user-info">
                        <h4>Claimant Details</h4>
                        <p><strong>Name:</strong> {claim.userName || "Unknown"}</p>
                        <p><strong>Email:</strong> {claim.userEmail || "Not provided"}</p>
                        <p><strong>Phone:</strong> {claim.userPhone || "Not provided"}</p>
                        <p><strong>Claim Reason:</strong> {claim.reason || "Not provided"}</p>
                        <p><strong>Identification:</strong> {claim.identificationDetails || "Not provided"}</p>
                      </div>
                    </div>
                    
                    <div className="claim-actions">
                      {(claim.claimStatus === 'pending' || !claim.claimStatus) && (
                        <>
                          <button 
                            className="approve-btn"
                            onClick={() => handleClaimAction(claim.id, 'approve')}
                          >
                            Approve Claim
                          </button>
                          <button 
                            className="reject-btn"
                            onClick={() => handleClaimAction(claim.id, 'reject')}
                          >
                            Reject Claim
                          </button>
                        </>
                      )}
                      {claim.claimStatus === 'approved' && (
                        <span className="approved-label">This claim has been approved</span>
                      )}
                      {claim.claimStatus === 'rejected' && (
                        <span className="rejected-label">This claim has been rejected</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'items' && (
          <div className="items-section">
            <h2>Manage Items</h2>
            <div className="items-list">
              {items.map(item => (
                <div key={item.id} className="item-card">
                  <div className="item-image">
                    <img 
                      src={item.image} 
                      alt={item.title || "Item"}
                      onError={(e) => {
                        console.log('Image failed to load:', item.id);
                        e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                    <span className={`status-badge ${item.status}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="item-content">
                    <div className="item-header">
                      <h3>{item.title || 'Untitled Item'}</h3>
                    </div>
                    
                    <div className="item-details">
                      <p><strong>Category:</strong> {item.category || 'Not specified'}</p>
                      <p><strong>Location:</strong> {item.location || 'Not specified'}</p>
                      <p><strong>Posted:</strong> {item.timestamp && typeof item.timestamp.toDate === 'function' 
                        ? item.timestamp.toDate().toLocaleString() 
                        : new Date(item.timestamp).toLocaleString()}</p>
                      <p><strong>Status:</strong> {item.status || 'Unknown'}</p>
                      {item.claimStatus && (
                        <p><strong>Claim Status:</strong> {item.claimStatus}</p>
                      )}
                    </div>
                    
                    <div className="item-actions">
                      {item.status !== 'found' && (
                        <button 
                          className="mark-found-button"
                          onClick={() => handleMarkAsFound(item.id)}
                        >
                          Mark as Found
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 