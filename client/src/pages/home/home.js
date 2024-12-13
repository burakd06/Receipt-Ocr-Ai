import React from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
const Home = () => {
  const navigate = useNavigate(); 

  const handleGiderFisiClick = () => {
    navigate("/giderfisi");
  };

  const handleZraporClick = () => {
    navigate("/zrapor");
  };

  return (
    <div className="home-container">
      <h1>Fatura Taratma</h1>
      <div className="button-container">
        <button onClick={handleGiderFisiClick}>Gider Fişi</button>
        <button onClick={handleZraporClick}>Z Raporu</button>
      </div>
    </div>
  );
};

export default Home;
