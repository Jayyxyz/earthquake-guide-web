import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

  // Earthquake data state
  const [earthquakes, setEarthquakes] = useState([]);
  const [loadingQuakes, setLoadingQuakes] = useState(true);
  const [quakeError, setQuakeError] = useState(null);
  const [filter, setFilter] = useState('all');

  // Other application state
  const [activeTab, setActiveTab] = useState('preparedness');
  const [userLocation, setUserLocation] = useState(null);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [contactEmail, setContactEmail] = useState('');

  // Fetch real-time earthquake data from USGS API
  useEffect(() => {
    const fetchEarthquakes = async () => {
      try {
        setLoadingQuakes(true);
        const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
        const data = await response.json();
        
        const processedQuakes = data.features.map(feature => {
          const magnitude = feature.properties.mag;
          let alert;
          
          if (magnitude >= 6.0) alert = 'red';
          else if (magnitude >= 4.5) alert = 'yellow';
          else alert = 'green';
          
          return {
            id: feature.id,
            magnitude: magnitude,
            location: feature.properties.place,
            time: new Date(feature.properties.time).toLocaleString(),
            depth: `${Math.round(feature.geometry.coordinates[2])} km`,
            alert: alert,
            coordinates: {
              latitude: feature.geometry.coordinates[1],
              longitude: feature.geometry.coordinates[0]
            }
          };
        });
        
        setEarthquakes(processedQuakes);
        setLoadingQuakes(false);
      } catch (err) {
        setQuakeError(err.message);
        setLoadingQuakes(false);
      }
    };

    fetchEarthquakes();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchEarthquakes, 300000);
    return () => clearInterval(interval);
  }, []);

  // Get user location for distance calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          console.log("Location access denied or failed");
          // Default to Philippines center if location access denied
          setUserLocation({ latitude: 12.8797, longitude: 121.7740 });
        }
      );
    } else {
      // Default to Philippines center if geolocation not supported
      setUserLocation({ latitude: 12.8797, longitude: 121.7740 });
    }
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Filter earthquakes based on alert level
  const filteredEarthquakes = filter === 'all' 
    ? earthquakes 
    : earthquakes.filter(quake => quake.alert === filter);

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

    return () => unsubscribeAuth();
  }, []);

  // Load user's contacts
  const loadContacts = async (userId) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
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

  // Authentication handlers (remain the same as your original code)
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

  // Contact management (remain the same as your original code)
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

  // Messaging functions (remain the same as your original code)
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
  

  // Real-time messages listener (remain the same as your original code)
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
  

  // SOS function (remain the same as your original code)
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

  const renderContent = () => {
    return (
      <>
        {activeTab === 'alerts' && user && (
          <AlertsTab 
            earthquakes={filteredEarthquakes} 
            userLocation={userLocation} 
            loading={loadingQuakes}
            error={quakeError}
            filter={filter}
            setFilter={setFilter}
            calculateDistance={calculateDistance}
          />
        )}
        {activeTab === 'map' && user && (
          <MapTab 
            earthquakes={earthquakes} 
            userLocation={userLocation} 
            loading={loadingQuakes}
            error={quakeError}
          />
        )}
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
                <a href="https://www.phivolcs.dost.gov.ph" target="_blank" rel="noopener noreferrer">PHIVOLCS</a>
                <a href="https://ndrrmc.gov.ph" target="_blank" rel="noopener noreferrer">NDRRMC</a>
                <a href="https://redcross.org.ph" target="_blank" rel="noopener noreferrer">Red Cross</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} University of Science and Technology of Southern Philippines</p>
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

// Enhanced AlertsTab Component with Real-time Data
function AlertsTab({ earthquakes, userLocation, loading, error, filter, setFilter, calculateDistance }) {
  return (
    <section className="alerts-tab">
      <div className="alert-header">
        <h2>Recent Earthquakes</h2>
        <div className="alert-filter">
          <span>Filter by:</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Alerts</option>
            <option value="red">Red Alerts</option>
            <option value="yellow">Yellow Alerts</option>
            <option value="green">Green Alerts</option>
          </select>
        </div>
      </div>
      
      <div className="earthquake-list">
        {loading ? (
          <div className="loading">Loading earthquake data...</div>
        ) : error ? (
          <div className="error">Error loading data: {error}</div>
        ) : earthquakes.length === 0 ? (
          <div className="no-quakes">No earthquakes found for the selected filter</div>
        ) : (
          earthquakes.map(quake => (
            <div key={quake.id} className={`quake-card ${quake.alert}`}>
              <div className="quake-magnitude">
                <span>{quake.magnitude.toFixed(1)}</span>
                <small>Magnitude</small>
              </div>
              <div className="quake-details">
                <h3>{quake.location}</h3>
                <p>Depth: {quake.depth} • {quake.time}</p>
                {userLocation && (
                  <p className="distance">
                    Approx. {calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      quake.coordinates.latitude,
                      quake.coordinates.longitude
                    )}km from you
                  </p>
                )}
              </div>
              <div className={`alert-level ${quake.alert}`}>
                {quake.alert.toUpperCase()} ALERT
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// Enhanced MapTab Component with Real-time Data
function MapTab({ earthquakes, userLocation, loading, error }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedQuake, setSelectedQuake] = useState(null);
  const infoWindowRef = useRef(null);
  const isUserInteractingRef = useRef(false);
  const lastUserInteractionRef = useRef(Date.now());

  // Initialize Google Maps services
  const directionsService = useMemo(() => new window.google.maps.DirectionsService(), []);
  const directionsRenderer = useMemo(() => new window.google.maps.DirectionsRenderer({
    suppressMarkers: true,
    preserveViewport: true
  }), []);

  // Color coding function
  const getColorForAlert = useCallback((alert) => {
    switch(alert) {
      case 'red': return '#e74c3c';
      case 'yellow': return '#f39c12';
      case 'green': return '#2ecc71';
      default: return '#3498db';
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!window.google || !mapRef.current || loading || error) return;

    const googleMap = new window.google.maps.Map(mapRef.current, {
      center: userLocation 
        ? { lat: userLocation.latitude, lng: userLocation.longitude } 
        : { lat: 12.8797, lng: 121.7740 }, // Philippines center
      zoom: 6,
      minZoom: 4,
      maxZoom: 18,
      gestureHandling: 'greedy',
      disableDefaultUI: false,
      zoomControl: true,
      fullscreenControl: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "on" }]
        },
        {
          featureType: "administrative.country",
          elementType: "geometry",
          stylers: [{ visibility: "on" }, { weight: 1.5 }]
        }
      ]
    });

    // Track user interaction
    const interactionEvents = ['mousedown', 'touchstart', 'dragstart', 'zoom_changed'];
    interactionEvents.forEach(event => {
      googleMap.addListener(event, () => {
        isUserInteractingRef.current = true;
        lastUserInteractionRef.current = Date.now();
      });
    });

    // Reset interaction flag after 1 second of inactivity
    googleMap.addListener('idle', () => {
      setTimeout(() => {
        if (Date.now() - lastUserInteractionRef.current > 1000) {
          isUserInteractingRef.current = false;
        }
      }, 1000);
    });

    directionsRenderer.setMap(googleMap);
    setMap(googleMap);

    return () => {
      directionsRenderer.setMap(null);
      if (infoWindowRef.current) infoWindowRef.current.close();
    };
  }, [loading, error, userLocation, directionsRenderer]);

  // Update markers
  useEffect(() => {
    if (!map || loading || error) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers = [];

    // Add earthquake markers
    earthquakes.forEach(quake => {
      const marker = new window.google.maps.Marker({
        position: { 
          lat: quake.coordinates.latitude, 
          lng: quake.coordinates.longitude 
        },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: getColorForAlert(quake.alert),
          fillOpacity: 0.8,
          strokeColor: '#fff',
          strokeWeight: 1,
          scale: Math.min(quake.magnitude * 1.5, 10)
        },
        title: quake.location,
        optimized: false
      });

      marker.addListener('click', () => {
        setSelectedQuake(quake);
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        
        infoWindowRef.current = new window.google.maps.InfoWindow({
          content: `
            <div class="quake-info-window">
              <h3>${quake.location}</h3>
              <p><strong>Magnitude:</strong> ${quake.magnitude.toFixed(1)}</p>
              <p><strong>Depth:</strong> ${quake.depth}</p>
              <p><strong>Time:</strong> ${quake.time}</p>
              <button class="get-directions-btn" data-lat="${quake.coordinates.latitude}" data-lng="${quake.coordinates.longitude}">
                Get Directions
              </button>
            </div>
          `,
          maxWidth: 250
        });
        
        infoWindowRef.current.open(map, marker);
        map.panTo(marker.getPosition());
      });

      newMarkers.push(marker);
    });

    // Add user location marker if available
    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#3498db',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: 8
        },
        title: 'Your Location',
        zIndex: 1000
      });
      newMarkers.push(userMarker);
    }

    setMarkers(newMarkers);

    // Only adjust view if not currently interacting and we have markers
    if (!isUserInteractingRef.current && (earthquakes.length > 0 || userLocation)) {
      const bounds = new window.google.maps.LatLngBounds();
      
      if (userLocation) {
        bounds.extend(new window.google.maps.LatLng(
          userLocation.latitude, 
          userLocation.longitude
        ));
      }
      
      earthquakes.forEach(quake => {
        bounds.extend(new window.google.maps.LatLng(
          quake.coordinates.latitude, 
          quake.coordinates.longitude
        ));
      });

      if (!bounds.isEmpty()) {
        // Use a gentle approach to adjusting the view
        if (map.getZoom() < 5) {
          map.fitBounds(bounds, {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          });
        } else {
          // If already zoomed in, just pan to center
          const center = bounds.getCenter();
          map.panTo(center);
        }
      }
    }
  }, [map, earthquakes, userLocation, loading, error, getColorForAlert, markers]);

  // Directions handler
  const handleGetDirections = useCallback((destination) => {
    if (!userLocation || !map || !directionsService || !directionsRenderer) return;

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [userLocation, map, directionsService, directionsRenderer]);

  // Handle clicks on direction buttons in info windows
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.classList.contains('get-directions-btn')) {
        const lat = parseFloat(e.target.dataset.lat);
        const lng = parseFloat(e.target.dataset.lng);
        handleGetDirections({ lat, lng });
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleGetDirections]);

  if (loading) return <div className="loading">Loading map data...</div>;
  if (error) return <div className="error">Error loading map: {error}</div>;

  return (
    <section className="map-tab">
      <h2>Earthquake Map</h2>
      <div className="map-controls">
        <button 
          className="map-btn" 
          onClick={() => {
            if (!map) return;
            const center = userLocation 
              ? { lat: userLocation.latitude, lng: userLocation.longitude } 
              : { lat: 12.8797, lng: 121.7740 };
            map.setCenter(center);
            map.setZoom(userLocation ? 10 : 6);
          }}
        >
          Reset View
        </button>
        <button 
          className="map-btn"
          onClick={() => {
            if (directionsRenderer) {
              directionsRenderer.setMap(null);
              directionsRenderer.setDirections(null);
            }
            if (infoWindowRef.current) {
              infoWindowRef.current.close();
            }
          }}
        >
          Clear Directions
        </button>
      </div>
      <div className="map-container">
        <div className="map" ref={mapRef}></div>
        <div className="map-legend">
        </div>
      </div>
      
      {selectedQuake && (
        <div className="quake-details-panel">
          <h3>{selectedQuake.location}</h3>
          <p>Magnitude: {selectedQuake.magnitude.toFixed(1)}</p>
          <p>Depth: {selectedQuake.depth}</p>
          <p>Time: {selectedQuake.time}</p>
          <button 
            className="directions-btn"
            onClick={() => handleGetDirections({
              lat: selectedQuake.coordinates.latitude,
              lng: selectedQuake.coordinates.longitude
            })}
          >
            Get Directions
          </button>
        </div>
      )}
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
  // State for active tab and voiceover status
  const [activeGuide, setActiveGuide] = useState('before');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for speech synthesis objects
  const speechSynth = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  // Voiceover content for each tab
  const voiceoverContent = {
    before: `Before an Earthquake: 
      1. Secure your home by anchoring heavy furniture to walls and installing cabinet latches.
      2. Know your utilities - learn how to turn off gas, water, and electricity.
      3. Prepare an emergency kit including food, water, first aid, flashlight, and batteries.
      4. Plan evacuation routes and identify safe spots in each room and meeting points.`,
    
    during: `During an Earthquake:
      Remember the three steps: Drop, Cover, and Hold On.
      1. DROP down to your hands and knees.
      2. COVER by taking shelter under sturdy furniture.
      3. HOLD ON until the shaking stops.`,
    
    after: `After an Earthquake:
      Immediately after: Check for injuries, expect aftershocks, and put on sturdy shoes.
      First few hours: Check for damage and hazards, listen to emergency broadcasts, and use text messages to communicate.
      In the coming days: Follow official instructions, help neighbors if safe, and document damage for insurance.`
  };

  /**
   * Toggles voiceover playback
   */
  const toggleVoiceover = () => {
    if (isPlaying) {
      stopVoiceover();
    } else {
      startVoiceover();
    }
  };

  /**
   * Starts the voiceover for the current tab
   */
  const startVoiceover = () => {
    stopVoiceover(); // Stop any ongoing speech before starting new one
    
    // Create new speech utterance
    const utterance = new SpeechSynthesisUtterance(voiceoverContent[activeGuide]);
    utterance.rate = 0.8; // Slightly slower than normal
    utterance.pitch = 1; // Normal pitch
    utterance.volume = 1; // Full volume
    
    // Store utterance in ref for later control
    utteranceRef.current = utterance;
    
    // Speak the utterance
    speechSynth.current.speak(utterance);
    setIsPlaying(true);
    
    // Handle when speech ends
    utterance.onend = () => {
      setIsPlaying(false);
    };
  };

  /**
   * Stops the current voiceover
   */
  const stopVoiceover = () => {
    if (speechSynth.current.speaking) {
      speechSynth.current.cancel();
    }
    setIsPlaying(false);
  };

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      stopVoiceover();
    };
  }, []);

  // Stop voiceover when tab changes
  useEffect(() => {
    stopVoiceover();
  }, [activeGuide]);

  return (
    <section className="preparedness-tab">
      <div className="tab-header">
        <h2>Earthquake Preparedness</h2>
        <button 
          onClick={toggleVoiceover}
          className={`voiceover-button ${isPlaying ? 'active' : ''}`}
          aria-label={isPlaying ? 'Stop voiceover' : 'Start voiceover'}
        >
          {isPlaying ? '🔊 Stop Voiceover' : '🔈 Play Voiceover'}
        </button>
      </div>
      
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