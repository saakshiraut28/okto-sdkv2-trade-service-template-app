import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { getOrderDetails } from "../api/tradeServiceClient";

interface OrderStatusPollingProps {
  orderId: string | undefined;
  fromChain: string;
  environment: string;
  isVisible: boolean;
}

interface OrderStatus {
  status?: string;
  swapper?: string;
  fillDeadline?: string;
  orderData?: {
    platform?: string;
    platformFeeBps?: string;
    orderType?: string;
    swapperInputs?: {
      token?: string;
      amount?: string;
    };
    swapperOutputs?: {
      token?: string;
      amount?: string;
      recipient?: string;
      chainId?: string;
    };
  };
  feeCharged?: boolean;
  outputAmount?: string;
  steps?: {
    type?: string;
    metadata?: {
      serviceType?: string;
      transactionType?: string;
      protocol?: string;
      aggregatorName?: string;
    };
    chainId?: string;
    txnData?: {} | null;
    intentCalldata?: {} | null;
  }[];
  permitDataToSign?: string;
  routeExpiry?: string | null;
}

const OrderStatusPolling: React.FC<OrderStatusPollingProps> = ({
  orderId,
  fromChain,
  environment,
  isVisible,
}) => {
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrderStatus = async () => {
    if (!orderId || !fromChain) {
      return;
    }

    try {
      setIsLoading(true);
      const orderDetailsPayload = {
        orderId,
        caipId: fromChain,
      };

      const response = await getOrderDetails(environment, orderDetailsPayload);
      setOrderStatus(response);
      setLastUpdated(new Date());

      console.log("Order status updated:", response);
    } catch (error) {
      console.error("Failed to fetch order status:", error);
      toast.error("Failed to fetch order status");
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    if (!orderId || !fromChain) {
      toast.error("No order ID available for polling");
      return;
    }

    setIsPolling(true);
    // Initial fetch
    fetchOrderStatus();

    // Set up polling interval (every 10 seconds)
    pollingIntervalRef.current = setInterval(() => {
      fetchOrderStatus();
    }, 10000);

    toast.info("Order status polling started");
  };

  const stopPolling = () => {
    setIsPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    toast.info("Order status polling stopped");
  };

  const handleManualRefresh = () => {
    fetchOrderStatus();
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Auto-start polling when orderId becomes available and component is visible
  useEffect(() => {
    if (isVisible && orderId && !isPolling) {
      startPolling();
    }
  }, [orderId, isVisible]);

  if (!isVisible || !orderId) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "text-yellow-400";
      case "completed":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      case "cancelled":
        return "text-gray-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Order Status</h3>
        <div className="flex gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          {isPolling ? (
            <button
              onClick={stopPolling}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition"
            >
              Stop Polling
            </button>
          ) : (
            <button
              onClick={startPolling}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded transition"
            >
              Start Polling
            </button>
          )}
        </div>
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
            {orderStatus.status && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Status:</span>
                <span className={`font-semibold ${getStatusColor(orderStatus.status)}`}>
                  {orderStatus.status}
                </span>
              </div>
            )}

            {orderStatus.orderData?.platform && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Platform:</span>
                <span className="text-gray-200">{orderStatus.orderData.platform}</span>
              </div>
            )}

            {orderStatus.orderData?.orderType && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Order Type:</span>
                <span className="text-gray-200">{orderStatus.orderData.orderType}</span>
              </div>
            )}

            {orderStatus.fillDeadline && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Fill Deadline:</span>
                <span className="text-gray-200">
                  {new Date(orderStatus.fillDeadline).toLocaleString()}
                </span>
              </div>
            )}

            {orderStatus.outputAmount && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Output Amount:</span>
                <span className="text-gray-200">{orderStatus.outputAmount}</span>
              </div>
            )}

            {orderStatus.feeCharged !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Fee Charged:</span>
                <span className="text-gray-200">{orderStatus.feeCharged ? "Yes" : "No"}</span>
              </div>
            )}

            {orderStatus.swapper && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Swapper:</span>
                <span className="text-sm font-mono text-gray-200 break-all">
                  {orderStatus.swapper}
                </span>
              </div>
            )}

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
                <h4 className="text-sm font-semibold text-gray-200 mb-2">Steps ({orderStatus.steps.length})</h4>
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
                          {step.metadata.transactionType && ` (${step.metadata.transactionType})`}
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

        {isPolling && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            Polling for updates...
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatusPolling;
