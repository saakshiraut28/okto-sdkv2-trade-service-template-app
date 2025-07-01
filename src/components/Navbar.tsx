import React from "react";
import okto from "../assets/okto.png"; 
import { FileCheck2, Github } from "lucide-react";

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
        <div className="flex">
          <a className="underline hover:text-indigo-400 mx-2" href="https://github.com/okto-hq/okto-sdkv2-trade-service-template-app" target="_blank" title="Link to Github Repository"><Github className="w-10 h-10 p-2 rounded-full bg-gray-800 hover:bg-gray-300" /></a>
          <a className="underline hover:text-indigo-400 mx-2" href="https://docs.okto.tech/docs/trade-service/overview" target="_blank" title="Link to Okto Trade Service Docs"><FileCheck2 className="w-10 h-10 p-2 rounded-full bg-gray-800 hover:bg-gray-300" /></a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;