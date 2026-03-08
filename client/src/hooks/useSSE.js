import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Custom hook for Server-Sent Events with auto-reconnect
 * 
 * @param {string} url - The SSE endpoint URL
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to connect (default: true)
 * @param {number} options.maxRetries - Maximum retry attempts (default: Infinity)
 * @param {number} options.initialDelay - Initial retry delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum retry delay in ms (default: 30000)
 * @returns {Object} { data, connected, error, reconnecting }
 */
export const useSSE = (url, options = {}) => {
  const {
    enabled = true,
    maxRetries = Infinity,
    initialDelay = 1000,
    maxDelay = 30000,
  } = options;

  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState(null);

  const eventSourceRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const calculateBackoff = useCallback(() => {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      initialDelay * Math.pow(2, retryCountRef.current),
      maxDelay
    );
    const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
    return exponentialDelay + jitter;
  }, [initialDelay, maxDelay]);

  const connect = useCallback(() => {
    if (!enabled || !url || !isMountedRef.current) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource(url);

      es.onopen = () => {
        if (!isMountedRef.current) return;
        setConnected(true);
        setReconnecting(false);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on successful connection
      };

      es.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          setError(null);
        } catch (err) {
          console.error('SSE: Failed to parse message:', err);
          setError('Failed to parse server data');
        }
      };

      es.onerror = () => {
        if (!isMountedRef.current) return;
        setConnected(false);
        es.close();

        // Attempt to reconnect if within retry limits
        if (retryCountRef.current < maxRetries) {
          setReconnecting(true);
          const delay = calculateBackoff();
          retryCountRef.current += 1;

          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          setError('Failed to connect after maximum retries');
          setReconnecting(false);
        }
      };

      eventSourceRef.current = es;
    } catch (err) {
      console.error('SSE: Failed to create EventSource:', err);
      setError('Failed to establish connection');
      setConnected(false);
    }
  }, [enabled, url, maxRetries, calculateBackoff]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return {
    data,
    connected,
    reconnecting,
    error,
  };
};
