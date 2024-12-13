import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GiderFisi from "./pages/giderfisi/giderfisi";
import Zrapor from "./pages/zraporu/zraporu";
import Home from "./pages/home/home"; 

const App = () => {
  return (
    <div className="app-container">
     
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/giderfisi" element={<GiderFisi />} />
        <Route path="/zrapor" element={<Zrapor />} />
      </Routes>
    </div>
  );
};


const AppWithRouter = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default AppWithRouter;
