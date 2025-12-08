import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./images/metalogo.png";

const App: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100%",
        padding: "0 20px",
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
      }}
    >
      <img
        src={logo}
        alt="DMETA logo"
        style={{
          width: "40%",
          maxWidth: "180px",
          minWidth: "120px",
          marginBottom: "1rem",
        }}
      />
    </div>
  );
};

export default App;
