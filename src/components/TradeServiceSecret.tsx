import React, { useState } from "react";
import { useTradeService } from "../context/TradeServiceContext";

function TradeServiceSecret() {
    const { secret, environment, setSecret, setEnvironment } = useTradeService();
    const [userInput, setUserInput] = useState("");
    const isCustomSecretSet = secret !== import.meta.env.VITE_TRADE_SERVICE_SANDBOX_API_KEY;

    const handleSave = () => {
        if (userInput.trim()) {
            setSecret(userInput.trim());
        } else {
            localStorage.removeItem("TRADE_SERVICE_SECRET");
            setSecret(import.meta.env.VITE_TRADE_SERVICE_SANDBOX_API_KEY);
        }
        setUserInput("");
    };

    return (
        <div className="bg-gray-800 text-white p-2 rounded-sm shadow-md my-4 border border-gray-700 w-full">
            <h2 className="text-md font-semibold mb-4 text-white">Enter your API secret key, or use default.</h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <input
                    type="password"
                    value={userInput}
                    placeholder="<okto_trade_service_secret>"
                    onChange={(e) => setUserInput(e.target.value)}
                    className="flex-1 p-2 text-sm border border-gray-700 rounded-lg bg-gray-900 text-white"
                />
                <button
                    onClick={handleSave}
                    className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg text-sm font-medium transition"
                >
                    {userInput.trim() ? "Save Secret" : "Use Default"}
                </button>
            </div>

            <div className="flex mb-6 gap-2">
                <label className="block text-md font-medium mb-2">Environment: </label>
                <div className="flex flex-col sm:flex-row gap-4">
                    {["sandbox", "production"].map((env) => (
                        <label key={env} className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="environment"
                                value={env}
                                checked={environment === env}
                                onChange={() => setEnvironment(env)}
                                className="form-radio text-indigo-600 text-md"
                            />
                            <span className="capitalize">{env}</span>
                        </label>
                    ))}
                </div>
            </div>

            <p className="text-sm text-gray-400">
                <span className="font-medium text-white">Current Secret:</span>{" "}
                {isCustomSecretSet ? (
                    <span className="text-blue-400">Your Trade Service secret will be used.</span>
                ) : (
                        <span className="text-blue-400">No Trade Service secret provided. Using the default secret.</span>
                )}
            </p>
        </div>
    );
}

export default TradeServiceSecret;
