'use client';

import { useParams } from 'next/navigation';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useFunctionRealtime } from './use-function-realtime';
import { useFunctionDetail } from './page-hooks';
import {
  FunctionHeader,
  FunctionTabs,
  FunctionCode,
  FunctionLogs,
  FunctionSettings,
  FunctionVersions,
  FunctionInvoke,
} from '@/components/functions';
import { FunctionBreadcrumb } from './function-breadcrumb';
import { FunctionErrorState } from './function-error-state';

export default function FunctionDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const functionId = params.id as string;

  const { getSdk } = useAuth();
  const {
    fn, loading, error, activeTab, setActiveTab,
    code, deploying, deployMsg,
    handleDeploy, handleInvoke, handleUpdate, handleDelete,
    handleStatusUpdate, handleReload,
  } = useFunctionDetail({ projectId, functionId });

  useFunctionRealtime({
    projectId,
    functionId,
    getSdk,
    onStatusUpdate: handleStatusUpdate,
    onReload: handleReload,
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  );

  if (error || !fn) return <FunctionErrorState error={error} projectId={projectId} />;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-full gap-6 overflow-y-auto">
      <FunctionBreadcrumb projectId={projectId} fn={fn} />

      <FunctionHeader
        fn={fn} deploying={deploying}
        onDeploy={() => handleDeploy(code)} onInvoke={handleInvoke} onDelete={handleDelete}
      />

      <FunctionTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'code' && (
          <FunctionCode
            projectId={projectId} functionId={functionId} runtime={fn.runtime}
            status={fn.status} currentVersion={fn.currentVersion} memoryMb={fn.memoryMb}
            getSdk={getSdk} initialCode={code} deploying={deploying} deployMsg={deployMsg}
            onDeploy={handleDeploy} onInvoke={handleInvoke}
          />
        )}
        {activeTab === 'logs' && (
          <FunctionLogs projectId={projectId} functionId={functionId} getSdk={getSdk}
            inFlight={fn.status === 'BUILDING' || fn.status === 'DEPLOYING'} />
        )}
        {activeTab === 'versions' && (
          <FunctionVersions projectId={projectId} functionId={functionId} getSdk={getSdk} />
        )}
        {activeTab === 'settings' && (
          <FunctionSettings fn={fn} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
        {activeTab === 'invoke' && (
          <FunctionInvoke projectId={projectId} functionId={functionId} getSdk={getSdk} />
        )}
      </div>
    </div>
  );
}
