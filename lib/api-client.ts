/**
 * API Client - Centralized HTTP client for making authenticated API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: any;
}

/**
 * Get authorization token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const user = localStorage.getItem('khatachain_user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.walletAddress || null;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  
  return null;
}

/**
 * Main API client function
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add authorization header if token exists
  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }
  
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;
  
  console.log('API Request:', { method: options.method || 'GET', url, body: options.body })
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  let data;
  if (isJson) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text };
  }
  
  console.log('API Response:', { status: response.status, ok: response.ok, data })
  
  if (!response.ok) {
    const error: ApiError = {
      error: data.error || data.message || `HTTP ${response.status}`,
      details: data,
    };
    throw error;
  }
  
  return data;
}

/**
 * GET request
 */
export async function get<T = any>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function post<T = any>(
  endpoint: string,
  body?: any
): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T = any>(
  endpoint: string,
  body?: any
): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request
 */
export async function patch<T = any>(
  endpoint: string,
  body?: any
): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T = any>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'DELETE' });
}

/**
 * Auth API endpoints
 */
export const authApi = {
  check: (walletAddress: string) =>
    post('/api/auth/check', { walletAddress }),
    
  login: (walletAddress: string, userType: string, name?: string, email?: string) =>
    post('/api/auth/login', { walletAddress, userType, name, email }),
  
  getCurrentUser: () =>
    get('/api/auth/me'),
};

/**
 * Borrower API endpoints
 */
export const borrowerApi = {
  getProfile: () =>
    get('/api/borrower/profile'),
  
  updateProfile: (data: any) =>
    put('/api/borrower/profile', data),
  
  getStats: () =>
    get('/api/borrower/stats'),
  
  getCredits: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return get(`/api/borrower/credits${params}`);
  },
};

/**
 * Store Owner API endpoints
 */
export const storeOwnerApi = {
  getProfile: () =>
    get('/api/store-owner/profile'),
  
  updateProfile: (data: any) =>
    put('/api/store-owner/profile', data),
  
  getStats: () =>
    get('/api/store-owner/stats'),
  
  getCredits: (params?: { recent?: boolean; status?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.recent) queryParams.set('recent', 'true');
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return get(`/api/store-owner/credits${queryString ? `?${queryString}` : ''}`);
  },
};

/**
 * Credit API endpoints
 */
export const creditApi = {
  create: (data: {
    borrowerPubkey: string;
    creditAmount: number;
    dueDate: string;
    description?: string;
    currency?: string;
  }) =>
    post('/api/credits/create', data),
  
  getById: (id: string) =>
    get(`/api/credits/${id}`),
  
  getPending: () =>
    get('/api/borrower/credits?status=pending_approval'),
  
  approve: (id: string) =>
    post(`/api/credits/${id}/approve`, {}),
  
  reject: (id: string, reason?: string) =>
    post(`/api/credits/${id}/reject`, { reason }),
  
  updateStatus: (id: string, status: string) =>
    patch(`/api/credits/${id}/status`, { status }),
};

/**
 * Search API endpoints
 */
export const searchApi = {
  borrowers: (query: string) =>
    get(`/api/search/borrowers?q=${encodeURIComponent(query)}`),
};

/**
 * Citizenship API endpoints
 */
export const citizenshipApi = {
  check: (citizenshipNumber: string) =>
    post('/api/citizenship/check', { citizenship_number: citizenshipNumber }),
  
  register: (citizenshipNumber: string) =>
    post('/api/citizenship/register', { citizenship_number: citizenshipNumber }),
};

/**
 * Reputation API endpoints
 */
export const reputationApi = {
  /** Public – used by store owners. Returns score, tier, warning. */
  getPublic: (borrowerPubkey: string) =>
    get(`/api/reputation/${borrowerPubkey}`),

  /** Authenticated – full reputation with events + projected scores. */
  getMy: () =>
    get('/api/borrower/reputation'),
};

/**
 * Stripe API endpoints
 */
export const stripeApi = {
  createPaymentIntent: (creditId: string, amount: number) =>
    post('/api/stripe/payment/intent', { credit_id: creditId, amount }),
  
  createConnectOnboarding: () =>
    post('/api/stripe/connect/onboard'),
};
