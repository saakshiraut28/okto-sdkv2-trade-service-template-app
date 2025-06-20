import React, { useState, useEffect } from "react";

const DEFAULT_SECRET = "your-default-secret"; // Replace with real default

function TradeServiceSecret() {
    const [tradeServiceSecret, setTradeServiceSecret] = useState<string>(DEFAULT_SECRET);
    const [userInput, setUserInput] = useState<string>("");
    const [isCustomSecretSet, setIsCustomSecretSet] = useState<boolean>(false);

    // On mount, check localStorage
    useEffect(() => {
        const saved = localStorage.getItem("TRADE_SERVICE_SECRET");
        if (saved) {
            setTradeServiceSecret(saved);
            setIsCustomSecretSet(true);
        }
    }, []);

    const handleSave = () => {
        if (userInput.trim()) {
            localStorage.setItem("TRADE_SERVICE_SECRET", userInput.trim());
            setTradeServiceSecret(userInput.trim());
            setIsCustomSecretSet(true);
        } else {
            localStorage.removeItem("TRADE_SERVICE_SECRET");
            setTradeServiceSecret(DEFAULT_SECRET);
            setIsCustomSecretSet(false);
        }
        setUserInput("");
    };

    return (
        <div className="bg-[#1e1e1e] text-white p-1 rounded-xl max-w-md mx-auto mt-2 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Trade Service API Secret</h2>

            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="w-full p-2 m-1 text-sm border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            />

            <button
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-blue-500 px-4 py-2 rounded text-white w-fit transition"
            >
                {userInput.trim() ? "Save Secret" : "Use Default"}
            </button>

            <div className="mt-4 text-sm text-gray-400">
                <strong>Current Secret:</strong>{" "}
                {isCustomSecretSet ? "Custom (from user)" : "Default"}
            </div>
        </div>
    );
}

export default TradeServiceSecret;
