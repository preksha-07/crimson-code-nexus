const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export class ApiRequestError extends Error {
  status?: number;
  details?: unknown;

  constructor(
    message: string,
    status?: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

/*
 * Local NEXUS application database.
 *
 * Some pages in the project use getDb() and updateDb()
 * for local/demo data. These functions are kept here so
 * those pages can work even when no backend is running.
 */

export interface NexusDatabase {
  currentUser: {
    name: string;
    role: string;
    token: string;
  } | null;

  [key: string]: unknown;
}

const DEFAULT_DB: NexusDatabase = {
  currentUser: null,
};

const DB_KEY = 'nexus_database';

function readLocalDb(): NexusDatabase {
  try {
    const stored = localStorage.getItem(DB_KEY);

    if (!stored) {
      return { ...DEFAULT_DB };
    }

    const parsed = JSON.parse(stored);

    if (
      parsed &&
      typeof parsed === 'object'
    ) {
      return {
        ...DEFAULT_DB,
        ...parsed,
      };
    }

    return { ...DEFAULT_DB };
  } catch {
    return { ...DEFAULT_DB };
  }
}

/**
 * Get the local NEXUS database.
 */
export function getDb(): NexusDatabase {
  return readLocalDb();
}

/**
 * Update the local NEXUS database.
 */
export function updateDb(
  updater: (db: NexusDatabase) => void
): NexusDatabase {
  const db = readLocalDb();

  updater(db);

  try {
    localStorage.setItem(
      DB_KEY,
      JSON.stringify(db)
    );
  } catch {
    // Ignore localStorage errors.
  }

  window.dispatchEvent(
    new Event('nexus_db_updated')
  );

  return db;
}

/**
 * Clear the local NEXUS database.
 */
export function clearDb(): void {
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    // Ignore localStorage errors.
  }

  window.dispatchEvent(
    new Event('nexus_db_updated')
  );
}

/*
 * Generic API request helper.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const csrfToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('nexus_csrf='))
    ?.split('=')
    .slice(1)
    .join('=');
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken
          ? { 'X-CSRF-Token': csrfToken }
          : {}),
          ...options.headers,
      },
      }
    );

    let data: unknown = null;

    const contentType =
      response.headers.get('content-type');

    if (
      contentType?.includes(
        'application/json'
      )
    ) {
      data = await response.json();
    } else {
      const text = await response.text();

      if (text) {
        data = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : `Request failed with status ${response.status}`;

      throw new ApiRequestError(
        message,
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (
      error instanceof ApiRequestError
    ) {
      throw error;
    }

    throw new ApiRequestError(
      'Unable to connect to the NEXUS backend.'
    );
  }
}

/*
 * API client.
 */
export const apiClient = {
  get<T>(
    endpoint: string
  ): Promise<T> {
    return request<T>(
      endpoint,
      {
        method: 'GET',
      }
    );
  },

  post<T>(
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    return request<T>(
      endpoint,
      {
        method: 'POST',
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      }
    );
  },

  put<T>(
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    return request<T>(
      endpoint,
      {
        method: 'PUT',
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      }
    );
  },

  patch<T>(
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    return request<T>(
      endpoint,
      {
        method: 'PATCH',
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      }
    );
  },

  delete<T>(
    endpoint: string
  ): Promise<T> {
    return request<T>(
      endpoint,
      {
        method: 'DELETE',
      }
    );
  },
};
