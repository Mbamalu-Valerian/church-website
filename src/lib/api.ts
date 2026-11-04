export type Status = 'Draft' | 'Published';

export type Announcement = { id: number; title: string; description: string; date: string; status: Status };

export type ParishArticle = {
  id: number;
  slug: string;
  title: string;
  authorName: string;
  excerpt: string;
  body: string;
  publishDate: string;
  status: Status;
};

export type FeastDay = {
  id: number;
  date: string;
  title: string;
  description: string;
  category: string;
  color: string;
  status: Status;
};

export type GalleryImage = {
  id: number;
  fileId: string;
  caption: string;
  status: Status;
  thumbnailUrl: string;
  viewerUrl: string;
  isFeatured: boolean;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Cannot reach the Dominus API. Start the server with "npm run server" and try again.', 0);
  }

  if (response.status === 413) {
    throw new ApiError('The request exceeds the server or hosting request-size limit. Check the hosting provider’s configured limit and try again.', 413);
  }

  const body = await response.text();
  let result: ApiResponse<T>;
  try {
    result = JSON.parse(body) as ApiResponse<T>;
  } catch {
    const detail = response.status >= 500
      ? `The Dominus API did not respond correctly (HTTP ${response.status}). In local development, start or restart the API with "npm run server" and check its terminal for errors.`
      : response.status
        ? `The Dominus API returned an invalid response (HTTP ${response.status}). Check that the API server is running on port 3001.`
      : 'The Dominus API returned an empty response. Check that the API server is running on port 3001.';
    throw new ApiError(detail, response.status);
  }
  if (!response.ok || !result.ok) {
    throw new ApiError(result.ok ? 'The request could not be completed.' : result.error, response.status);
  }
  return result.data;
}

const json = (method: string, value?: unknown): RequestInit => ({
  method,
  ...(value === undefined ? {} : { body: JSON.stringify(value) }),
});

export const publicApi = {
  announcements: () => request<Announcement[]>('/public/announcements'),
  articles: () => request<ParishArticle[]>('/public/articles'),
  feastDays: () => request<FeastDay[]>('/public/feast-days'),
  gallery: () => request<GalleryImage[]>('/public/gallery'),
};

export const authApi = {
  async isAdmin(): Promise<boolean> {
    try {
      await request<{ authenticated: boolean }>('/session');
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return false;
      throw error;
    }
  },
  async signIn(username: string, password: string): Promise<void> {
    await request<{ authenticated: boolean }>('/login', json('POST', { username: username.trim(), password }));
  },
  async signOut(): Promise<void> {
    await request('/logout', json('POST'));
  },
};

export const adminApi = {
  async listAnnouncements(): Promise<Announcement[]> {
    return request('/announcements');
  },
  async createAnnouncement(input: { title: string; description: string; date: string }): Promise<Announcement> {
    return request('/announcements', json('POST', input));
  },
  async publishAnnouncement(id: number): Promise<void> {
    await request(`/announcements/${id}/publish`, json('PUT'));
  },
  async publishAllAnnouncements(): Promise<void> {
    await request('/announcements/publish-all', json('PUT'));
  },
  async deleteAnnouncement(id: number): Promise<void> {
    await request(`/announcements/${id}`, json('DELETE'));
  },

  async listArticles(): Promise<ParishArticle[]> {
    return request('/articles');
  },
  async createArticle(input: Omit<ParishArticle, 'id' | 'slug' | 'status'>): Promise<ParishArticle> {
    return request('/articles', json('POST', input));
  },
  async updateArticle(id: number, input: Omit<ParishArticle, 'id' | 'slug' | 'status'>): Promise<ParishArticle> {
    return request(`/articles/${id}`, json('PUT', input));
  },
  async publishArticle(id: number): Promise<ParishArticle> {
    return request(`/articles/${id}/publish`, json('PUT'));
  },
  async deleteArticle(id: number): Promise<void> {
    await request(`/articles/${id}`, json('DELETE'));
  },

  async listFeastDays(): Promise<FeastDay[]> {
    return request('/feast-days');
  },
  async createFeastDay(input: Omit<FeastDay, 'id' | 'status'>): Promise<FeastDay> {
    return request('/feast-days', json('POST', input));
  },
  async publishFeastDay(id: number): Promise<void> {
    await request(`/feast-days/${id}/publish`, json('PUT'));
  },
  async publishAllFeastDays(): Promise<void> {
    await request('/feast-days/publish-all', json('PUT'));
  },
  async deleteFeastDay(id: number): Promise<void> {
    await request(`/feast-days/${id}`, json('DELETE'));
  },

  async listGalleryImages(): Promise<GalleryImage[]> {
    return request('/gallery');
  },
  async createGalleryImage(input: { caption: string; imageData: string }): Promise<GalleryImage> {
    return request('/gallery', json('POST', input));
  },
  async publishGalleryImage(id: number): Promise<void> {
    await request(`/gallery/${id}/publish`, json('PUT'));
  },
  async unpublishGalleryImage(id: number): Promise<void> {
    await request(`/gallery/${id}/unpublish`, json('PUT'));
  },
  async featureGalleryImage(id: number): Promise<void> {
    await request(`/gallery/${id}/feature`, json('PUT'));
  },
  async deleteGalleryImage(id: number): Promise<void> {
    await request(`/gallery/${id}`, json('DELETE'));
  },
};
