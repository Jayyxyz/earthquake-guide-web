import { Link } from "react-router-dom";
import "./styles/home.css"; 

export default function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">Tentative Earthquake</h1>
        <p className="home-text">
          Get essential earthquake safety tips and real-time alerts to stay prepared before, during, and after a quake.
        </p>
      </div>

      <div className="home-updates">
        <h2 className="home-updates-title">Recent Earthquake Updates</h2>
        <p className="home-updates-text">Live earthquake updates coming soon...</p>
      </div>
    </div>
  );
}
