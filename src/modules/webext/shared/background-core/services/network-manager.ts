/**
 * Network manager for handling network-related operations
 */
import { Logger } from '../utils/logger';

// Fetch request options interface
interface FetchOptions {
  method?: string;
  headers?: Record<string, string> | [string, string][] | Headers;
  body?: string | FormData | Blob | ArrayBuffer | URLSearchParams;
  mode?: 'cors' | 'no-cors' | 'same-origin';
  credentials?: 'omit' | 'same-origin' | 'include';
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
  redirect?: 'follow' | 'error' | 'manual';
}

export class NetworkManager {
  private logger = new Logger();

  isNetworkConnectionError(error: Error): boolean {
    // Check for common network error patterns
    const networkErrors = [
      'NetworkError',
      'NETWORK_ERROR',
      'ERR_NETWORK_CHANGED',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_NAME_NOT_RESOLVED',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_TIMED_OUT',
      'Failed to fetch',
      'Network request failed'
    ];

    const errorMessage = error.message || error.toString();
    return networkErrors.some((pattern) => errorMessage.includes(pattern) || error.name?.includes(pattern));
  }

  async checkNetworkConnection(): Promise<boolean> {
    try {
      // Simple network check - try to fetch a small resource
      const response = await fetch('data:text/plain,ping', {
        method: 'GET',
        mode: 'no-cors'
      });
      return true;
    } catch (error) {
      this.logger.warn('Network connection check failed:', error);
      return false;
    }
  }

  async makeRequest(url: string, options: FetchOptions = {}): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      this.logger.error('Network request failed:', error);
      throw error;
    }
  }

  async makeJsonRequest<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await this.makeRequest(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response.json();
  }

  async postJson<T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
    return this.makeJsonRequest<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async putJson<T = any>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
    return this.makeJsonRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteRequest<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    return this.makeJsonRequest<T>(url, {
      ...options,
      method: 'DELETE'
    });
  }
}
