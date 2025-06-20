import React from "react";
import okto from "../assets/okto.png"; 

const Navbar = () => {
  return (
    <nav className="bg-gray-700 text-white p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold">
          <img src={okto} className="w-10 h-10" />
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold flex items-center gap-3">
          Okto Trade Service API Demo
        </div>
      </div>
    </nav>
  );
};

export default Navbar;