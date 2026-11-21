import React, { useState, useEffect } from 'react';
import { authApi, adminApi } from './lib/api';
import NewsletterAdmin from './Newsletter';
import type { Announcement, ParishArticle, FeastDay, GalleryAlbum, GalleryImage, PastoralImageKey, PastoralImages, PastoralTeam, PastoralTeamMember, ParishCommittee, CommunityGroupKey, CommunityItem, ParishCommunities, VaultItem, VaultPage } from './lib/api';
import { feastColorOptions, feastColorLabels, ParishArticleMarkdown, compressGalleryImage, defaultCommittees, defaultCommunities, pastoralTeamDefaults } from './App';

const DominusDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [articles, setArticles] = useState<ParishArticle[]>([]);
  const [vaultPage, setVaultPage] = useState<VaultPage>({ items: [], total: 0, limit: 50, offset: 0 });
  const [vaultError, setVaultError] = useState('');
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultPublicationFolder, setVaultPublicationFolder] = useState('Publications');
  const [vaultPublicationBusy, setVaultPublicationBusy] = useState(false);
  const [vaultPublicationMessage, setVaultPublicationMessage] = useState('');
  const [vaultPublicationError, setVaultPublicationError] = useState('');
  const [dashboardTheme, setDashboardTheme] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem('dominus-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [vaultOffset, setVaultOffset] = useState(0);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState(new Date().toISOString().slice(0, 10));
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPopupKind, setDraftPopupKind] = useState<'announcement' | 'advert' | 'reflection'>('announcement');
  const [draftPopupEnabled, setDraftPopupEnabled] = useState(false);
  const [draftPopupImageData, setDraftPopupImageData] = useState('');
  const [draftPopupLink, setDraftPopupLink] = useState('');
  const [draftPopupStartAt, setDraftPopupStartAt] = useState('');
  const [draftPopupEndAt, setDraftPopupEndAt] = useState('');
  const getTodayInAbuja = () => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const [articleTitle, setArticleTitle] = useState('');
  const [articleAuthorName, setArticleAuthorName] = useState('');
  const [articleExcerpt, setArticleExcerpt] = useState('');
  const [articleBody, setArticleBody] = useState('');
  const [articleImageData, setArticleImageData] = useState('');
  const [articlePublishDate, setArticlePublishDate] = useState(getTodayInAbuja);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [articleError, setArticleError] = useState('');
  const [articleMessage, setArticleMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [feastDays, setFeastDays] = useState<FeastDay[]>([]);
  const [feastTitle, setFeastTitle] = useState('');
  const [feastDate, setFeastDate] = useState(getTodayInAbuja());
  const [feastDescription, setFeastDescription] = useState('');
  const [feastCategory, setFeastCategory] = useState('Memorial');
  const [feastColor, setFeastColor] = useState('#16a34a');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryAlbums, setGalleryAlbums] = useState<GalleryAlbum[]>([]);
  const [gallerySelectedAlbumId, setGallerySelectedAlbumId] = useState<number | null>(null);
  const [galleryOpenAlbumId, setGalleryOpenAlbumId] = useState<number | null>(null);
  const [galleryNewAlbumTitle, setGalleryNewAlbumTitle] = useState('');
  const [galleryNewAlbumDate, setGalleryNewAlbumDate] = useState('');
  const [galleryNewAlbumDescription, setGalleryNewAlbumDescription] = useState('');
  const [galleryAlbumSearch, setGalleryAlbumSearch] = useState('');
  const [galleryAlbumDateFilter, setGalleryAlbumDateFilter] = useState('');
  const [galleryAlbumEditId, setGalleryAlbumEditId] = useState<number | null>(null);
  const [galleryAlbumEditTitle, setGalleryAlbumEditTitle] = useState('');
  const [galleryAlbumEditDate, setGalleryAlbumEditDate] = useState('');
  const [galleryAlbumEditDescription, setGalleryAlbumEditDescription] = useState('');
  const [galleryError, setGalleryError] = useState('');
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryMessage, setGalleryMessage] = useState('');
  const [galleryDeleteAllOpen, setGalleryDeleteAllOpen] = useState(false);
  const [galleryDeleteAllConfirmation, setGalleryDeleteAllConfirmation] = useState('');
  const [galleryDeletingAll, setGalleryDeletingAll] = useState(false);
  const [pastoralImages, setPastoralImages] = useState<PastoralImages>({});
  const [pastoralTeam, setPastoralTeam] = useState<PastoralTeam>(pastoralTeamDefaults);
  const [pastoralTeamDirty, setPastoralTeamDirty] = useState(false);
  const [pastoralTeamSaving, setPastoralTeamSaving] = useState(false);
  const [pastoralImageError, setPastoralImageError] = useState('');
  const [pastoralImageMessage, setPastoralImageMessage] = useState('');
  const [savingPastoralImage, setSavingPastoralImage] = useState<PastoralImageKey | null>(null);
  const [committees, setCommittees] = useState<ParishCommittee[]>(defaultCommittees);
  const [communities, setCommunities] = useState<ParishCommunities>(defaultCommunities);
  const [communityEditGroup, setCommunityEditGroup] = useState<CommunityGroupKey>('organizations');
  const [committeeContentDirty, setCommitteeContentDirty] = useState(false);
  const [communityContentDirty, setCommunityContentDirty] = useState(false);
  const [committeeContentSaving, setCommitteeContentSaving] = useState(false);
  const [communityContentSaving, setCommunityContentSaving] = useState(false);
  const [committeeContentError, setCommitteeContentError] = useState('');
  const [committeeContentMessage, setCommitteeContentMessage] = useState('');

  const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

  const fetchAnnouncements = async () => {
    try {
      setAnnouncements(await adminApi.listAnnouncements());
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to load announcements.'));
    }
  };

  const fetchArticles = async () => {
    try {
      setArticles(await adminApi.listArticles());
    } catch {
      setArticleError('Unable to load articles. Refresh and try again.');
    }
  };

  const fetchFeastDays = async () => {
    try {
      setFeastDays(await adminApi.listFeastDays());
    } catch {
      setFeastDays([]);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      setGalleryImages(await adminApi.listGalleryImages());
    } catch {
      setGalleryError('Unable to load gallery images. Refresh and try again.');
    }
  };

  const fetchGalleryAlbums = async () => {
    try {
      const albums = await adminApi.listGalleryAlbums();
      setGalleryAlbums(albums);
      setGallerySelectedAlbumId((current) => current && albums.some((album) => album.id === current)
        ? current
        : albums.find((album) => album.slug === 'general-gallery')?.id ?? albums[0]?.id ?? null);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to load gallery albums. Refresh and try again.'));
    }
  };

  const fetchVault = async (offset = vaultOffset) => {
    setVaultLoading(true);
    try {
      setVaultPage(await adminApi.listVault(50, offset));
      setVaultOffset(offset);
      setVaultError('');
    } catch (error) {
      setVaultError(errorMessage(error, 'Unable to load the Vault.'));
    } finally {
      setVaultLoading(false);
    }
  };

  const fetchPastoralContent = async () => {
    try {
      const [images, team] = await Promise.all([
        adminApi.listPastoralImages(),
        adminApi.listPastoralTeam(),
      ]);
      setPastoralImages(images);
      setPastoralTeam(team);
      setPastoralTeamDirty(false);
      setPastoralImageError('');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to load the pastoral team. Refresh and try again.'));
    }
  };

  const fetchParishContent = async () => {
    try {
      const [savedCommittees, savedCommunities] = await Promise.all([
        adminApi.listCommittees(),
        adminApi.listCommunities(),
      ]);
      if (savedCommittees) setCommittees(savedCommittees);
      if (savedCommunities) setCommunities(savedCommunities);
      setCommitteeContentError('');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to load committees and communities. Refresh and try again.'));
    }
  };

  useEffect(() => {
    authApi.isAdmin()
      .then(setIsAuthenticated)
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchAnnouncements();
    void fetchArticles();
    void fetchFeastDays();
    void fetchGalleryImages();
    void fetchGalleryAlbums();
    void fetchVault(0);
    void fetchPastoralContent();
    void fetchParishContent();
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      window.localStorage.setItem('dominus-theme', dashboardTheme);
    } catch (error) {
      console.warn('Unable to save the Dominus theme preference.', error);
    }
  }, [dashboardTheme]);

  const [activeSection, setActiveSection] = useState('dominus-overview');

  useEffect(() => {
    const sectionIds = [
      'dominus-overview',
      'dominus-newsletter',
      'dominus-vault',
      'dominus-pastoral-team',
      'dominus-committees',
      'dominus-communities',
      'dominus-announcements',
      'dominus-gallery',
      'dominus-feast-days',
      'dominus-articles',
    ];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (let i = sectionIds.length - 1; i >= 0; i -= 1) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const updateCommittee = (id: string, changes: Partial<ParishCommittee>) => {
    setCommittees((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
    setCommitteeContentDirty(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
  };

  const addCommittee = () => {
    setCommittees((current) => [...current, {
      id: `committee-${crypto.randomUUID()}`,
      name: '',
      category: 'liturgical',
      meeting: '',
      description: '',
    }]);
    setCommitteeContentDirty(true);
  };

  const removeCommittee = (id: string) => {
    if (!window.confirm('Remove this committee from the website?')) return;
    setCommittees((current) => current.filter((item) => item.id !== id));
    setCommitteeContentDirty(true);
  };

  const saveCommittees = async () => {
    setCommitteeContentSaving(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
    try {
      const saved = await adminApi.updateCommittees(committees);
      setCommittees(saved);
      setCommitteeContentDirty(false);
      setCommitteeContentMessage('Parish committees saved.');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to save parish committees.'));
    } finally {
      setCommitteeContentSaving(false);
    }
  };

  const discardParishContentChanges = async () => {
    setCommitteeContentError('');
    try {
      const [savedCommittees, savedCommunities] = await Promise.all([
        adminApi.listCommittees(),
        adminApi.listCommunities(),
      ]);
      setCommittees(savedCommittees || defaultCommittees);
      setCommunities(savedCommunities || defaultCommunities);
      setCommitteeContentDirty(false);
      setCommunityContentDirty(false);
      setCommitteeContentMessage('');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to reload saved parish information.'));
    }
  };

  const updateCommunity = (id: string, changes: Partial<CommunityItem>) => {
    setCommunities((current) => ({
      ...current,
      [communityEditGroup]: current[communityEditGroup].map((item) => item.id === id ? { ...item, ...changes } : item),
    }));
    setCommunityContentDirty(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
  };

  const updateCommunityDetails = (id: string, field: keyof NonNullable<CommunityItem['details']>, value: string) => {
    const item = communities[communityEditGroup].find((entry) => entry.id === id);
    if (!item) return;
    updateCommunity(id, { details: { ...item.details, [field]: value } });
  };

  const addCommunity = () => {
    setCommunities((current) => ({
      ...current,
      [communityEditGroup]: [...current[communityEditGroup], {
        id: `community-${crypto.randomUUID()}`,
        name: '',
        details: communityEditGroup === 'states' ? { audience: '', whatWeDo: '' } : undefined,
      }],
    }));
    setCommunityContentDirty(true);
  };

  const removeCommunity = (id: string) => {
    if (!window.confirm('Remove this item from the community section?')) return;
    setCommunities((current) => ({
      ...current,
      [communityEditGroup]: current[communityEditGroup].filter((item) => item.id !== id),
    }));
    setCommunityContentDirty(true);
  };

  const saveCommunities = async () => {
    setCommunityContentSaving(true);
    setCommitteeContentError('');
    setCommitteeContentMessage('');
    try {
      const saved = await adminApi.updateCommunities(communities);
      setCommunities(saved);
      setCommunityContentDirty(false);
      setCommitteeContentMessage('Parish communities saved.');
    } catch (error) {
      setCommitteeContentError(errorMessage(error, 'Unable to save parish communities.'));
    } finally {
      setCommunityContentSaving(false);
    }
  };

  const updatePastoralTeamMember = (id: string, changes: Partial<PastoralTeamMember>) => {
    setPastoralTeam((current) => ({
      hierarchy: current.hierarchy.map((member) => member.id === id ? { ...member, ...changes } : member),
      parishClergy: current.parishClergy.map((member) => member.id === id ? { ...member, ...changes } : member),
      catechists: current.catechists.map((member) => member.id === id ? { ...member, ...changes } : member),
    }));
    setPastoralTeamDirty(true);
    setPastoralImageError('');
    setPastoralImageMessage('');
  };

  const addPastoralTeamMember = (group: keyof PastoralTeam) => {
    const member: PastoralTeamMember = {
      id: `team-${crypto.randomUUID()}`,
      name: '',
      title: '',
      image: '',
      ...(group === 'parishClergy' ? { contact: '' } : group === 'hierarchy' ? { specialization: '' } : {}),
    };
    setPastoralTeam((current) => ({ ...current, [group]: [...current[group], member] }));
    setPastoralTeamDirty(true);
  };

  const removePastoralTeamMember = (group: keyof PastoralTeam, id: string) => {
    if (!window.confirm('Remove this member from the Pastoral Team section?')) return;
    setPastoralTeam((current) => ({ ...current, [group]: current[group].filter((member) => member.id !== id) }));
    setPastoralTeamDirty(true);
    setPastoralImageMessage('');
  };

  const movePastoralTeamMember = (group: keyof PastoralTeam, id: string, destination: keyof PastoralTeam) => {
    if (group === destination) return;
    const member = pastoralTeam[group].find((item) => item.id === id);
    if (!member) return;
    setPastoralTeam((current) => ({
      ...current,
      [group]: current[group].filter((item) => item.id !== id),
      [destination]: [...current[destination], member],
    }));
    setPastoralTeamDirty(true);
  };

  const reorderPastoralTeamMember = (group: keyof PastoralTeam, index: number, offset: -1 | 1) => {
    setPastoralTeam((current) => {
      const members = [...current[group]];
      const target = index + offset;
      if (target < 0 || target >= members.length) return current;
      [members[index], members[target]] = [members[target], members[index]];
      return { ...current, [group]: members };
    });
    setPastoralTeamDirty(true);
  };

  const savePastoralTeam = async () => {
    setPastoralTeamSaving(true);
    setPastoralImageError('');
    setPastoralImageMessage('');
    try {
      const saved = await adminApi.updatePastoralTeam(pastoralTeam);
      setPastoralTeam(saved);
      setPastoralTeamDirty(false);
      setPastoralImageMessage('Pastoral Team details saved to the website.');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to save the Pastoral Team details.'));
    } finally {
      setPastoralTeamSaving(false);
    }
  };

  const discardPastoralTeamChanges = async () => {
    setPastoralImageError('');
    try {
      setPastoralTeam(await adminApi.listPastoralTeam());
      setPastoralTeamDirty(false);
      setPastoralImageMessage('');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to reload the saved pastoral team.'));
    }
  };

  const handlePastoralImageUpload = async (key: PastoralImageKey, file: File | undefined) => {
    if (!file) return;
    setPastoralImageError('');
    setPastoralImageMessage('');
    if (
      !(['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        || /\.(jpe?g|png|webp)$/i.test(file.name))
    ) {
      setPastoralImageError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPastoralImageError('The selected photo is larger than 10 MB. Choose a smaller image.');
      return;
    }
    setSavingPastoralImage(key);
    try {
      const imageData = await compressGalleryImage(file);
      setPastoralImages(await adminApi.updatePastoralImage(key, imageData));
      setPastoralImageMessage('Pastoral team photo updated on the website.');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to update this pastoral team photo.'));
    } finally {
      setSavingPastoralImage(null);
    }
  };

  const handleResetPastoralImage = async (key: PastoralImageKey) => {
    setPastoralImageError('');
    setPastoralImageMessage('');
    setSavingPastoralImage(key);
    try {
      setPastoralImages(await adminApi.updatePastoralImage(key, null));
      setPastoralImageMessage('Original pastoral team photo restored.');
    } catch (error) {
      setPastoralImageError(errorMessage(error, 'Unable to restore the original pastoral team photo.'));
    } finally {
      setSavingPastoralImage(null);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await authApi.signIn(loginData.username, loginData.password);
      setIsAuthenticated(true);
      setLoginError('');
      setLoginData({ username: '', password: '' });
    } catch (error) {
      setLoginError(errorMessage(error, 'Invalid login. Use the private Dominus credentials.'));
    }
  };

  const handleAddAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftTitle.trim() || !draftDescription.trim()) {
      return;
    }

    try {
      const popupDateToUtc = (value: string) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) throw new Error('Enter a valid popup schedule.');
        return date.toISOString();
      };
      const created = await adminApi.createAnnouncement({
        title: draftTitle.trim(),
        description: draftDescription.trim(),
        date: draftDate || new Date().toISOString().slice(0, 10),
        popupKind: draftPopupKind,
        popupEnabled: draftPopupEnabled,
        popupImageData: draftPopupImageData,
        popupLink: draftPopupLink.trim(),
        popupStartAt: popupDateToUtc(draftPopupStartAt),
        popupEndAt: popupDateToUtc(draftPopupEndAt),
      });
      setAnnouncements((current) => [created, ...current]);
      setDraftTitle('');
      setDraftDescription('');
      setDraftDate(new Date().toISOString().slice(0, 10));
      setDraftPopupKind('announcement');
      setDraftPopupEnabled(false);
      setDraftPopupImageData('');
      setDraftPopupLink('');
      setDraftPopupStartAt('');
      setDraftPopupEndAt('');
      await fetchVault(0);
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to save announcement'));
    }
  };

  const handlePublishAnnouncement = async (id: number) => {
    try {
      await adminApi.publishAnnouncement(id);
      setAnnouncements((current) => current.map((item) => item.id === id ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish announcement'));
    }
  };

  const handlePublishAllDrafts = async () => {
    try {
      await adminApi.publishAllAnnouncements();
      setAnnouncements((current) => current.map((item) => item.status === 'Draft' ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish drafts'));
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await adminApi.deleteAnnouncement(id);
      setAnnouncements((current) => current.filter((item) => item.id !== id));
      await fetchVault(0);
      await fetchVault(0);
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to delete announcement'));
    }
  };

  const handleAddFeastDay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!feastTitle.trim() || !feastDate) return;

    try {
      const created = await adminApi.createFeastDay({
        title: feastTitle.trim(),
        description: feastDescription.trim(),
        category: feastCategory,
        date: feastDate,
        color: feastColor,
      });
      setFeastDays((current) => [created, ...current]);
      setFeastTitle('');
      setFeastDescription('');
      setFeastDate(getTodayInAbuja());
      setFeastCategory('Memorial');
      setFeastColor('#16a34a');
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to save feast day'));
    }
  };

  const handlePublishFeastDay = async (id: number) => {
    try {
      await adminApi.publishFeastDay(id);
      setFeastDays((current) => current.map((item) => item.id === id ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish feast day'));
    }
  };

  const handlePublishAllFeastDrafts = async () => {
    try {
      await adminApi.publishAllFeastDays();
      setFeastDays((current) => current.map((item) => item.status === 'Draft' ? { ...item, status: 'Published' } : item));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to publish feast drafts'));
    }
  };

  const handleDeleteFeastDay = async (id: number) => {
    try {
      await adminApi.deleteFeastDay(id);
      setFeastDays((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to delete feast day'));
    }
  };

  const handleGalleryFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (files.length === 0) return;
    const firstRelativePath = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
    const isFolderUpload = Boolean(firstRelativePath);
    if (!isFolderUpload && gallerySelectedAlbumId === null) {
      setGalleryError('Create or select an album before uploading photos.');
      return;
    }
    setGalleryError('');
    setGalleryMessage('');
    setGallerySaving(true);
    const mediaFiles = files.filter((file) => (
      ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
      || /\.(jpe?g|png|webp|mp4|webm|mov)$/i.test(file.name)
    ));
    const failures: string[] = [];
    let uploaded = 0;
    for (const [index, file] of mediaFiles.entries()) {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const pathParts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
      const albumTitle = isFolderUpload
        ? pathParts[0]
        : galleryAlbums.find((album) => album.id === gallerySelectedAlbumId)?.title || '';
      const folderPath = isFolderUpload ? pathParts.slice(1, -1).join('/') : '';
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
      const mediaLimit = isVideo ? 500 * 1024 * 1024 : 25 * 1024 * 1024;
      if (file.size > mediaLimit) {
        failures.push(`${file.name} exceeds the ${isVideo ? '500 MB' : '25 MB'} limit`);
        continue;
      }
      try {
        const contentType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');
        const upload = await adminApi.createGalleryUpload({
          filename: file.name,
          contentType,
          fileSize: file.size,
          albumTitle,
          folderPath,
        });
        const response = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: upload.uploadHeaders || { 'Content-Type': contentType },
          body: file,
        });
        if (!response.ok) throw new Error(`Upload to storage failed with HTTP ${response.status}.`);
        const created = await adminApi.completeGalleryUpload(upload.id);
        setGalleryImages((current) => [created, ...current]);
        setGallerySelectedAlbumId(created.albumId);
        setGalleryOpenAlbumId(created.albumId);
        uploaded += 1;
        setGalleryMessage(`Uploading media: ${index + 1} of ${mediaFiles.length} checked.`);
      } catch (error) {
        failures.push(`${file.name}: ${errorMessage(error, 'upload failed')}`);
      }
    }
    setGallerySaving(false);
    if (mediaFiles.length === 0) {
      setGalleryError('The selected folder has no supported JPG, PNG, WebP, MP4, WebM, or MOV media.');
      return;
    }
    setGalleryMessage(`${uploaded} media file${uploaded === 1 ? '' : 's'} saved as drafts.`);
    if (failures.length > 0) setGalleryError(failures.slice(0, 5).join('. '));
    await fetchGalleryAlbums();
    await fetchVault(0);
  };

  const handleCreateGalleryAlbum = async (event: React.FormEvent) => {
    event.preventDefault();
    setGalleryError('');
    setGalleryMessage('');
    try {
      const album = await adminApi.createGalleryAlbum({
        title: galleryNewAlbumTitle,
        date: galleryNewAlbumDate,
        description: galleryNewAlbumDescription,
      });
      setGalleryAlbums((current) => [album, ...current]);
      setGallerySelectedAlbumId(album.id);
      setGalleryOpenAlbumId(album.id);
      setGalleryNewAlbumTitle('');
      setGalleryNewAlbumDate('');
      setGalleryNewAlbumDescription('');
      setGalleryMessage(`${album.title} album created. Select photos to upload into it.`);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to create the gallery album.'));
    }
  };

  const handleStartGalleryAlbumEdit = (album: GalleryAlbum) => {
    setGalleryAlbumEditId(album.id);
    setGalleryAlbumEditTitle(album.title);
    setGalleryAlbumEditDate(album.date);
    setGalleryAlbumEditDescription(album.description);
  };

  const handleSaveGalleryAlbum = async (event: React.FormEvent) => {
    event.preventDefault();
    if (galleryAlbumEditId === null) return;
    setGalleryError('');
    try {
      const updated = await adminApi.updateGalleryAlbum(galleryAlbumEditId, {
        title: galleryAlbumEditTitle,
        date: galleryAlbumEditDate,
        description: galleryAlbumEditDescription,
      });
      setGalleryAlbums((current) => current.map((album) => album.id === updated.id ? updated : album));
      setGalleryAlbumEditId(null);
      setGalleryMessage(`${updated.title} album updated.`);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to update the gallery album.'));
    }
  };

  const handleFeatureGalleryAlbum = async (album: GalleryAlbum) => {
    try {
      if (album.isFeatured) await adminApi.unfeatureGalleryAlbum(album.id);
      else await adminApi.featureGalleryAlbum(album.id);
      setGalleryAlbums((current) => current.map((item) => ({ ...item, isFeatured: !album.isFeatured && item.id === album.id })));
      setGalleryMessage(album.isFeatured ? `${album.title} is no longer featured.` : `${album.title} is now the featured album.`);
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to feature the gallery album.'));
    }
  };

  const handleDeleteGalleryAlbum = async (album: GalleryAlbum) => {
    if (album.slug === 'uncategorized') return;
    if (!window.confirm(`Delete the "${album.title}" album? Its photos will be moved to Uncategorized, not deleted.`)) return;
    try {
      await adminApi.deleteGalleryAlbum(album.id);
      setGalleryAlbums((current) => current.filter((item) => item.id !== album.id));
      if (galleryAlbumEditId === album.id) setGalleryAlbumEditId(null);
      if (galleryOpenAlbumId === album.id) setGalleryOpenAlbumId(null);
      await fetchGalleryImages();
      await fetchGalleryAlbums();
      setGalleryMessage(`Album deleted. Its photos were moved to Uncategorized.`);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to delete the gallery album.'));
    }
  };

  const handleDeleteAllGalleryContent = async () => {
    if (galleryDeleteAllConfirmation !== 'ARCHIVE') return;
    setGalleryDeletingAll(true);
    setGalleryError('');
    setGalleryMessage('');
    try {
      const result = await adminApi.archiveAllGalleryContent();
      const albums = await adminApi.listGalleryAlbums();
      setGalleryImages([]);
      setGalleryAlbums(albums);
      setGallerySelectedAlbumId(null);
      setGalleryOpenAlbumId(null);
      setGalleryAlbumEditId(null);
      setGalleryAlbumSearch('');
      setGalleryAlbumDateFilter('');
      setGalleryDeleteAllConfirmation('');
      setGalleryDeleteAllOpen(false);
      setGalleryMessage(`Archived ${result.photosArchived} media file${result.photosArchived === 1 ? '' : 's'} in the Vault. The public gallery is clear, and items can be restored from the Vault.`);
      await fetchVault(0);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to clear the gallery.'));
    } finally {
      setGalleryDeletingAll(false);
    }
  };

  const handleMoveGalleryImage = async (image: GalleryImage, albumId: number) => {
    try {
      const updated = await adminApi.moveGalleryImage(image.id, albumId);
      setGalleryImages((current) => current.map((item) => item.id === updated.id ? updated : item));
      await fetchGalleryAlbums();
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to move the photo to that album.'));
    }
  };

  const handleSetGalleryAlbumCover = async (image: GalleryImage) => {
    if (image.albumId === null) return;
    const album = galleryAlbums.find((item) => item.id === image.albumId);
    if (!album) return;
    try {
      const updated = await adminApi.updateGalleryAlbum(album.id, {
        title: album.title,
        date: album.date,
        description: album.description,
        coverImageId: image.id,
      });
      setGalleryAlbums((current) => current.map((item) => item.id === updated.id ? updated : item));
      setGalleryMessage(`${image.caption} is now the ${album.title} cover photo.`);
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to set the album cover photo.'));
    }
  };

  const handleGalleryStatus = async (image: GalleryImage) => {
    try {
      if (image.status === 'Published') await adminApi.unpublishGalleryImage(image.id);
      else await adminApi.publishGalleryImage(image.id);
      setGalleryImages((current) => current.map((item) => item.id === image.id
        ? { ...item, status: item.status === 'Published' ? 'Draft' : 'Published', isFeatured: item.status === 'Published' ? false : item.isFeatured }
        : item));
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to update the gallery image.'));
    }
  };

  const handleFeatureGalleryImage = async (image: GalleryImage) => {
    try {
      await adminApi.featureGalleryImage(image.id);
      setGalleryImages((current) => current.map((item) => ({ ...item, isFeatured: item.id === image.id })));
      setGalleryMessage(`${image.caption} is now the featured display photo.`);
      setGalleryError('');
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to feature the gallery image.'));
    }
  };

  const handleDeleteGalleryImage = async (id: number) => {
    try {
      await adminApi.deleteGalleryImage(id);
      setGalleryImages((current) => current.filter((image) => image.id !== id));
      await fetchGalleryAlbums();
      await fetchVault(0);
    } catch (error) {
      setGalleryError(errorMessage(error, 'Unable to delete the gallery image.'));
    }
  };

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArticleTitle('');
    setArticleAuthorName('');
    setArticleExcerpt('');
    setArticleBody('');
    setArticleImageData('');
    setArticlePublishDate(getTodayInAbuja());
  };

  const handleArticleImageUpload = async (file?: File) => {
    if (!file) return;
    setArticleError('');
    try {
      setArticleImageData(await compressGalleryImage(file));
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to prepare the article image.'));
    }
  };

  const handlePopupImageUpload = async (file?: File) => {
    if (!file) return;
    try {
      setDraftPopupImageData(await compressGalleryImage(file));
      setLoginError('');
    } catch (error) {
      setLoginError(errorMessage(error, 'Unable to prepare the popup image.'));
    }
  };

  const handleSaveArticle = async (event: React.FormEvent) => {
    event.preventDefault();
    setArticleError('');
    setArticleMessage('');
    const input = {
      title: articleTitle,
      authorName: articleAuthorName,
      excerpt: articleExcerpt,
      body: articleBody,
      imageData: articleImageData,
      publishDate: articlePublishDate,
    };
    try {
      if (editingArticleId !== null) {
        const updated = await adminApi.updateArticle(editingArticleId, input);
        setArticles((current) => current.map((article) => article.id === updated.id ? updated : article));
      } else {
        const created = await adminApi.createArticle(input);
        setArticles((current) => [created, ...current]);
      }
      resetArticleForm();
      setArticleMessage('Article saved as a draft.');
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to save article draft.'));
    }
  };

  const handleEditArticle = (article: ParishArticle) => {
    setEditingArticleId(article.id);
    setArticleTitle(article.title);
    setArticleAuthorName(article.authorName);
    setArticleExcerpt(article.excerpt);
    setArticleBody(article.body);
    setArticleImageData(article.imageData || '');
    setArticlePublishDate(article.publishDate);
    setArticleError('');
    setArticleMessage('');
  };

  const handlePublishArticle = async (id: number) => {
    setArticleError('');
    setArticleMessage('');
    try {
      const updated = await adminApi.publishArticle(id);
      setArticles((current) => current.map((article) => article.id === id ? updated : article));
      setArticleMessage(updated.publishDate > getTodayInAbuja()
        ? `Article scheduled for ${updated.publishDate}.`
        : 'Article published to the parish blog.');
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to publish article.'));
    }
  };

  const handleDeleteArticle = async (id: number) => {
    const article = articles.find((item) => item.id === id);
    if (!window.confirm(`Archive "${article?.title || 'this article'}"? It will leave the website and can be restored from the Vault.`)) return;
    setArticleError('');
    setArticleMessage('');
    try {
      await adminApi.deleteArticle(id);
      setArticles((current) => current.filter((article) => article.id !== id));
      if (editingArticleId === id) resetArticleForm();
      await fetchVault(0);
    } catch (error) {
      setArticleError(errorMessage(error, 'Unable to archive article.'));
    }
  };

  const handleRestoreVaultItem = async (item: VaultItem) => {
    try {
      await adminApi.restoreVaultItem(item.kind, item.id);
      if (item.kind === 'article') await fetchArticles();
      if (item.kind === 'announcement') await fetchAnnouncements();
      if (item.kind === 'image' || item.kind === 'video') {
        await fetchGalleryImages();
        await fetchGalleryAlbums();
      }
      if (item.kind === 'pastoral') await fetchPastoralContent();
      await fetchVault(vaultOffset);
    } catch (error) {
      setVaultError(errorMessage(error, 'Unable to restore this Vault item.'));
    }
  };

  const handleArchiveVaultItem = async (item: VaultItem) => {
    try {
      await adminApi.archiveVaultItem(item.kind, item.id);
      if (item.kind === 'article') await fetchArticles();
      if (item.kind === 'announcement') await fetchAnnouncements();
      if (item.kind === 'image' || item.kind === 'video') {
        await fetchGalleryImages();
        await fetchGalleryAlbums();
      }
      if (item.kind === 'pastoral') await fetchPastoralContent();
      await fetchVault(vaultOffset);
    } catch (error) {
      setVaultError(errorMessage(error, 'Unable to archive this Vault item.'));
    }
  };

  const handleVaultPublicationUpload = async (file?: File) => {
    if (!file) return;
    setVaultPublicationBusy(true);
    setVaultPublicationError('');
    setVaultPublicationMessage('');
    try {
      const upload = await adminApi.createVaultPublicationUpload({
        filename: file.name,
        contentType: 'application/pdf',
        fileSize: file.size,
        folderPath: vaultPublicationFolder.trim(),
      });
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: upload.uploadHeaders || { 'Content-Type': 'application/pdf' },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload to storage failed with HTTP ${response.status}.`);
      await adminApi.completeVaultPublicationUpload(upload.id);
      setVaultPublicationMessage(`${file.name} was added to the Vault.`);
      await fetchVault(0);
    } catch (error) {
      setVaultPublicationError(errorMessage(error, 'Unable to upload this publication.'));
    } finally {
      setVaultPublicationBusy(false);
    }
  };

  const handlePermanentlyDeleteVaultItem = async (item: VaultItem) => {
    if (!window.confirm(`Permanently delete "${item.title}" from the Vault? This cannot be undone.`)) return;
    try {
      await adminApi.permanentlyDeleteVaultItem(item.kind, item.id);
      await fetchVault(vaultOffset);
    } catch (error) {
      setVaultError(errorMessage(error, 'Unable to permanently delete this Vault item.'));
    }
  };

  const handleLogout = async () => {
    await authApi.signOut().catch(() => undefined);
    setIsAuthenticated(false);
    setAnnouncements([]);
    setArticles([]);
    setFeastDays([]);
    setGalleryImages([]);
    setGalleryAlbums([]);
    setPastoralImages({});
    setVaultPage({ items: [], total: 0, limit: 50, offset: 0 });
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)',
        padding: 16,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 460,
          boxSizing: 'border-box',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 25px 80px rgba(15, 23, 42, 0.3)',
          padding: 24,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src="/images/holy_rosary_seal_cutout.png" alt="Holy Rosary Catholic Church seal" style={{ display: 'block', width: 68, height: 68, objectFit: 'contain', margin: '0 auto 6px' }} />
            <h1 style={{ margin: '4px 0', color: '#1a2744', fontSize: 40, fontWeight: 800, lineHeight: 1.15, fontFamily: 'Playfair Display, serif' }}>
              Dominus
            </h1>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Username</label>
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={loginData.username}
                onChange={(event) => {
                  setLoginData((current) => ({ ...current, username: event.target.value }));
                  setLoginError('');
                }}
                placeholder="Enter your username"
                style={{ boxSizing: 'border-box', width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #d8dce3', fontSize: 15 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#1a2744' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={loginData.password}
                  onChange={(event) => {
                    setLoginData((current) => ({ ...current, password: event.target.value }));
                    setLoginError('');
                  }}
                  placeholder="Enter your password"
                  style={{ boxSizing: 'border-box', width: '100%', padding: '12px 68px 12px 14px', borderRadius: 10, border: '1px solid #d8dce3', fontSize: 15 }}
                />
                <button
                  type="button"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showLoginPassword}
                  onClick={() => setShowLoginPassword((visible) => !visible)}
                  style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', border: 0, borderRadius: 6, padding: '6px 8px', background: 'transparent', color: '#1a2744', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {showLoginPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {loginError && (
              <div style={{ background: '#fff1f2', color: '#b42318', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1px solid #fecdd3' }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #d4af37, #b9952a)',
                color: '#1a2744',
                border: 'none',
                borderRadius: 12,
                padding: '12px 18px',
                fontWeight: 800,
                fontSize: 17,
                cursor: 'pointer',
              }}
            >
              Enter Dominus
            </button>
          </form>
        </div>
      </div>
    );
  }

  const drafts = announcements.filter((item) => item.status === 'Draft');
  const published = announcements.filter((item) => item.status === 'Published');
  const articleDrafts = articles.filter((article) => article.status === 'Draft');
  const publishedArticles = articles.filter((article) => article.status === 'Published');
  const feastDrafts = feastDays.filter((item) => item.status === 'Draft');
  const publishedFeastDays = feastDays.filter((item) => item.status === 'Published');
  const openGalleryAlbum = galleryAlbums.find((album) => album.id === galleryOpenAlbumId) || null;
  const openGalleryPhotos = galleryOpenAlbumId === null
    ? []
    : galleryImages.filter((image) => image.albumId === galleryOpenAlbumId);

  const healthCards = [
    { label: 'Feast days', value: `${publishedFeastDays.length} published`, tone: '#16a34a' },
    { label: 'Announcements queue', value: `${drafts.length} pending`, tone: '#f59e0b' },
    { label: 'Website status', value: 'Online', tone: '#2563eb' },
  ];

  return (
    <div data-dominus-theme={dashboardTheme} style={{ minHeight: '100vh', background: '#f4f6fb', color: '#1a2744', padding: '32px 20px' }}>
      <style>{`
        [data-dominus-theme="dark"] { background-color: #0b1220 !important; color: #e2e8f0 !important; }
        [data-dominus-theme="dark"] section,
        [data-dominus-theme="dark"] article,
        [data-dominus-theme="dark"] form,
        [data-dominus-theme="dark"] nav,
        [data-dominus-theme="dark"] div[style*="background: rgb(255, 255, 255)"],
        [data-dominus-theme="dark"] div[style*="background: rgb(250, 251, 253)"] {
          background-color: #111827 !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        [data-dominus-theme="dark"] h1,
        [data-dominus-theme="dark"] h2,
        [data-dominus-theme="dark"] h3,
        [data-dominus-theme="dark"] strong { color: #f1f5f9 !important; }
        [data-dominus-theme="dark"] p,
        [data-dominus-theme="dark"] label { color: #cbd5e1 !important; }
        [data-dominus-theme="dark"] input,
        [data-dominus-theme="dark"] textarea,
        [data-dominus-theme="dark"] select {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
          border-color: #475569 !important;
        }
        @media (max-width: 1023px) {
          .dominus-layout { flex-direction: column !important; }
          .dominus-sidebar { width: 100% !important; position: static !important; max-height: none !important; margin-bottom: 24px !important; }
        }
        @media (min-width: 1024px) {
          .dominus-sidebar {
            position: sticky !important;
            top: 20px !important;
            max-height: calc(100vh - 40px) !important;
            overflow-y: auto !important;
          }
        }
        .dominus-nav-link:hover {
          background-color: #f1f5f9 !important;
        }
        .dominus-nav-link:focus-visible {
          outline: 2px solid #b9952a !important;
          outline-offset: 2px !important;
        }
        [data-dominus-theme="dark"] .dominus-sidebar {
          background-color: #111827 !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.4) !important;
        }
        [data-dominus-theme="dark"] .dominus-nav-link {
          color: #cbd5e1 !important;
        }
        [data-dominus-theme="dark"] .dominus-nav-link:hover {
          background-color: #1e293b !important;
        }
        [data-dominus-theme="dark"] .dominus-nav-link[aria-current="true"] {
          background-color: #1e293b !important;
          color: #f6e7b8 !important;
          border-left-color: #c9a84c !important;
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.18em', color: '#b9952a', fontWeight: 700, textTransform: 'uppercase' }}>
              Parish Operations
            </p>
            <h1 style={{ margin: '8px 0 0', fontSize: 38, fontFamily: 'Playfair Display, serif' }}>Dominus Dashboard</h1>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" onClick={() => setDashboardTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${dashboardTheme === 'light' ? 'dark' : 'light'} mode`} style={{ background: '#e2e8f0', color: '#1a2744', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>
              {dashboardTheme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <button onClick={handleLogout} style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        </header>

        <div className="dominus-layout" style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          <aside aria-label="Dominus sections navigation" className="dominus-sidebar" style={{ width: 270, flexShrink: 0, background: '#fff', borderRadius: 20, padding: '20px 16px', boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
              <img src="/images/holy_rosary_seal_cutout.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <div>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b9952a' }}>Quick Navigate</span>
                <span style={{ fontSize: 14, fontWeight: 800 }}>Page Sections</span>
              </div>
            </div>

            <nav aria-label="Page sections">
              {[
                {
                  title: 'Core & Archive',
                  items: [
                    { id: 'dominus-overview', label: 'Statistics & Health', icon: '📊' },
                    { id: 'dominus-newsletter', label: 'The Rosarian', icon: '📰', badge: 'Monthly' },
                    { id: 'dominus-vault', label: 'Vault Archive', icon: '🏛️' },
                    { id: 'dominus-gallery', label: 'Photo & Video Gallery', icon: '🖼️' },
                  ],
                },
                {
                  title: 'News & Notices',
                  items: [
                    { id: 'dominus-announcements', label: 'Announcements & Popups', icon: '📢' },
                    { id: 'dominus-articles', label: 'Parish Articles', icon: '✍️' },
                    { id: 'dominus-feast-days', label: 'Feast & Saint Days', icon: '📅' },
                  ],
                },
                {
                  title: 'Parish Leadership',
                  items: [
                    { id: 'dominus-pastoral-team', label: 'Pastoral Team', icon: '⛪' },
                    { id: 'dominus-committees', label: 'Parish Committees', icon: '👥' },
                    { id: 'dominus-communities', label: 'Communities & Societies', icon: '🤝' },
                  ],
                },
              ].map((group) => (
                <div key={group.title} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', padding: '0 8px 6px' }}>
                    {group.title}
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
                    {group.items.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className="dominus-nav-link"
                            aria-current={isActive ? 'true' : undefined}
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                              setActiveSection(item.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 10px',
                              borderRadius: 10,
                              textDecoration: 'none',
                              fontSize: 13,
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? '#1a2744' : '#475569',
                              background: isActive ? '#fef3c7' : 'transparent',
                              borderLeft: isActive ? '3px solid #b9952a' : '3px solid transparent',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span aria-hidden="true" style={{ fontSize: 15 }}>{item.icon}</span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {item.badge && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: '#e2e8f0', color: '#475569' }}>
                                {item.badge}
                              </span>
                            )}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div style={{ paddingTop: 14, marginTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                ↑ Back to Top
              </button>
            </div>
          </aside>

          <main id="dominus-main" style={{ flex: 1, minWidth: 0 }}>
            <section id="dominus-overview" style={{ scrollMarginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 28 }}>
              {healthCards.map((item) => (
                <div key={item.label} style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 10px 28px rgba(26,39,68,0.06)' }}>
                  <div style={{ color: item.tone, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{item.label}</div>
                  <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800 }}>{item.value}</div>
                </div>
              ))}
            </section>

            <NewsletterAdmin />


        <section id="dominus-vault" style={{ scrollMarginTop: 24, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Archive</p>
              <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>Vault</h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>One archive for articles, announcements, and gallery media. Active items remain in their normal dashboard sections.</p>
            </div>
            <button type="button" onClick={() => void fetchVault(0)} disabled={vaultLoading} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>
              {vaultLoading ? 'Refreshing...' : 'Refresh Vault'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 1fr) auto', gap: 10, alignItems: 'end', marginBottom: 16 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>
              Publication folder
              <input value={vaultPublicationFolder} maxLength={300} onChange={(event) => setVaultPublicationFolder(event.target.value)} placeholder="e.g. Publications / 2026" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 }}>
              Add a PDF publication
              <input type="file" accept="application/pdf,.pdf" disabled={vaultPublicationBusy} onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void handleVaultPublicationUpload(file);
              }} style={{ maxWidth: '100%', fontSize: 12, fontWeight: 400 }} />
            </label>
            {vaultPublicationBusy && <span role="status" style={{ color: '#64748b', fontSize: 13 }}>Uploading publication...</span>}
          </div>
          {vaultPublicationError && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{vaultPublicationError}</p>}
          {vaultPublicationMessage && <p role="status" style={{ color: '#166534', fontSize: 13 }}>{vaultPublicationMessage}</p>}
          {vaultError && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{vaultError}</p>}
          {vaultPage.items.length === 0 ? <p style={{ color: '#64748b' }}>{vaultLoading ? 'Loading Vault...' : 'No content has been added to the Vault yet.'}</p> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {vaultPage.items.map((item) => (
                <article key={`${item.kind}-${item.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {item.hasImage && item.imageUrl && (item.kind === 'video'
                      ? <video src={item.imageUrl} controls preload="metadata" style={{ width: 76, height: 56, borderRadius: 7, objectFit: 'cover' }} />
                      : <img src={item.imageUrl} alt="" style={{ width: 76, height: 56, borderRadius: 7, objectFit: 'cover' }} />)}
                    <div>
                    <strong>{item.title}</strong>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>{item.kind} · {item.folder || item.date} · {item.archivedAt ? 'Archived' : item.status}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {item.kind === 'publication' && <a href={item.imageUrl} target="_blank" rel="noreferrer" style={{ borderRadius: 7, padding: '7px 10px', background: '#e0f2fe', color: '#075985', fontWeight: 700, textDecoration: 'none' }}>Open PDF</a>}
                    {!item.archivedAt && <button type="button" onClick={() => void handleArchiveVaultItem(item)} style={{ border: 0, borderRadius: 7, padding: '7px 10px', cursor: 'pointer', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>Archive</button>}
                    {item.archivedAt && <button type="button" onClick={() => void handleRestoreVaultItem(item)} style={{ border: 0, borderRadius: 7, padding: '7px 10px', cursor: 'pointer', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>Restore</button>}
                    {item.archivedAt && <button type="button" onClick={() => void handlePermanentlyDeleteVaultItem(item)} style={{ border: 0, borderRadius: 7, padding: '7px 10px', cursor: 'pointer', background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>Permanently delete</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
          {vaultPage.total > vaultPage.limit && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <button type="button" disabled={vaultOffset === 0 || vaultLoading} onClick={() => void fetchVault(Math.max(0, vaultOffset - vaultPage.limit))} style={{ border: 0, borderRadius: 7, padding: '8px 11px', cursor: 'pointer' }}>Previous</button>
              <span style={{ color: '#64748b', fontSize: 12 }}>{vaultOffset + 1}–{Math.min(vaultOffset + vaultPage.limit, vaultPage.total)} of {vaultPage.total}</span>
              <button type="button" disabled={vaultOffset + vaultPage.limit >= vaultPage.total || vaultLoading} onClick={() => void fetchVault(vaultOffset + vaultPage.limit)} style={{ border: 0, borderRadius: 7, padding: '8px 11px', cursor: 'pointer' }}>Next</button>
            </div>
          )}
        </section>

        <section id="dominus-pastoral-team" style={{ scrollMarginTop: 24, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Website Appearance</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>Pastoral Team</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              Edit names, roles, contacts, photos, and the order of everyone displayed in this section.
            </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pastoralTeamDirty && (
                <button
                  type="button"
                  onClick={() => void discardPastoralTeamChanges()}
                  disabled={pastoralTeamSaving || savingPastoralImage !== null}
                  style={{ border: 0, borderRadius: 10, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', color: '#334155', background: '#e2e8f0' }}
                >
                  Discard changes
                </button>
              )}
              <button
                type="button"
                onClick={() => void savePastoralTeam()}
                disabled={!pastoralTeamDirty || pastoralTeamSaving || savingPastoralImage !== null}
                style={{ border: 0, borderRadius: 10, padding: '11px 16px', fontWeight: 800, cursor: pastoralTeamDirty && !pastoralTeamSaving ? 'pointer' : 'not-allowed', color: '#1a2744', background: pastoralTeamDirty ? 'linear-gradient(135deg, #d4af37, #b9952a)' : '#e2e8f0' }}
              >
                {pastoralTeamSaving ? 'Saving team...' : pastoralTeamDirty ? 'Save Pastoral Team' : 'Team saved'}
              </button>
            </div>
          </div>
          {pastoralImageError && <p role="alert" style={{ margin: '0 0 12px', color: '#b42318', fontSize: 13 }}>{pastoralImageError}</p>}
          {pastoralImageMessage && <p role="status" style={{ margin: '0 0 12px', color: '#166534', fontSize: 13 }}>{pastoralImageMessage}</p>}
          <div style={{ display: 'grid', gap: 24 }}>
            {([
              { key: 'hierarchy' as const, label: 'Archdiocesan Leadership', members: pastoralTeam.hierarchy },
              { key: 'parishClergy' as const, label: 'Parish Clergy', members: pastoralTeam.parishClergy },
              { key: 'catechists' as const, label: 'Catechists', members: pastoralTeam.catechists },
            ]).map(({ key: group, label, members }) => (
              <div key={group} style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{label}</h3>
                  <button
                    type="button"
                    disabled={pastoralTeamSaving}
                    onClick={() => addPastoralTeamMember(group)}
                    style={{ border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', background: '#e0f2fe', color: '#075985' }}
                  >
                    Add member
                  </button>
                </div>
                {members.length === 0 && <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No members in this group.</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                  {members.map((member, index) => {
                    const imageUrl = pastoralImages[member.id] || member.image;
                    const isSaving = savingPastoralImage === member.id;
                    return (
                      <article key={member.id} style={{ minWidth: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fafbfd' }}>
                        {imageUrl
                          ? <img src={imageUrl} alt={member.name || 'Pastoral team member'} style={{ display: 'block', width: '100%', height: 190, objectFit: 'cover', objectPosition: 'top' }} />
                          : <div style={{ display: 'flex', width: '100%', height: 190, alignItems: 'center', justifyContent: 'center', background: '#e8e4d8', color: '#64748b' }}>Photo not set</div>}
                        <div style={{ display: 'grid', gap: 10, padding: 14 }}>
                          <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                            Name
                            <input maxLength={120} value={member.name} onChange={(event) => updatePastoralTeamMember(member.id, { name: event.target.value })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                          </label>
                          <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                            Role / title
                            <input maxLength={120} value={member.title} onChange={(event) => updatePastoralTeamMember(member.id, { title: event.target.value })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                          </label>
                          {group === 'hierarchy' ? (
                            <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                              Badge text
                              <input maxLength={120} value={member.specialization || ''} onChange={(event) => updatePastoralTeamMember(member.id, { specialization: event.target.value })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                            </label>
                          ) : group === 'parishClergy' ? (
                            <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                              Contact details
                              <input maxLength={120} value={member.contact || ''} onChange={(event) => updatePastoralTeamMember(member.id, { contact: event.target.value, phoneHref: undefined })} style={{ width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                            </label>
                          ) : null}
                          <label style={{ display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                            Change photo
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={savingPastoralImage !== null || pastoralTeamDirty || pastoralTeamSaving}
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                event.currentTarget.value = '';
                                void handlePastoralImageUpload(member.id, file);
                              }}
                              style={{ width: '100%', minWidth: 0, fontSize: 12 }}
                            />
                          </label>
                          {pastoralTeamDirty && <span style={{ color: '#92400e', fontSize: 11 }}>Save team edits before changing photos.</span>}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                            <button type="button" disabled={index === 0 || pastoralTeamSaving} onClick={() => reorderPastoralTeamMember(group, index, -1)} style={{ border: 0, borderRadius: 7, padding: '7px 9px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Move up</button>
                            <button type="button" disabled={index === members.length - 1 || pastoralTeamSaving} onClick={() => reorderPastoralTeamMember(group, index, 1)} style={{ border: 0, borderRadius: 7, padding: '7px 9px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Move down</button>
                            <select aria-label={`Group for ${member.name || 'new member'}`} value={group} disabled={pastoralTeamSaving} onChange={(event) => movePastoralTeamMember(group, member.id, event.target.value === 'hierarchy' ? 'hierarchy' : event.target.value === 'catechists' ? 'catechists' : 'parishClergy')} style={{ flex: 1, minWidth: 140, padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff' }}>
                              <option value="hierarchy">Leadership</option>
                              <option value="parishClergy">Parish clergy</option>
                              <option value="catechists">Catechists</option>
                            </select>
                            <button type="button" disabled={pastoralTeamSaving} onClick={() => removePastoralTeamMember(group, member.id)} style={{ border: 0, borderRadius: 7, padding: '7px 9px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Remove</button>
                          </div>
                          {pastoralImages[member.id] && (
                            <button
                              type="button"
                              disabled={savingPastoralImage !== null || pastoralTeamDirty}
                              onClick={() => void handleResetPastoralImage(member.id)}
                              style={{ border: 0, borderRadius: 8, padding: '9px 11px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}
                            >
                              {isSaving ? 'Saving...' : 'Restore original photo'}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', color: '#64748b', fontSize: 12 }}>
            Save team edits before updating photos. JPG, PNG, or WebP files up to 10 MB are accepted before optimization; saved images are limited to 1 MB.
          </p>
        </section>

        <section id="dominus-committees" style={{ scrollMarginTop: 24, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Information</p>
              <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>Parish Committees</h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Edit committee details or add a new liturgical or non-liturgical committee.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={addCommittee} disabled={committeeContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer', background: '#e0f2fe', color: '#075985' }}>Add committee</button>
              {(committeeContentDirty || communityContentDirty) && <button type="button" onClick={() => void discardParishContentChanges()} disabled={committeeContentSaving || communityContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Discard changes</button>}
              <button type="button" onClick={() => void saveCommittees()} disabled={!committeeContentDirty || committeeContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 800, cursor: committeeContentDirty ? 'pointer' : 'not-allowed', background: committeeContentDirty ? '#d4af37' : '#e2e8f0', color: '#1a2744' }}>{committeeContentSaving ? 'Saving...' : 'Save committees'}</button>
            </div>
          </div>
          {committeeContentError && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{committeeContentError}</p>}
          {committeeContentMessage && <p role="status" style={{ color: '#166534', fontSize: 13 }}>{committeeContentMessage}</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            {committees.map((item) => (
              <article key={item.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fafbfd' }}>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Committee name
                  <input maxLength={120} value={item.name} onChange={(event) => updateCommittee(item.id, { name: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Subsection
                  <select value={item.category} onChange={(event) => updateCommittee(item.id, { category: event.target.value === 'non-liturgical' ? 'non-liturgical' : 'liturgical' })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                    <option value="liturgical">Liturgical Committee</option>
                    <option value="non-liturgical">Non-Liturgical Committee</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Meeting schedule
                  <input maxLength={500} value={item.meeting} onChange={(event) => updateCommittee(item.id, { meeting: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, gridColumn: '1 / -1' }}>Description
                  <textarea rows={3} maxLength={2000} value={item.description} onChange={(event) => updateCommittee(item.id, { description: event.target.value })} style={{ resize: 'vertical', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                {item.choirList && <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, gridColumn: '1 / -1' }}>Additional schedule items (one per line)
                  <textarea rows={3} maxLength={3000} value={item.choirList.join('\n')} onChange={(event) => updateCommittee(item.id, { choirList: event.target.value.split('\n').slice(0, 30) })} style={{ resize: 'vertical', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>}
                {!item.choirList && <button type="button" onClick={() => updateCommittee(item.id, { choirList: [''] })} style={{ justifySelf: 'start', border: 0, borderRadius: 8, padding: '8px 10px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>Add schedule details</button>}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => removeCommittee(item.id)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Remove committee</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="dominus-communities" style={{ scrollMarginTop: 24, marginBottom: 28, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Information</p>
              <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>Communities & Societies</h2>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Choose a subsection to edit, add, or remove its entries and their information.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={addCommunity} disabled={communityContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 700, cursor: 'pointer', background: '#e0f2fe', color: '#075985' }}>Add to subsection</button>
              <button type="button" onClick={() => void saveCommunities()} disabled={!communityContentDirty || communityContentSaving} style={{ border: 0, borderRadius: 8, padding: '9px 12px', fontWeight: 800, cursor: communityContentDirty ? 'pointer' : 'not-allowed', background: communityContentDirty ? '#d4af37' : '#e2e8f0', color: '#1a2744' }}>{communityContentSaving ? 'Saving...' : 'Save communities'}</button>
            </div>
          </div>
          <label style={{ display: 'grid', gap: 5, maxWidth: 400, marginBottom: 16, fontSize: 12, fontWeight: 700 }}>Community subsection
            <select value={communityEditGroup} onChange={(event) => setCommunityEditGroup(event.target.value as CommunityGroupKey)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
              <option value="organizations">Statutory Organizations</option>
              <option value="societies">Pious Societies</option>
              <option value="knighthood">Knighthood</option>
              <option value="states">State Associations</option>
            </select>
          </label>
          {committeeContentError && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{committeeContentError}</p>}
          {committeeContentMessage && <p role="status" style={{ color: '#166534', fontSize: 13 }}>{committeeContentMessage}</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            {communities[communityEditGroup].map((item) => (
              <article key={item.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fafbfd' }}>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Name
                  <input maxLength={120} value={item.name} onChange={(event) => updateCommunity(item.id, { name: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Meeting / schedule
                  <input maxLength={500} value={item.meeting || item.time || ''} onChange={(event) => updateCommunity(item.id, communityEditGroup === 'states' ? { time: event.target.value, meeting: undefined } : { meeting: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                {communityEditGroup !== 'states' && <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Subtitle / description
                  <input maxLength={500} value={item.subtitle || ''} onChange={(event) => updateCommunity(item.id, { subtitle: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>}
                {communityEditGroup === 'organizations' && <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>Thanksgiving schedule
                  <input maxLength={500} value={item.thanksgiving || ''} onChange={(event) => updateCommunity(item.id, { thanksgiving: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>}
                {communityEditGroup === 'states' && <>
                  <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>States / region
                    <input maxLength={500} value={item.states || ''} onChange={(event) => updateCommunity(item.id, { states: event.target.value })} style={{ minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                  </label>
                  {([
                    ['formalName', 'Formal name'],
                    ['audience', 'Who the community serves'],
                    ['members', 'Membership'],
                    ['leadership', 'Leadership'],
                    ['meetingPlace', 'Meeting place'],
                    ['patronSaintDay', 'Patron saint day'],
                    ['slogan', 'Slogan'],
                    ['mantra', 'Mantra'],
                    ['mission', 'Mission'],
                    ['whatWeDo', 'What we do'],
                  ] as Array<[keyof NonNullable<CommunityItem['details']>, string]>).map(([field, label]) => (
                    <label key={field} style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, gridColumn: field === 'whatWeDo' ? '1 / -1' : undefined }}>{label}
                      <textarea rows={field === 'whatWeDo' ? 3 : 2} maxLength={2000} value={item.details?.[field] || ''} onChange={(event) => updateCommunityDetails(item.id, field, event.target.value)} style={{ resize: 'vertical', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    </label>
                  ))}
                </>}
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => removeCommunity(item.id)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Remove entry</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="dominus-announcements" style={{ scrollMarginTop: 24, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Add parish announcement</h2>
            <form onSubmit={handleAddAnnouncement} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Title</label>
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #dfe4ee' }} placeholder="Youth Retreat & Recollection" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Date</label>
                <input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #dfe4ee' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Description</label>
                <textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} rows={5} style={{ width: '100%', resize: 'vertical', padding: '12px 14px', borderRadius: 10, border: '1px solid #dfe4ee' }} placeholder="Share the parish notice, purpose, and schedule." />
              </div>

              <details style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Popup options for adverts, announcements, or reflections</summary>
                <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    <input type="checkbox" checked={draftPopupEnabled} onChange={(event) => setDraftPopupEnabled(event.target.checked)} />
                    Show as a website popup when published
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>Popup type
                    <select value={draftPopupKind} onChange={(event) => setDraftPopupKind(event.target.value as 'announcement' | 'advert' | 'reflection')} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                      <option value="announcement">Announcement</option>
                      <option value="advert">Advert</option>
                      <option value="reflection">Reflection</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>Popup picture (optional)
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void handlePopupImageUpload(file); }} />
                  </label>
                  {draftPopupImageData && <div style={{ display: 'grid', gap: 8 }}>
                    <img src={draftPopupImageData} alt="Popup preview" style={{ maxHeight: 180, width: '100%', borderRadius: 8, objectFit: 'cover' }} />
                    <button type="button" onClick={() => setDraftPopupImageData('')} style={{ justifySelf: 'start', border: 0, borderRadius: 7, padding: '7px 10px', cursor: 'pointer' }}>Remove picture</button>
                  </div>}
                  <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>Optional link
                    <input type="url" maxLength={500} value={draftPopupLink} onChange={(event) => setDraftPopupLink(event.target.value)} placeholder="https://..." style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>Popup starts
                      <input type="datetime-local" value={draftPopupStartAt} onChange={(event) => setDraftPopupStartAt(event.target.value)} style={{ minWidth: 0, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    </label>
                    <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>Popup ends
                      <input type="datetime-local" value={draftPopupEndAt} onChange={(event) => setDraftPopupEndAt(event.target.value)} style={{ minWidth: 0, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                    </label>
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>Schedule times use this device's local timezone. Visitors see an active popup once per campaign; closing it dismisses that campaign in their browser.</p>
                </div>
              </details>

              <button type="submit" style={{ background: 'linear-gradient(135deg, #d4af37, #b9952a)', border: 'none', borderRadius: 12, padding: '12px 18px', fontWeight: 800, color: '#1a2744', cursor: 'pointer' }}>
                Save as draft
              </button>
            </form>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Draft queue</h2>
              <button
                type="button"
                onClick={handlePublishAllDrafts}
                disabled={drafts.length === 0}
                style={{
                  background: drafts.length ? '#1a2744' : '#dfe4ee',
                  color: drafts.length ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 700,
                  cursor: drafts.length ? 'pointer' : 'not-allowed',
                }}
              >
                Publish all drafts
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {drafts.length === 0 ? (
                <div style={{ border: '1px dashed #dfe4ee', borderRadius: 12, padding: 16, color: '#64748b', background: '#fafbfd' }}>
                  No drafts waiting to be published.
                </div>
              ) : drafts.map((item) => (
                <div key={item.id} style={{ border: '1px solid #edf0f6', borderRadius: 14, padding: 14, background: '#fafbfd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16 }}>{item.title}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#fff7ed', color: '#c2410c', padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{item.status}</span>
                      <button
                        type="button"
                        onClick={() => handlePublishAnnouncement(item.id)}
                        style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, color: '#475569', fontSize: 13 }}>{item.date}</div>
                  <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="dominus-gallery" style={{ scrollMarginTop: 24, marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Memories</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>Photo Gallery</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              Browse photos by album folders, publish photos visitors can see, and feature an album or individual photo.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" onClick={() => setGalleryDeleteAllOpen(true)} disabled={galleryDeletingAll} style={{ border: 0, borderRadius: 8, padding: '9px 13px', fontWeight: 700, cursor: galleryDeletingAll ? 'not-allowed' : 'pointer', background: '#fee2e2', color: '#b91c1c' }}>
              Archive current gallery media
            </button>
          </div>
          {galleryDeleteAllOpen && (
            <div role="alertdialog" aria-modal="true" aria-labelledby="gallery-delete-all-title" aria-describedby="gallery-delete-all-description" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(15,23,42,0.65)' }}>
              <div style={{ display: 'grid', gap: 14, width: '100%', maxWidth: 480, padding: 22, borderRadius: 16, background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                <h3 id="gallery-delete-all-title" style={{ margin: 0, color: '#92400e', fontSize: 20 }}>Archive current gallery media?</h3>
                <p id="gallery-delete-all-description" style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
                  Existing photos and videos will be preserved in the Vault and removed from the public gallery. Albums and other site content will remain. You can restore archived media later.
                </p>
                <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>
                  Type ARCHIVE to confirm
                  <input autoComplete="off" value={galleryDeleteAllConfirmation} onChange={(event) => setGalleryDeleteAllConfirmation(event.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" disabled={galleryDeletingAll} onClick={() => { setGalleryDeleteAllOpen(false); setGalleryDeleteAllConfirmation(''); }} style={{ border: 0, borderRadius: 8, padding: '9px 13px', fontWeight: 700, cursor: galleryDeletingAll ? 'not-allowed' : 'pointer', background: '#e2e8f0', color: '#334155' }}>Cancel</button>
                  <button type="button" disabled={galleryDeletingAll || galleryDeleteAllConfirmation !== 'ARCHIVE'} onClick={() => void handleDeleteAllGalleryContent()} style={{ border: 0, borderRadius: 8, padding: '9px 13px', fontWeight: 700, cursor: galleryDeletingAll || galleryDeleteAllConfirmation !== 'ARCHIVE' ? 'not-allowed' : 'pointer', background: galleryDeleteAllConfirmation === 'ARCHIVE' ? '#b45309' : '#fed7aa', color: '#fff' }}>
                    {galleryDeletingAll ? 'Archiving media...' : 'Archive all gallery media'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={handleCreateGalleryAlbum} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, alignItems: 'end', padding: 16, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fafbfd' }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              New album event name
              <input required maxLength={120} value={galleryNewAlbumTitle} onChange={(event) => setGalleryNewAlbumTitle(event.target.value)} placeholder="Harvest of Amazing Grace 2026" style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Event date
              <input type="date" value={galleryNewAlbumDate} onChange={(event) => setGalleryNewAlbumDate(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Description (optional)
              <input maxLength={500} value={galleryNewAlbumDescription} onChange={(event) => setGalleryNewAlbumDescription(event.target.value)} placeholder="A short event description" style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <button type="submit" style={{ border: 0, borderRadius: 8, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', color: '#fff', background: '#1a2744' }}>Create album</button>
          </form>

          {galleryOpenAlbumId === null ? (
            <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Album folders</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
                  Search folders
                  <input type="search" value={galleryAlbumSearch} onChange={(event) => setGalleryAlbumSearch(event.target.value)} placeholder="Search albums..." style={{ width: '100%', minWidth: 0, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
                <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
                  Filter by event date
                  <input type="date" value={galleryAlbumDateFilter} onChange={(event) => setGalleryAlbumDateFilter(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {galleryAlbums
                  .filter((album) => album.title.toLowerCase().includes(galleryAlbumSearch.trim().toLowerCase()))
                  .filter((album) => !galleryAlbumDateFilter || album.date === galleryAlbumDateFilter)
                  .slice()
                  .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt))
                  .map((album) => (
                    <article key={album.id} style={{ display: 'grid', alignContent: 'start', gap: 10, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                      {album.coverImage
                        ? <img src={album.coverImage.thumbnailUrl} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                        : <div aria-hidden="true" style={{ display: 'grid', placeItems: 'center', height: 140, background: '#f1f5f9', color: '#64748b', fontSize: 32 }}>▫</div>}
                      <div style={{ display: 'grid', gap: 4, padding: '0 12px' }}>
                        <strong style={{ overflowWrap: 'anywhere' }}>{album.title}</strong>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{album.date || 'No event date'} · {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}{album.isFeatured ? ' · Featured' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 12px 12px' }}>
                        <button type="button" onClick={() => { setGalleryOpenAlbumId(album.id); setGallerySelectedAlbumId(album.id); }} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#dbeafe', color: '#1e3a8a' }}>Open folder</button>
                        <button type="button" onClick={() => setGallerySelectedAlbumId(album.id)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: gallerySelectedAlbumId === album.id ? '#dcfce7' : '#f1f5f9', color: gallerySelectedAlbumId === album.id ? '#166534' : '#334155' }}>
                          {gallerySelectedAlbumId === album.id ? 'Upload folder selected' : 'Use for uploads'}
                        </button>
                        <button type="button" onClick={() => handleStartGalleryAlbumEdit(album)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#f1f5f9', color: '#334155' }}>Rename / edit</button>
                        <button type="button" onClick={() => void handleFeatureGalleryAlbum(album)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>{album.isFeatured ? 'Unfeature album' : 'Feature album'}</button>
                        {album.slug !== 'uncategorized' && <button type="button" onClick={() => void handleDeleteGalleryAlbum(album)} style={{ border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Delete album</button>}
                      </div>
                    </article>
                  ))}
              </div>
              {!galleryAlbums.length && <p style={{ margin: 0, color: '#64748b' }}>Loading folders...</p>}
              {galleryAlbums.length > 0 && !galleryAlbums.some((album) => album.title.toLowerCase().includes(galleryAlbumSearch.trim().toLowerCase()) && (!galleryAlbumDateFilter || album.date === galleryAlbumDateFilter)) && <p style={{ margin: 0, color: '#64748b' }}>No folders match these filters.</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 18, padding: 14, border: '1px solid #bfdbfe', borderRadius: 12, background: '#eff6ff' }}>
              <div>
                <button type="button" onClick={() => setGalleryOpenAlbumId(null)} style={{ border: 0, padding: 0, marginBottom: 8, background: 'transparent', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>â† All folders</button>
                <h3 style={{ margin: 0, fontSize: 18 }}>{openGalleryAlbum?.title || 'Gallery folder'}</h3>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>{openGalleryAlbum?.photoCount ?? openGalleryPhotos.length} photos in this folder</p>
              </div>
              {openGalleryAlbum && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" onClick={() => handleStartGalleryAlbumEdit(openGalleryAlbum)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#334155' }}>Rename / edit</button>
                  {openGalleryAlbum.slug !== 'uncategorized' && <button type="button" onClick={() => void handleDeleteGalleryAlbum(openGalleryAlbum)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#b91c1c' }}>Delete folder</button>}
                </div>
              )}
            </div>
          )}

          {galleryAlbumEditId !== null && (
            <form onSubmit={handleSaveGalleryAlbum} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, alignItems: 'end', marginTop: 18, padding: 16, border: '1px solid #f2d574', borderRadius: 14, background: '#fffbeb' }}>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Event name
                <input required maxLength={120} value={galleryAlbumEditTitle} onChange={(event) => setGalleryAlbumEditTitle(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Event date
                <input type="date" value={galleryAlbumEditDate} onChange={(event) => setGalleryAlbumEditDate(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Description
                <input maxLength={500} value={galleryAlbumEditDescription} onChange={(event) => setGalleryAlbumEditDescription(event.target.value)} style={{ width: '100%', minWidth: 0, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={{ border: 0, borderRadius: 8, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', color: '#fff', background: '#1a2744' }}>Save changes</button>
                <button type="button" onClick={() => setGalleryAlbumEditId(null)} style={{ border: 0, borderRadius: 8, padding: '11px 14px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155' }}>Cancel</button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gap: 14, maxWidth: 760 }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Album for these uploads
              <select required value={gallerySelectedAlbumId ?? ''} onChange={(event) => setGallerySelectedAlbumId(event.target.value ? Number(event.target.value) : null)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                <option value="" disabled>Choose an album folder</option>
                {galleryAlbums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
              Choose photos/videos or a folder
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                ref={(element) => {
                  if (element) {
                    element.setAttribute('webkitdirectory', '');
                    element.setAttribute('directory', '');
                  }
                }}
                onChange={(event) => void handleGalleryFolderUpload(event)}
                disabled={gallerySaving}
              />
            </label>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
              Select a folder to create a named album and preserve its nested folders, or choose individual files for the selected album. JPG, PNG, and WebP photos up to 25 MB and MP4, WebM, or MOV videos up to 500 MB upload directly to cloud storage as drafts.
            </p>
            {galleryError && <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>{galleryError}</p>}
            {galleryMessage && <p role="status" style={{ margin: 0, color: '#166534', fontSize: 13 }}>{galleryMessage}</p>}
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{galleryOpenAlbumId === null ? 'Photos' : `Photos in ${openGalleryAlbum?.title || 'folder'}`}</h3>
            {galleryOpenAlbumId === null
              ? <p style={{ margin: 0, color: '#64748b' }}>Open an album folder above to view and manage its photos.</p>
              : openGalleryPhotos.length === 0
                ? <p style={{ margin: 0, color: '#64748b' }}>This folder is empty. Select it for uploads and add photos above.</p>
                : openGalleryPhotos.map((image) => (
              <div key={image.id} style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', alignItems: 'center', gap: 12, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                {image.mediaType === 'video'
                  ? <video src={image.viewerUrl} preload="metadata" muted style={{ width: 88, height: 66, borderRadius: 8, objectFit: 'cover' }} />
                  : <img src={image.thumbnailUrl} alt="" style={{ width: 88, height: 66, borderRadius: 8, objectFit: 'cover' }} />}
                <div style={{ minWidth: 0 }}>
                  <strong style={{ overflowWrap: 'anywhere' }}>{image.caption}</strong>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{image.folderPath ? `${image.folderPath} · ` : ''}{image.mediaType === 'video' ? 'Video' : 'Photo'} · {image.isFeatured ? 'Featured · ' : ''}{image.status}</div>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
                  <label style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', gap: 8, color: '#475569', fontSize: 12, fontWeight: 700 }}>
                    Album
                    <select value={image.albumId ?? ''} onChange={(event) => { if (event.target.value) void handleMoveGalleryImage(image, Number(event.target.value)); }} style={{ minWidth: 0, width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
                      <option value="" disabled>Select album</option>
                      {galleryAlbums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
                    </select>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {image.mediaType === 'image' && image.albumId !== null && <button type="button" onClick={() => void handleSetGalleryAlbumCover(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>Set as album cover</button>}
                    {image.mediaType === 'image' && image.status === 'Published' && !image.isFeatured && (
                      <button type="button" onClick={() => void handleFeatureGalleryImage(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: '#fef3c7', color: '#92400e' }}>
                        Feature photo
                      </button>
                    )}
                    <button type="button" onClick={() => void handleGalleryStatus(image)} style={{ border: 0, borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer', background: image.status === 'Published' ? '#fef3c7' : '#dcfce7', color: image.status === 'Published' ? '#92400e' : '#166534' }}>
                      {image.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" onClick={() => void handleDeleteGalleryImage(image.id)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 8, padding: '8px 11px', fontWeight: 700, cursor: 'pointer' }}>
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Published announcements</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {published.length === 0 ? (
              <div style={{ border: '1px dashed #dfe4ee', borderRadius: 12, padding: 16, color: '#64748b', background: '#fafbfd' }}>
                No published announcements yet.
              </div>
            ) : published.map((item) => (
              <div key={item.id} style={{ border: '1px solid #ecfdf5', borderRadius: 14, padding: 14, background: '#f0fdf4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}>{item.title}</strong>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{item.status}</span>
                </div>
                <div style={{ marginTop: 8, color: '#475569', fontSize: 13 }}>{item.date}</div>
                <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="dominus-feast-days" style={{ scrollMarginTop: 24, marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Liturgical Calendar</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>Feast & Saint Days</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 22 }}>
            <form onSubmit={handleAddFeastDay} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Add feast day</h3>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Title
                <input required maxLength={200} value={feastTitle} onChange={(event) => setFeastTitle(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="e.g. Our Lady of the Rosary" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Date
                <input required type="date" value={feastDate} onChange={(event) => setFeastDate(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Category
                <select value={feastCategory} onChange={(event) => setFeastCategory(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }}>
                  {['Solemnity', 'Feast', 'Memorial', 'Saint', 'Optional'].map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <div style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                <span>Color of the day</span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {feastColorOptions.map((option) => {
                    const selected = feastColor === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setFeastColor(option.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8,
                          border: selected ? '2px solid #1a2744' : '1px solid #dfe4ee', background: '#fff', cursor: 'pointer', fontWeight: 700,
                        }}
                      >
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: option.value, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Description
                <textarea maxLength={2000} rows={3} value={feastDescription} onChange={(event) => setFeastDescription(event.target.value)} style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="Optional note shown on the public card." />
              </label>
              <button type="submit" style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }}>Save feast day</button>
            </form>

            <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Feast day drafts</h3>
                  <button
                    type="button"
                    onClick={handlePublishAllFeastDrafts}
                    disabled={feastDrafts.length === 0}
                    style={{
                      background: feastDrafts.length ? '#1a2744' : '#dfe4ee',
                      color: feastDrafts.length ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      cursor: feastDrafts.length ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Publish all
                  </button>
                </div>
                {feastDrafts.length === 0 ? <p style={{ color: '#64748b' }}>No feast day drafts yet.</p> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {feastDrafts.map((item) => (
                      <article key={item.id} style={{ border: '1px solid #e5e9f0', borderRadius: 8, padding: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                          <div>
                            <strong>{item.title}</strong>
                            <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>{item.date} · {item.category}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} title={feastColorLabels[item.color] || 'Liturgical color'} />
                            <button type="button" onClick={() => void handlePublishFeastDay(item.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#dcfce7', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>Publish</button>
                            <button type="button" onClick={() => void handleDeleteFeastDay(item.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                          </div>
                        </div>
                        {item.description && <p style={{ margin: '9px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>{item.description}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Published feast days</h3>
                {publishedFeastDays.length === 0 ? <p style={{ color: '#64748b' }}>Published feast days will appear here.</p> : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {publishedFeastDays.map((item) => (
                      <div key={item.id} style={{ borderLeft: '3px solid #d4af37', padding: '6px 0 6px 10px' }}>
                        <strong>{item.title}</strong>
                        <div style={{ marginTop: 3, color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.date} · {item.category}
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                          {feastColorLabels[item.color] || 'Liturgical'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="dominus-articles" style={{ scrollMarginTop: 24, marginTop: 20, background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 12px 28px rgba(26,39,68,0.06)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#b9952a', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Parish Blog</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 24 }}>Articles</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 22 }}>
            <form onSubmit={handleSaveArticle} style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{editingArticleId ? 'Edit article draft' : 'Write an article'}</h3>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Title
                <input required maxLength={200} value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="Article title" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Writer name
                <input required maxLength={100} value={articleAuthorName} onChange={(event) => setArticleAuthorName(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="Name shown on the article" />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Short introduction
                <textarea required maxLength={400} rows={3} value={articleExcerpt} onChange={(event) => setArticleExcerpt(event.target.value)} style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} placeholder="A brief preview shown on the blog." />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Article picture
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    void handleArticleImageUpload(file);
                  }}
                  style={{ width: '100%', fontSize: 13, fontWeight: 400 }}
                />
              </label>
              {articleImageData && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <img src={articleImageData} alt="Article image preview" style={{ maxHeight: 220, width: '100%', borderRadius: 8, objectFit: 'cover' }} />
                  <button type="button" onClick={() => setArticleImageData('')} style={{ justifySelf: 'start', background: '#eef2f7', color: '#1a2744', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Remove picture</button>
                </div>
              )}
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Article
                <textarea required maxLength={30000} rows={10} value={articleBody} onChange={(event) => setArticleBody(event.target.value)} style={{ width: '100%', resize: 'vertical', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400, lineHeight: 1.6 }} placeholder="Write the full article here. Separate paragraphs with a blank line." />
              </label>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>
                Publish date
                <input required type="date" value={articlePublishDate} onChange={(event) => setArticlePublishDate(event.target.value)} style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #dfe4ee', fontWeight: 400 }} />
              </label>
              {articleError && <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>{articleError}</p>}
              {articleMessage && <p role="status" style={{ margin: 0, color: '#166534', fontSize: 13 }}>{articleMessage}</p>}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }}>
                  {editingArticleId ? 'Update draft' : 'Save draft'}
                </button>
                {editingArticleId && <button type="button" onClick={resetArticleForm} style={{ background: '#eef2f7', color: '#1a2744', border: 'none', borderRadius: 8, padding: '11px 16px', fontWeight: 700, cursor: 'pointer' }}>Cancel edit</button>}
              </div>
            </form>

            <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
              <article style={{ border: '1px solid #e5e9f0', borderRadius: 8, padding: 16, background: '#faf8f3' }}>
                <p style={{ margin: '0 0 10px', color: '#a07830', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Live article preview</p>
                <h3 style={{ margin: '0 0 8px', color: '#1a2744', fontSize: 22, fontFamily: 'Playfair Display, serif' }}>{articleTitle || 'Your article title'}</h3>
                <p style={{ margin: '0 0 8px', color: '#a07830', fontSize: 13, fontWeight: 700 }}>By {articleAuthorName || 'Writer name'}</p>
                <p style={{ margin: '0 0 12px', color: '#a07830', fontSize: 12 }}>{articlePublishDate}</p>
                {articleImageData && <img src={articleImageData} alt="" style={{ maxHeight: 220, width: '100%', marginBottom: 12, borderRadius: 8, objectFit: 'cover' }} />}
                <p style={{ margin: '0 0 14px', color: '#475569', lineHeight: 1.6 }}>{articleExcerpt || 'Your short introduction will appear here.'}</p>
                <div style={{ borderTop: '1px solid #e5dcc4', paddingTop: 12, color: '#334155', lineHeight: 1.7 }}>
                  {articleBody
                    ? <ParishArticleMarkdown source={articleBody} />
                    : <p style={{ margin: 0, color: '#64748b' }}>Your article text will appear here as you write.</p>}
                </div>
              </article>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Drafts</h3>
                {articleDrafts.length === 0 ? <p style={{ color: '#64748b' }}>No article drafts yet.</p> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {articleDrafts.map((article) => (
                      <article key={article.id} style={{ border: '1px solid #e5e9f0', borderRadius: 8, padding: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                          <div><strong>{article.title}</strong><div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>Planned: {article.publishDate}</div></div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => handleEditArticle(article)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#eef2f7', color: '#1a2744', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                            <button type="button" onClick={() => void handlePublishArticle(article.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#dcfce7', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>Publish</button>
                            <button type="button" onClick={() => void handleDeleteArticle(article.id)} style={{ border: 0, borderRadius: 6, padding: '6px 9px', background: '#fef3c7', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}>Archive</button>
                          </div>
                        </div>
                        <p style={{ margin: '9px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>{article.excerpt}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Published and scheduled</h3>
                {publishedArticles.length === 0 ? <p style={{ color: '#64748b' }}>Published articles will be archived here.</p> : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {publishedArticles.map((article) => (
                      <div key={article.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderLeft: '3px solid #d4af37', padding: '6px 0 6px 10px' }}>
                        <div>
                          <strong>{article.title}</strong>
                          <div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>{article.publishDate}{article.publishDate > getTodayInAbuja() ? ' · Scheduled' : ' · On blog'}</div>
                        </div>
                        <button type="button" onClick={() => void handleDeleteArticle(article.id)} style={{ flexShrink: 0, border: 0, borderRadius: 6, padding: '6px 9px', background: '#fef3c7', color: '#92400e', fontWeight: 700, cursor: 'pointer' }}>Archive</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DominusDashboard;
