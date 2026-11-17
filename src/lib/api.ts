export type Status = 'Draft' | 'Published';

export type Announcement = { id: number; title: string; description: string; date: string; status: Status };

export type ParishArticle = {
  id: number;
  slug: string;
  title: string;
  authorName: string;
  excerpt: string;
  body: string;
  imageData?: string;
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
  albumId: number | null;
  fileId: string;
  caption: string;
  status: Status;
  thumbnailUrl: string;
  viewerUrl: string;
  isFeatured: boolean;
  uploadedAt: string;
};

export type GalleryAlbum = {
  id: number;
  title: string;
  slug: string;
  date: string;
  description: string;
  coverImage: GalleryImage | null;
  isFeatured: boolean;
  createdAt: string;
  photoCount: number;
};

export type GalleryAlbumDetail = GalleryAlbum & { photos: GalleryImage[] };
export type PastoralImageKey = string;
export type PastoralImages = Partial<Record<string, string>>;
export type PastoralTeamMember = {
  id: string;
  name: string;
  title: string;
  image: string;
  specialization?: string;
  contact?: string;
  phoneHref?: string;
};
export type PastoralTeam = {
  hierarchy: PastoralTeamMember[];
  parishClergy: PastoralTeamMember[];
  catechists: PastoralTeamMember[];
};
export type ParishCommittee = {
  id: string;
  name: string;
  category: 'liturgical' | 'non-liturgical';
  meeting: string;
  description: string;
  choirList?: string[];
};
export type CommunityGroupKey = 'organizations' | 'societies' | 'knighthood' | 'states';
export type CommunityItem = {
  id: string;
  name: string;
  meeting?: string;
  time?: string;
  states?: string;
  subtitle?: string;
  thanksgiving?: string;
  details?: {
    formalName?: string;
    audience?: string;
    members?: string;
    leadership?: string;
    meetingPlace?: string;
    patronSaintDay?: string;
    slogan?: string;
    mantra?: string;
    mission?: string;
    whatWeDo?: string;
  };
};
export type ParishCommunities = Record<CommunityGroupKey, CommunityItem[]>;

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
  galleryAlbums: () => request<GalleryAlbum[]>('/public/gallery/albums'),
  galleryAlbum: (slug: string) => request<GalleryAlbumDetail>(`/public/gallery/albums/${encodeURIComponent(slug)}`),
  pastoralTeam: () => request<PastoralTeam>('/public/pastoral-team'),
  committees: () => request<ParishCommittee[] | null>('/public/committees'),
  communities: () => request<ParishCommunities | null>('/public/communities'),
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
  async listPastoralImages(): Promise<PastoralImages> {
    return request('/pastoral-images');
  },
  async listPastoralTeam(): Promise<PastoralTeam> {
    return request('/pastoral-team');
  },
  async updatePastoralTeam(team: PastoralTeam): Promise<PastoralTeam> {
    const metadata = (members: PastoralTeamMember[]) => members.map(({ id, name, title, specialization, contact }) => ({
      id,
      name,
      title,
      ...(specialization ? { specialization } : {}),
      ...(contact ? { contact } : {}),
    }));
    return request('/pastoral-team', json('PUT', {
      hierarchy: metadata(team.hierarchy),
      parishClergy: metadata(team.parishClergy),
      catechists: metadata(team.catechists),
    }));
  },
  async listCommittees(): Promise<ParishCommittee[] | null> {
    return request('/committees');
  },
  async updateCommittees(items: ParishCommittee[]): Promise<ParishCommittee[]> {
    return request('/committees', json('PUT', items));
  },
  async listCommunities(): Promise<ParishCommunities | null> {
    return request('/communities');
  },
  async updateCommunities(groups: ParishCommunities): Promise<ParishCommunities> {
    return request('/communities', json('PUT', groups));
  },
  async updatePastoralImage(key: PastoralImageKey, imageData: string | null): Promise<PastoralImages> {
    return request(`/pastoral-images/${encodeURIComponent(key)}`, json('PUT', { imageData }));
  },
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
  async listGalleryAlbums(): Promise<GalleryAlbum[]> {
    return request('/gallery/albums');
  },
  async createGalleryAlbum(input: { title: string; date: string; description: string }): Promise<GalleryAlbum> {
    return request('/gallery/albums', json('POST', input));
  },
  async updateGalleryAlbum(id: number, input: { title: string; date: string; description: string; coverImageId?: number | null }): Promise<GalleryAlbum> {
    return request(`/gallery/albums/${id}`, json('PUT', input));
  },
  async featureGalleryAlbum(id: number): Promise<void> {
    await request(`/gallery/albums/${id}/feature`, json('PUT'));
  },
  async unfeatureGalleryAlbum(id: number): Promise<void> {
    await request(`/gallery/albums/${id}/unfeature`, json('PUT'));
  },
  async deleteGalleryAlbum(id: number): Promise<void> {
    await request(`/gallery/albums/${id}`, json('DELETE'));
  },
  async moveGalleryImage(id: number, albumId: number): Promise<GalleryImage> {
    return request(`/gallery/${id}/album`, json('PUT', { albumId }));
  },
  async createGalleryImage(input: { caption: string; imageData: string; albumId?: number }): Promise<GalleryImage> {
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
