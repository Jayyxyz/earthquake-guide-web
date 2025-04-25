import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  where,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  query,
  onSnapshot,
  serverTimestamp,
  orderBy
} from './firebase';
import './App.css';
import MessagingTab from './MessagingTab';

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  // Application state
  const [earthquakes,] = useState([
    { id: 1, location: "Davao", magnitude: 7.6, depth: "35km", time: "2 hours ago", alert: "red" },
    { id: 2, location: "Manila", magnitude: 5.2, depth: "15km", time: "5 hours ago", alert: "yellow" },
    { id: 3, location: "Cebu", magnitude: 4.1, depth: "25km", time: "1 day ago", alert: "green" }
  ]);

  const [activeTab, setActiveTab] = useState('preparedness');
  const [userLocation, setUserLocation] = useState(null);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [contactEmail, setContactEmail] = useState('');

  // Initialize auth state and load users
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          uid: firebaseUser.uid
        };
        setUser(userData);
        
        // Load user's contacts and emergency contacts
        await loadContacts(firebaseUser.uid);
        await loadEmergencyContacts(firebaseUser.uid);
        setActiveTab('alerts');
      } else {
        setUser(null);
        setActiveTab('preparedness');
      }
    });

    const loadAllUsers = async () => {
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    };

    loadAllUsers();
    setUserLocation({ lat: 8.4542, lng: 124.6319 });

    return () => unsubscribeAuth();
  }, []);

  // Load user's contacts
  const loadContacts = async (userId) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await
 getDoc(userRef);
    
    if (userSnap.exists()) {
      setContacts(userSnap.data().contacts || []);
    }
  };

  // Load emergency contacts
  const loadEmergencyContacts = async (userId) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      setEmergencyContacts(userSnap.data().emergencyContacts || []);
    }
  };

  // Authentication handlers
  const handleAuthInputChange = (e) => {
    const { name, value } = e.target;
    setAuthForm({
      ...authForm,
      [name]: value
    });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (authForm.password !== authForm.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        authForm.email,
        authForm.password
      );
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: authForm.email,
        name: authForm.name,
        contacts: [],
        emergencyContacts: []
      });
      
      setAuthMode(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth,
        authForm.email,
        authForm.password
      );
      setAuthMode(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert(error.message);
    }
  };

  // Contact management
  const handleAddContact = async (contactEmail) => {
    if (!contactEmail.trim()) return;
  
    try {
      // First check local state
      const normalizedEmail = contactEmail.toLowerCase();
      let contact = users.find(u => 
        u.email.toLowerCase() === normalizedEmail
      );
  
      // If not found locally, query Firestore directly
      if (!contact) {
        console.log('User not in local state, querying Firestore...');
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", contactEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          contact = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
          };
          // Update local users list
          setUsers(prev => [...prev, contact]);
        }
      }
  
      if (!contact) {
        alert('User not found. Please enter a registered user email.');
        return;
      }
  
      if (contacts.some(c => c.email.toLowerCase() === normalizedEmail)) {
        alert('This contact already exists');
        return;
      }
  
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        contacts: [...contacts, { 
          email: contact.email, 
          name: contact.name,
          uid: contact.id 
        }]
      }, { merge: true });
  
      setContacts(prev => [...prev, { 
        email: contact.email, 
        name: contact.name,
        uid: contact.id
      }]);
      setContactEmail('');
      
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Error adding contact: ' + error.message);
    }
  };

  const handleAddEmergencyContact = async (contactEmail) => {
    if (!emergencyContacts.includes(contactEmail)) {
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          emergencyContacts: [...emergencyContacts, contactEmail]
        }, { merge: true });

        setEmergencyContacts([...emergencyContacts, contactEmail]);
      } catch (error) {
        alert('Error adding emergency contact: ' + error.message);
      }
    }
  };

  const handleRemoveEmergencyContact = async (contactEmail) => {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        emergencyContacts: emergencyContacts.filter(e => e !== contactEmail)
      }, { merge: true });

      setEmergencyContacts(emergencyContacts.filter(e => e !== contactEmail));
    } catch (error) {
      alert('Error removing emergency contact: ' + error.message);
    }
  };

  // Messaging functions
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
  
    try {
      const contact = contacts.find(c => c.email === activeChat);
      if (!contact || !contact.uid) return;
  
      const chatId = [user.uid, contact.uid].sort().join('_');
  
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: newMessage,
        sender: user.uid,
        timestamp: serverTimestamp()
      });
  
      setNewMessage('');
    } catch (error) {
      alert('Error sending message: ' + error.message);
    }
  };
  

  // Real-time messages listener
  useEffect(() => {
    if (!user || !activeChat || contacts.length === 0) return;
  
    const contact = contacts.find(c => c.email === activeChat);
    if (!contact || !contact.uid) return;
  
    const chatId = [user.uid, contact.uid].sort().join('_');
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
  
    console.log(`👀 Listening to chat messages in: ${chatId}`);
  
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      setMessages(prev => ({
        ...prev,
        [activeChat]: messagesList
      }));
    }, (error) => {
      console.error("❌ Snapshot error:", error.message);
    });
  
    return () => unsubscribe();
  }, [activeChat, user, contacts]);
  

  // SOS function
  const handleSOS = async () => {
    if (emergencyContacts.length === 0) {
      alert('Please add emergency contacts first!');
      return;
    }

    const message = `EMERGENCY ALERT! ${user.name} needs help! 
    Location: ${userLocation ? `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` : 'Unknown location'}
    Time: ${new Date().toLocaleString()}`;

    try {
      await Promise.all(emergencyContacts.map(async (contactEmail) => {
        const contact = contacts.find(c => c.email === contactEmail);
        if (!contact) return;

        const chatId = [user.uid, contact.uid].sort().join('_');
        await addDoc(collection(db, "chats", chatId, "messages"), {
          text: message,
          sender: 'system',
          timestamp: serverTimestamp()
        });
      }));

      alert(`Emergency alert sent to ${emergencyContacts.length} contacts!`);
    } catch (error) {
      alert('Error sending emergency alert: ' + error.message);
    }
  };

  // Tab components (simplified for example)
  const renderContent = () => {
    return (
      <>
        {activeTab === 'alerts' && user && <AlertsTab earthquakes={earthquakes} userLocation={userLocation} />}
        {activeTab === 'map' && user && <MapTab />}
        {activeTab === 'messaging' && user && (
          <MessagingTab
            user={user}
            contacts={contacts}
            messages={messages}
            activeChat={activeChat}
            setActiveChat={setActiveChat}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            handleAddContact={handleAddContact}
            contactEmail={contactEmail}
            setContactEmail={setContactEmail}
            emergencyContacts={emergencyContacts}
            handleAddEmergencyContact={handleAddEmergencyContact}
            handleRemoveEmergencyContact={handleRemoveEmergencyContact}
            users={users}
          />
        )}
        {activeTab === 'sos' && user && <SosTab handleSOS={handleSOS} />}
        {activeTab === 'preparedness' && <PreparednessTab />}
        {activeTab === 'resources' && <ResourcesTab />}
      </>
    );
  };

  return (
    <div className="e-quake-app">
      {/* Header with Auth Status */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">E-QUAKE</h1>
          {user && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          )}
        </div>
        <div className="header-right">
          {user ? (
            <button className="auth-btn signout" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <>
              <button className="auth-btn signin" onClick={() => setAuthMode('signin')}>
                Sign In
              </button>
              <button className="auth-btn signup" onClick={() => setAuthMode('signup')}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="app-nav">
        {user && (
          <>
            <button 
              className={`nav-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              Alerts
            </button>
            <button 
              className={`nav-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              Map
            </button>
            <button 
              className={`nav-btn ${activeTab === 'messaging' ? 'active' : ''}`}
              onClick={() => setActiveTab('messaging')}
            >
              Messaging
            </button>
            <button 
              className={`nav-btn ${activeTab === 'sos' ? 'active' : ''}`}
              onClick={() => setActiveTab('sos')}
            >
              SOS
            </button>
          </>
        )}
        <button 
          className={`nav-btn ${activeTab === 'preparedness' ? 'active' : ''}`}
          onClick={() => setActiveTab('preparedness')}
        >
          Preparedness
        </button>
        <button 
          className={`nav-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </button>
      </nav>

      {/* Main Content */}
      <main className="app-content">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>E-QUAKE</h3>
              <p>Comprehensive Earthquake Preparedness Hub</p>
            </div>
            <div className="footer-links">
              <div>
                <h4>Quick Links</h4>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
                <a href="#privacy">Privacy Policy</a>
              </div>
              <div>
                <h4>Resources</h4>
                <a href="#phivolcs">PHIVOLCS</a>
                <a href="#ndrrmc">NDRRMC</a>
                <a href="#redcross">Red Cross</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 University of Science and Technology of Southern Philippines</p>
            <p>IT323 - Application Development Project</p>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      {authMode && (
        <div className="auth-modal">
          <div className="auth-container">
            <button className="close-auth" onClick={() => setAuthMode(null)}>×</button>
            <h2>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
            
            <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthInputChange}
                    required
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthInputChange}
                  required
                  minLength="6"
                />
              </div>
              
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={authForm.confirmPassword}
                    onChange={handleAuthInputChange}
                    required
                    minLength="6"
                  />
                </div>
              )}
              
              <button type="submit" className="auth-submit">
                {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab Components (simplified for example)
function AlertsTab({ earthquakes, userLocation }) {
  return (
    <section className="alerts-tab">
      <div className="alert-header">
        <h2>Recent Earthquakes</h2>
        <div className="alert-filter">
          <span>Filter by:</span>
          <select>
            <option>All Alerts</option>
            <option>Red Alerts</option>
            <option>Yellow Alerts</option>
            <option>Green Alerts</option>
          </select>
        </div>
      </div>
      
      <div className="earthquake-list">
        {earthquakes.map(quake => (
          <div key={quake.id} className={`quake-card ${quake.alert}`}>
            <div className="quake-magnitude">
              <span>{quake.magnitude}</span>
              <small>Magnitude</small>
            </div>
            <div className="quake-details">
              <h3>{quake.location}</h3>
              <p>Depth: {quake.depth} • {quake.time}</p>
              {userLocation && <p className="distance">Approx. 120km from you</p>}
            </div>
            <div className={`alert-level ${quake.alert}`}>
              {quake.alert.toUpperCase()} ALERT
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MapTab() {
  return (
    <section className="map-tab">
      <h2>Earthquake Map</h2>
      <div className="map-container">
        <div className="map-placeholder">
          <p>[Interactive Map Displaying Recent Earthquakes]</p>
          <div className="map-legend">
            <div><span className="legend-red"></span> Magnitude 6.0+</div>
            <div><span className="legend-yellow"></span> Magnitude 4.5-5.9</div>
            <div><span className="legend-green"></span> Magnitude &lt;4.5</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SosTab({ handleSOS }) {
  return (
    <section className="sos-tab">
      <h2>Emergency SOS</h2>
      <div className="sos-content">
        <div className="sos-card">
          <h3>Immediate Assistance</h3>
          <p>In case of emergency, click the button below to notify your emergency contacts with your current location.</p>
          <button className="sos-btn" onClick={handleSOS}>
            Send Emergency Alert
          </button>
        </div>
        <div className="emergency-contacts">
          <h3>Emergency Contacts</h3>
          <ul>
            <li>National Emergency Hotline: 911</li>
            <li>Philippine Red Cross: 143</li>
            <li>NDRRMC: (02) 8911-5061 to 65</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function PreparednessTab() {
  const [activeGuide, setActiveGuide] = useState('before');

  return (
    <section className="preparedness-tab">
      <h2>Earthquake Preparedness</h2>
      
      <div className="guide-tabs">
        <button 
          className={activeGuide === 'before' ? 'active' : ''} 
          onClick={() => setActiveGuide('before')}
        >
          Before Earthquake
        </button>
        <button 
          className={activeGuide === 'during' ? 'active' : ''} 
          onClick={() => setActiveGuide('during')}
        >
          During Earthquake
        </button>
        <button 
          className={activeGuide === 'after' ? 'active' : ''} 
          onClick={() => setActiveGuide('after')}
        >
          After Earthquake
        </button>
      </div>
      
      <div className="guide-content">
        {activeGuide === 'before' && (
          <div className="infographic-container">
            <h3>Before an Earthquake</h3>
            <div className="infographic-grid">
              <div className="infographic-card">
                <div className="icon">🏠</div>
                <h4>Secure Your Home</h4>
                <p>Anchor heavy furniture to walls and install cabinet latches</p>
              </div>
              <div className="infographic-card">
                <div className="icon">🛠️</div>
                <h4>Know Your Utilities</h4>
                <p>Learn how to turn off gas, water, and electricity</p>
              </div>
              <div className="infographic-card">
                <div className="icon">🧰</div>
                <h4>Prepare Emergency Kit</h4>
                <p>Include food, water, first aid, flashlight, and batteries</p>
              </div>
              <div className="infographic-card">
                <div className="icon">🗺️</div>
                <h4>Plan Evacuation Routes</h4>
                <p>Identify safe spots in each room and meeting points</p>
              </div>
            </div>
          </div>
        )}
        
        {activeGuide === 'during' && (
          <div className="infographic-container">
            <h3>During an Earthquake</h3>
            <div className="action-steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>DROP</h4>
                  <p>Drop down to your hands and knees</p>
                  <div className="visual-person">🧎</div>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>COVER</h4>
                  <p>Take cover under sturdy furniture</p>
                  <div className="visual-person">🪑</div>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>HOLD ON</h4>
                  <p>Hold on until shaking stops</p>
                  <div className="visual-person">🤲</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeGuide === 'after' && (
          <div className="infographic-container">
            <h3>After an Earthquake</h3>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>Immediately After</h4>
                  <ul>
                    <li>Check for injuries</li>
                    <li>Expect aftershocks</li>
                    <li>Put on sturdy shoes</li>
                  </ul>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>First Few Hours</h4>
                  <ul>
                    <li>Check for damage and hazards</li>
                    <li>Listen to emergency broadcasts</li>
                    <li>Use text messages to communicate</li>
                  </ul>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>Coming Days</h4>
                  <ul>
                    <li>Follow official instructions</li>
                    <li>Help neighbors if safe</li>
                    <li>Document damage for insurance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ResourcesTab() {
  const [activeResource, setActiveResource] = useState(null);

  const resources = {
    basics: {
      title: "Earthquake Basics",
      content: (
        <div>
          <h3>What Causes Earthquakes?</h3>
          <p>Earthquakes are caused by the sudden release of energy in the Earth's lithosphere that creates seismic waves.</p>
        </div>
      )
    },
    building: {
      title: "Building Safety Guide",
      content: (
        <div>
          <h3>Earthquake-Resistant Construction</h3>
          <p>Buildings in earthquake-prone areas should follow these principles...</p>
        </div>
      )
    }
  };

  return (
    <section className="resources-tab">
      <h2>Educational Resources</h2>
      
      {activeResource ? (
        <div className="resource-viewer">
          <button className="back-button" onClick={() => setActiveResource(null)}>
            ← Back to Resources
          </button>
          <h3>{resources[activeResource].title}</h3>
          <div className="resource-content">
            {resources[activeResource].content}
          </div>
        </div>
      ) : (
        <div className="resource-cards">
          <div className="resource-card" onClick={() => setActiveResource('basics')}>
            <h3>Earthquake Basics</h3>
            <p>Learn about what causes earthquakes and how they're measured.</p>
          </div>
          <div className="resource-card" onClick={() => setActiveResource('building')}>
            <h3>Building Safety</h3>
            <p>How to earthquake-proof your home and identify structural risks.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default App;