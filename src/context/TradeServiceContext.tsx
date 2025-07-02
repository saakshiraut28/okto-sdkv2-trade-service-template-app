import React, { createContext, useContext, useState, useEffect } from "react";

type TradeServiceContextType = {
  secret: string;
  environment: string;
  setSecret: (value: string) => void;
  setEnvironment: (value: string) => void;
};

const DEFAULT_ENV = "sandbox";

const TradeServiceContext = createContext<TradeServiceContextType | undefined>(undefined);

export const TradeServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [secret, setSecretState] = useState("");
  const [environment, setEnvironmentState] = useState(DEFAULT_ENV);

  useEffect(() => {
    const savedSecret = localStorage.getItem("TRADE_SERVICE_SECRET");
    const savedEnv = localStorage.getItem("TRADE_SERVICE_ENV");

    if (savedSecret) {
      setSecretState(savedSecret);
    }
    if (savedEnv) {
      setEnvironmentState(savedEnv);
    }
  }, []);

  const setSecret = (value: string) => {
    localStorage.setItem("TRADE_SERVICE_SECRET", value);
    setSecretState(value);
  };

  const setEnvironment = (env: string) => {
    localStorage.setItem("TRADE_SERVICE_ENV", env);
    setEnvironmentState(env);
  };

  return (
    <TradeServiceContext.Provider value={{ secret, environment, setSecret, setEnvironment }}>
      {children}
    </TradeServiceContext.Provider>
  );
};

export const useTradeService = () => {
  const context = useContext(TradeServiceContext);
  if (!context) throw new Error("useTradeService must be used within TradeServiceProvider");
  return context;
};
