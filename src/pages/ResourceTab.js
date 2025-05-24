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