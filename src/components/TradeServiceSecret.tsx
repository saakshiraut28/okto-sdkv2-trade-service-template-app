import React, { useState } from "react";
import { useTradeService } from "../context/TradeServiceContext";

function TradeServiceSecret() {
    const { secret, environment, setSecret, setEnvironment } = useTradeService();
    const [userInput, setUserInput] = useState("");

    const handleSave = () => {
        if (userInput.trim()) {
            setSecret(userInput.trim());
            setUserInput("");
        }
    };

    return (
        <div className="bg-gray-800 text-white p-2 rounded-sm shadow-md my-4 border border-gray-700 w-full">
            <h2 className="text-md font-semibold mb-4 text-white">
                Enter your Trade Service API Secret Key to use the app.
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <input
                    type="text"
                    value={userInput}
                    placeholder="<okto_trade_service_secret>"
                    onChange={(e) => setUserInput(e.target.value)}
                    className="flex-1 p-2 text-sm border border-gray-700 rounded-lg bg-gray-900 text-white"
                />
                <button
                    onClick={handleSave}
                    disabled={!userInput.trim()}
                    className={`px-5 py-2 text-sm font-medium transition rounded-full ${userInput.trim()
                        ? "bg-indigo-600 hover:bg-indigo-500"
                        : "bg-gray-600 cursor-not-allowed"
                        }`}
                >
                    Save Secret
                </button>
                <button
                    onClick={() => {
                        setSecret("");
                        setUserInput("");
                        localStorage.removeItem("TRADE_SERVICE_SECRET");
                        localStorage.removeItem("TRADE_SERVICE_ENVIRONMENT");
                    }}
                    className="px-5 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 transition rounded-full"
                >
                    Reset
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
                {secret ? (
                    <span className="text-green-400 font-bold">Trade Service Secret key is set and ready to use.</span>
                ) : (
                        <span className="text-red-400">No secret key set. Please enter your secret key to use the app.</span>
                )}
            </p>
        </div>
    );
}

export default TradeServiceSecret;
