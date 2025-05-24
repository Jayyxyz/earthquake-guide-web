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