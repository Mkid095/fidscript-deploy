// Projects page event handlers

import type { Project } from '@/types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { AuthError, RateLimitError } from '@fidscript-deploy/sdk';

type ProjectType = 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';

export interface ProjectsHandlers {
  handleCreate: () => Promise<void>;
  handleSaveEdit: () => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
  handleRequestPurge: () => Promise<void>;
  handleConfirmPurge: () => Promise<void>;
  handleRestore: (p: Project) => Promise<void>;
  handleEdit: (p: Project) => void;
  handleDelete: (p: Project) => void;
  handlePurge: (p: Project) => void;
  handleCreateOpen: () => void;
}

interface CreateState { name: string; description: string; }
interface EditState { editing: Project | null; editName: string; editType: ProjectType; editDescription: string; }
interface DeleteState { deleting: Project | null; deleteAck: boolean; }
interface PurgeState { purgeProject: Project | null; purgeCode: string; purgeRequested: boolean; }

export function createProjectsHandlers(opts: {
  getSdk: () => FidscriptSDK;
  router: { replace(path: string): void; push(path: string): void };
  load: () => Promise<void>;
  create: CreateState;
  edit: EditState;
  delete: DeleteState;
  purge: PurgeState;
  setActivePanel: (v: 'create' | 'edit' | 'delete' | 'purge' | null) => void;
  setCreating: (v: boolean) => void;
  setCreateError: (v: string | null) => void;
  setSavingEdit: (v: boolean) => void;
  setEditError: (v: string | null) => void;
  setDeletingNow: (v: boolean) => void;
  setDeleteError: (v: string | null) => void;
  setPurgeVerifying: (v: boolean) => void;
  setPurgeError: (v: string | null) => void;
  setPurgeRequested: (v: boolean) => void;
  setEditing: (p: Project | null) => void;
  setEditName: (v: string) => void;
  setEditType: (v: ProjectType) => void;
  setEditDescription: (v: string) => void;
  setDeleting: (p: Project | null) => void;
  setDeleteAck: (v: boolean) => void;
  setPurgeProject: (p: Project | null) => void;
  setPurgeCode: (v: string) => void;
  setName: (v: string) => void;
  setDescription: (v: string) => void;
}): ProjectsHandlers {
  const { getSdk, router, load, create, edit, delete: d, purge: p, setActivePanel, setCreating, setCreateError, setSavingEdit, setEditError, setDeletingNow, setDeleteError, setPurgeVerifying, setPurgeError, setPurgeRequested, setEditing, setEditName, setEditType, setEditDescription, setDeleting, setDeleteAck, setPurgeProject, setPurgeCode, setName, setDescription } = opts;

  async function handleCreate() {
    if (!create.name.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.projects.create({ name: create.name.trim(), description: create.description.trim() || undefined, type: 'frontend' });
      setActivePanel(null); router.push(`/projects/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setCreateError('Rate limited. Please wait a moment and try again.'); return; }
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
    } finally { setCreating(false); }
  }

  async function handleSaveEdit() {
    if (!edit.editing || !edit.editName.trim()) return;
    setSavingEdit(true); setEditError(null);
    try {
      const sdk = getSdk();
      await sdk.projects.update(edit.editing.id, { name: edit.editName.trim(), type: edit.editType, ...(edit.editDescription.trim() ? { description: edit.editDescription.trim() } : {}) });
      setActivePanel(null); await load();
    } catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setEditError('Rate limited. Please wait a moment and try again.'); return; }
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSavingEdit(false); }
  }

  async function handleConfirmDelete() {
    if (!d.deleting || !d.deleteAck) return;
    setDeletingNow(true); setDeleteError(null);
    try { const sdk = getSdk(); await sdk.projects.delete(d.deleting.id); setActivePanel(null); await load(); }
    catch (err) {
      if (err instanceof AuthError) { router.replace('/login'); return; }
      if (err instanceof RateLimitError) { setDeleteError('Rate limited. Please wait a moment and try again.'); return; }
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally { setDeletingNow(false); }
  }

  async function handleRequestPurge() {
    if (!p.purgeProject) return;
    setPurgeVerifying(true); setPurgeError(null);
    try { const sdk = getSdk(); await sdk.projects.requestPurge(p.purgeProject.id); setPurgeRequested(true); }
    catch (err) { setPurgeError(err instanceof Error ? err.message : 'Failed to send verification code'); }
    finally { setPurgeVerifying(false); }
  }

  async function handleConfirmPurge() {
    if (!p.purgeProject || !p.purgeCode.trim()) return;
    setPurgeVerifying(true); setPurgeError(null);
    try { const sdk = getSdk(); await sdk.projects.purge(p.purgeProject.id, p.purgeCode.trim()); setActivePanel(null); await load(); }
    catch (err) { setPurgeError(err instanceof Error ? err.message : 'Invalid or expired code'); }
    finally { setPurgeVerifying(false); }
  }

  async function handleRestore(proj: Project) {
    try { const sdk = getSdk(); await sdk.projects.restore(proj.id); await load(); } catch {}
  }

  function handleEdit(proj: Project) {
    setEditing(proj); setEditName(proj.name); setEditType(proj.type as ProjectType); setEditDescription(proj.description ?? ''); setEditError(null); setActivePanel('edit');
  }

  function handleDelete(proj: Project) {
    setDeleting(proj); setDeleteAck(false); setDeleteError(null); setActivePanel('delete');
  }

  function handlePurge(proj: Project) {
    setPurgeProject(proj); setPurgeCode(''); setPurgeRequested(false); setPurgeError(null); setActivePanel('purge');
  }

  function handleCreateOpen() {
    setName(''); setDescription(''); setCreateError(null); setActivePanel('create');
  }

  return { handleCreate, handleSaveEdit, handleConfirmDelete, handleRequestPurge, handleConfirmPurge, handleRestore, handleEdit, handleDelete, handlePurge, handleCreateOpen };
}
