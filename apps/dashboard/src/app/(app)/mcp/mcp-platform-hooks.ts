'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Project } from '@/types';

interface ApiKeyPair {
  id: string;
  key: string;
}

interface UsePlatformMcpHubReturn {
  projects: Project[];
  selectedProject: Project | null;
  apiKey: ApiKeyPair | null;
  loadingProjects: boolean;
  loadingKey: boolean;
  showKey: boolean;
  setSelectedProject: (p: Project) => void;
  setShowKey: (v: boolean) => void;
  generateKey: () => Promise<void>;
}

export function usePlatformMcpHub(): UsePlatformMcpHubReturn {
  const { getSdk } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [apiKey, setApiKey] = useState<ApiKeyPair | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingKey, setLoadingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Load user's projects
  useEffect(() => {
    async function load() {
      try {
        const res = await getSdk().projects.list();
        const list = Array.isArray(res) ? res : (res as { projects?: Project[] }).projects ?? [];
        setProjects(list);
        if (list.length > 0) setSelectedProject(list[0]);
      } catch {
        // silently fail — page will show no projects
      } finally {
        setLoadingProjects(false);
      }
    }
    void load();
  }, [getSdk]);

  // Load existing API key for selected project
  useEffect(() => {
    if (!selectedProject) return;
    setShowKey(false);
    setApiKey(null);
    const pid = selectedProject.id;
    async function loadKey() {
      try {
        const keys = await getSdk().projects.listApiKeys(pid);
        const keysArr = Array.isArray(keys) ? keys : (keys as { apiKeys?: ApiKeyPair[] }).apiKeys ?? [];
        if (keysArr.length > 0) {
          // Return first key metadata — the actual key is only shown once at creation
          setApiKey({ id: keysArr[0].id, key: '(shown once at creation)' });
        }
      } catch {
        // no key yet
      }
    }
    void loadKey();
  }, [selectedProject, getSdk]);

  const generateKey = useCallback(async () => {
    if (!selectedProject) return;
    setLoadingKey(true);
    try {
      const result = await getSdk().projects.createApiKey(selectedProject.id, 'MCP Integration');
      setApiKey({ id: result.apiKey.id, key: result.key });
      setShowKey(true);
    } finally {
      setLoadingKey(false);
    }
  }, [selectedProject, getSdk]);

  return {
    projects,
    selectedProject,
    apiKey,
    loadingProjects,
    loadingKey,
    showKey,
    setSelectedProject,
    setShowKey,
    generateKey,
  };
}
