// src/components/OrderStatusPolling.tsx

import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { toast } from "react-toastify";
import { getOrderDetails } from "../api/tradeServiceClient";

export interface OrderStatusPollingHandle {
  manualRefresh: () => Promise<OrderStatus | null>;
  startPolling: () => void;
}

interface OrderStatusPollingProps {
  orderId: string | undefined;
  fromChain: string;
  environment: string;
  isVisible: boolean;
}

interface OrderStatus {
  status?: string;
  routeExpiry?: string | null;
  steps?: {
    type?: string;
    metadata?: {
      serviceType?: string;
      transactionType?: string;
    };
  }[];
}

const OrderStatusPolling = forwardRef<OrderStatusPollingHandle, OrderStatusPollingProps>(
  ({ orderId, fromChain, environment, isVisible }, ref) => {
    const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchOrderStatus = async () => {
      if (!orderId || !fromChain) return null;
      try {
        setIsLoading(true);
        const response = await getOrderDetails(environment, {
          orderId,
          caipId: fromChain,
        });
        setOrderStatus(response);
        setLastUpdated(new Date());

        console.log("Order status updated:", response);

        if (response?.status?.toString() === "2" || response?.status?.toString() === "4" || response?.status?.toString() === "-1") {
          stopPolling();
          toast.success("Order reached a terminal state.");
        }
        return response;
      } catch (error) {
        console.error("Failed to fetch order status:", error);
        toast.error("Failed to fetch order status.");
        return null;
      } finally {
        setIsLoading(false);
      }
    };

    const startPolling = () => {
      if (!orderId || !fromChain) {
        toast.error("No order ID available for polling.");
        return;
      }
      if (pollingIntervalRef.current) return; 

      fetchOrderStatus();
      pollingIntervalRef.current = setInterval(fetchOrderStatus, 10000);
      toast.info("Order status polling started.");
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        toast.info("Order status polling stopped.");
      }
    };

    useImperativeHandle(ref, () => ({
      manualRefresh: fetchOrderStatus,
      startPolling,
    }));

    useEffect(() => {
      return () => stopPolling(); 
    }, []);

    if (!isVisible || !orderId) {
      return null;
    }

    const getDisplayStatus = (status?: string) => {
      switch (status) {
        case "-1":
          return "Expired (Terminal)";
        case "0":
          return "Order received by the backend but not yet registered on-chain.";
        case "1":
          return "Order registered on-chain but not yet filled.";
        case "2":
          return "Order settled successfully. Terminal state.";
        case "3":
          return "Order in dispute. The order was filled but not yet settled.";
        case "4":
          return "Order Refunded (Terminal)";
        default:
          return "Unknown";
      }
    };

    const getStatusColor = (status?: string) => {
      switch (status) {
        case "-1":
          return "text-red-400";
        case "0":
          return "text-yellow-400";
        case "1":
          return "text-blue-400";
        case "2":
          return "text-green-400";
        case "3":
          return "text-orange-400";
        case "4":
          return "text-purple-400";
        default:
          return "text-gray-400";
      }
    };

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Order Status</h3>
          <button
            onClick={fetchOrderStatus}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Order ID:</span>
            <span className="text-sm font-mono text-gray-200 break-all">
              {orderId}
            </span>
          </div>

          {orderStatus && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Order Status:</span>
                <span
                  className={`font-semibold ${getStatusColor(orderStatus.status)}`}
                >
                  {getDisplayStatus(orderStatus.status)}
                </span>
              </div>

              {orderStatus.routeExpiry && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Route Expiry:</span>
                  <span className="text-gray-200">
                    {new Date(orderStatus.routeExpiry).toLocaleString()}
                  </span>
                </div>
              )}

              {orderStatus.steps && orderStatus.steps.length > 0 && (
                <div className="mt-3 p-3 bg-gray-700 rounded border border-gray-600">
                  <h4 className="text-sm font-semibold text-gray-200 mb-2">
                    Steps ({orderStatus.steps.length})
                  </h4>
                  <div className="space-y-2">
                    {orderStatus.steps.map((step, index) => (
                      <div key={index} className="text-xs text-gray-300">
                        <div className="flex justify-between">
                          <span>Step {index + 1}:</span>
                          <span className="text-blue-400">{step.type}</span>
                        </div>
                        {step.metadata?.serviceType && (
                          <div className="text-gray-400 ml-2">
                            Service: {step.metadata.serviceType}
                            {step.metadata.transactionType &&
                              ` (${step.metadata.transactionType})`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {lastUpdated && (
            <div className="text-xs text-gray-400 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {pollingIntervalRef.current && (
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Polling for updates...
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default OrderStatusPolling;
