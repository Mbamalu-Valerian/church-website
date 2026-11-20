import { apiBaseUrl, json, request } from './api';

export type NewsletterStatus = 'Draft' | 'Ready' | 'Sending' | 'Sent';

export type NewsletterOverview = {
  mailConfigured: boolean;
  fromAddress: string;
  dailyLimit: number;
  activeSubscribers: number;
  totalSubscribers: number;
  nextAutomaticSend: string;
  readyIssue: { id: number; label: string } | null;
  sending: boolean;
};

export type NewsletterIssueSummary = {
  id: number;
  label: string;
  subject: string;
  intro: string;
  status: NewsletterStatus;
  recipientsTotal: number;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type NewsletterItem = {
  id: number;
  position: number;
  headline: string;
  body: string;
  linkUrl: string;
  linkLabel: string;
  hasImage: boolean;
  imageUrl: string;
};

export type NewsletterIssue = NewsletterIssueSummary & { items: NewsletterItem[] };

export type NewsletterSubscriber = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  phone: string;
  status: 'Active' | 'Unsubscribed';
  source: string;
  createdAt: string;
  unsubscribedAt: string | null;
};

export type NewsletterSubscriberPage = { items: NewsletterSubscriber[]; total: number; limit: number; offset: number };

export type SubscribeInput = { name: string; email: string; whatsapp: string; phone: string; consent: boolean; website?: string };

export const newsletterPublicApi = {
  subscribe: (input: SubscribeInput) => request<{ subscribed: boolean }>('/public/newsletter/subscribe', json('POST', input)),
};

export const newsletterAdminApi = {
  overview: () => request<NewsletterOverview>('/newsletter/overview'),
  listIssues: () => request<NewsletterIssueSummary[]>('/newsletter/issues'),
  createIssue: (label: string) => request<NewsletterIssueSummary>('/newsletter/issues', json('POST', { label })),
  getIssue: (id: number) => request<NewsletterIssue>(`/newsletter/issues/${id}`),
  updateIssue: (id: number, input: { label: string; subject: string; intro: string }) => request<NewsletterIssueSummary>(`/newsletter/issues/${id}`, json('PUT', input)),
  setStatus: (id: number, status: 'Draft' | 'Ready') => request<NewsletterIssueSummary>(`/newsletter/issues/${id}/status`, json('PUT', { status })),
  deleteIssue: (id: number) => request<null>(`/newsletter/issues/${id}`, json('DELETE')),
  addItem: (issueId: number) => request<NewsletterItem>(`/newsletter/issues/${issueId}/items`, json('POST', {})),
  updateItem: (id: number, input: { headline: string; body: string; linkUrl: string; linkLabel: string }) => request<NewsletterItem>(`/newsletter/items/${id}`, json('PUT', input)),
  setItemImage: (id: number, imageData: string) => request<NewsletterItem>(`/newsletter/items/${id}/image`, json('PUT', { imageData })),
  removeItemImage: (id: number) => request<NewsletterItem>(`/newsletter/items/${id}/image`, json('DELETE')),
  moveItem: (id: number, direction: 'up' | 'down') => request<NewsletterItem[]>(`/newsletter/items/${id}/move`, json('POST', { direction })),
  deleteItem: (id: number) => request<null>(`/newsletter/items/${id}`, json('DELETE')),
  preview: (id: number) => request<{ subject: string; html: string }>(`/newsletter/issues/${id}/preview`),
  sendTest: (id: number, email: string) => request<{ sentTo: string }>(`/newsletter/issues/${id}/test`, json('POST', { email })),
  sendNow: (id: number) => request<{ recipients: number }>(`/newsletter/issues/${id}/send`, json('POST', {})),
  listSubscribers: (params: { q: string; status: string; limit: number; offset: number }) => {
    const query = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
    if (params.q) query.set('q', params.q);
    if (params.status) query.set('status', params.status);
    return request<NewsletterSubscriberPage>(`/newsletter/subscribers?${query.toString()}`);
  },
  addSubscriber: (input: { name: string; email: string; whatsapp: string; phone: string }) => request<NewsletterSubscriber>('/newsletter/subscribers', json('POST', input)),
  updateSubscriber: (id: number, input: { name: string; email: string; whatsapp: string; phone: string; status: 'Active' | 'Unsubscribed' }) => request<NewsletterSubscriber>(`/newsletter/subscribers/${id}`, json('PUT', input)),
  deleteSubscriber: (id: number) => request<null>(`/newsletter/subscribers/${id}`, json('DELETE')),
  csvUrl: `${apiBaseUrl}/api/newsletter/subscribers.csv`,
};
