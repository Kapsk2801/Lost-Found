import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { isAdmin } from './firebase';
import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, orderBy } from 'firebase/firestore';
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
      const claimsQuery = query(
        collection(db, 'claims'),
        where('claimStatus', '==', 'pending'),
        orderBy('claimDate', 'desc')
      );
      
      const claimsSnapshot = await getDocs(claimsQuery);
      const claimsData = [];
      
      for (const claimDoc of claimsSnapshot.docs) {
        const claimData = claimDoc.data();
        const itemDoc = await getDoc(doc(db, 'items', claimData.itemId));
        const itemData = itemDoc.exists() ? itemDoc.data() : null;
        
        claimsData.push({
          id: claimDoc.id,
          ...claimData,
          item: itemData ? {
            id: itemDoc.id,
            ...itemData
          } : null
        });
      }
      
      setPendingClaims(claimsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to fetch pending claims');
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
      const itemsData = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        image: doc.data().imageData || 'https://via.placeholder.com/400x300?text=No+Image'
      }));
      
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    }
  };

  const handleClaimAction = async (claimId, action) => {
    try {
      const claimRef = doc(db, 'claims', claimId);
      const claimDoc = await getDoc(claimRef);
      const claimData = claimDoc.data();
      
      if (!claimData) {
        toast.error('Claim not found');
        return;
      }

      const itemRef = doc(db, 'items', claimData.itemId);
      
      if (action === 'approve') {
        await updateDoc(claimRef, {
          claimStatus: 'approved',
          processedAt: new Date()
        });
        
        await updateDoc(itemRef, {
          status: 'claimed',
          claimStatus: 'claimed',
          claimedBy: claimData.userId,
          claimId: claimId
        });
        
        toast.success('Claim approved successfully');
      } else if (action === 'reject') {
        await updateDoc(claimRef, {
          claimStatus: 'rejected',
          processedAt: new Date()
        });
        
        await updateDoc(itemRef, {
          status: 'available',
          claimStatus: 'unclaimed',
          claimedBy: null,
          claimId: null
        });
        
        toast.success('Claim rejected successfully');
      }
      
      // Refresh the claims list
      fetchPendingClaims();
    } catch (error) {
      console.error('Error processing claim:', error);
      toast.error('Failed to process claim');
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
                      <span className="claim-date">
                        {claim.claimDate && typeof claim.claimDate.toDate === 'function'
                          ? claim.claimDate.toDate().toLocaleString()
                          : new Date(claim.claimDate).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="claim-details">
                      <div className="item-info">
                        <h4>Item Details</h4>
                        <p><strong>Title:</strong> {claim.item?.title || claim.itemTitle}</p>
                        <p><strong>Category:</strong> {claim.item?.category || claim.itemCategory}</p>
                        <p><strong>Location:</strong> {claim.item?.location || claim.itemLocation}</p>
                      </div>
                      
                      <div className="user-info">
                        <h4>Claimant Details</h4>
                        <p><strong>Name:</strong> {claim.userName}</p>
                        <p><strong>Email:</strong> {claim.userEmail}</p>
                        <p><strong>Phone:</strong> {claim.userPhone || 'Not provided'}</p>
                        <p><strong>Department:</strong> {claim.userDepartment || 'Not provided'}</p>
                        <p><strong>Roll No:</strong> {claim.userRollNo || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="claim-actions">
                      <button 
                        className="approve-button"
                        onClick={() => handleClaimAction(claim.id, 'approve')}
                      >
                        Approve Claim
                      </button>
                      <button 
                        className="reject-button"
                        onClick={() => handleClaimAction(claim.id, 'reject')}
                      >
                        Reject Claim
                      </button>
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
                      src={item.image || 'https://via.placeholder.com/400x300?text=No+Image'} 
                      alt={item.title}
                      onError={(e) => {
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