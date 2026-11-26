'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge, ErrorState } from '@/components/ui/feedback';
import { Dialog, ConfirmDialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import type {
  BackupDestinationConfig,
  PlatformBackupStatus,
} from '@/lib/api/platform';
import {
  clearBackupDestinationAction,
  runBackupAction,
  saveBackupDestinationAction,
  verifyBackupAction,
} from '@/app/(platform)/system/actions';

/**
 * The platform's own disaster recovery, on the System screen.
 *
 * A backup that is not out of reach of this machine is not a backup — so the
 * card says where the newest one lives, whether it was proven to restore,
 * and offers the two levers: run one, and verify one.
 */
export function BackupsCard({ status }: { status: PlatformBackupStatus | null }) {
  if (!status) return null;

  return (
    <BackupsCardInner status={status} />
  );
}

function BackupsCardInner({ status }: { status: PlatformBackupStatus }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <section>
      <SectionHeader
        title="The backups"
        description="Where the platform's data outlives this machine — and whether the newest copy still restores."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              {status.destination.configured
                ? 'Change destination'
                : 'Set destination'}
            </Button>
            <DestinationDialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
            />
          </>
        }
      />
      <Card className="divide-y divide-rail p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text">
                Where they go
              </span>
              <Badge tone={status.destination.kind === 's3' ? 'success' : 'warning'}>
                {status.destination.kind === 's3' ? 'Off-server' : 'On-server'}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-text-dim">
              {status.destination.description}
            </p>
            {status.destination.kind === 'internal' ? (
              <p className="mt-1 text-xs text-text-dim">
                The same machine as the data. Point it somewhere else and an
                archive outlives the box that made it.
              </p>
            ) : null}
          </div>
          {status.destination.configured ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearOpen(true)}
            >
              Clear
            </Button>
          ) : null}
          <ClearDialog
            open={clearOpen}
            onClose={() => setClearOpen(false)}
          />
        </div>

        <LastBackupRow status={status} />
        <LastVerifyRow status={status} />
        <ActionsRow />
      </Card>
    </section>
  );
}

function LastBackupRow({ status }: { status: PlatformBackupStatus }) {
  const last = status.lastBackup;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">
          {last ? 'The newest backup' : 'No backup yet'}
        </p>
        {last ? (
          <p className="mt-0.5 text-xs text-text-dim">
            {when(last.createdAt)} · {bytes(last.postgresSize + last.manifestSize)}
            {last.tableCounts
              ? ` · ${Object.values(last.tableCounts).reduce((a, b) => a + b, 0)} rows across ${Object.keys(last.tableCounts).length} tables`
              : ''}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-text-dim">
            The nightly backup has not run on this destination yet.
          </p>
        )}
      </div>
      <Badge tone={last ? 'success' : 'warning'}>
        {last ? 'Present' : 'Missing'}
      </Badge>
    </div>
  );
}

function LastVerifyRow({ status }: { status: PlatformBackupStatus }) {
  const check = status.lastVerify;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">
          {check ? 'The last restore check' : 'No restore check yet'}
        </p>
        {check ? (
          <p className="mt-0.5 text-xs text-text-dim">
            {when(check.checkedAt)}
            {check.ok
              ? ' · the newest backup restored into a scratch database and its row counts matched'
              : check.error
                ? ` · ${check.error}`
                : ''}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-text-dim">
            A restore check proves the newest backup actually comes back.
          </p>
        )}
      </div>
      {check ? (
        <Badge tone={check.ok ? 'success' : 'danger'}>
          {check.ok ? 'Restores' : 'Failed'}
        </Badge>
      ) : (
        <Badge>Never</Badge>
      )}
    </div>
  );
}

function ActionsRow() {
  const [runPending, startRun] = useTransition();
  const [verifyPending, startVerify] = useTransition();
  const [runError, setRunError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const toast = useToast();

  const run = () => {
    setRunError(null);
    setVerifyError(null);
    startRun(async () => {
      const result = await runBackupAction();
      if (result.error) setRunError(result.error);
      else toast.success('The backup ran.', 'The newest copy is on its destination now.');
    });
  };

  const verify = () => {
    setVerifyError(null);
    setVerifyResult(null);
    startVerify(async () => {
      const result = await verifyBackupAction();
      if (result.error && !result.ok) {
        setVerifyError(result.error);
      } else if (result.ok === false) {
        setVerifyResult('The check ran, but the newest backup did not fully verify.');
      } else {
        setVerifyResult('The newest backup restored into a scratch database, and its counts matched.');
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        {runError ? (
          <ErrorState
            message={runError}
            action={
              <Button variant="outline" size="sm" onClick={run}>
                Try again
              </Button>
            }
          />
        ) : null}
        {verifyError ? (
          <ErrorState
            message={verifyError}
            action={
              <Button variant="outline" size="sm" onClick={verify}>
                Try again
              </Button>
            }
          />
        ) : null}
        {verifyResult ? (
          <p className="text-xs text-text-muted">{verifyResult}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={verify} loading={verifyPending}>
          Verify restore
        </Button>
        <Button variant="primary" size="sm" onClick={run} loading={runPending}>
          Run backup now
        </Button>
      </div>
    </div>
  );
}

/**
 * The destination the backups live on: anything S3-compatible.
 * Saved only once it answers the probe — a destination that cannot be
 * reached is not saved.
 */
function DestinationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [endpoint, setEndpoint] = useState('');
  const [region, setRegion] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [bucket, setBucket] = useState('');
  const [useSsl, setUseSsl] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const save = () => {
    setError(null);
    const config: BackupDestinationConfig = {
      endpoint: endpoint.trim(),
      region: region.trim() || undefined,
      accessKey: accessKey.trim(),
      secretKey: secretKey,
      bucket: bucket.trim(),
      useSsl,
    };
    startTransition(async () => {
      const result = await saveBackupDestinationAction(config);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('The destination is set.', 'The next backup lands there.');
        onClose();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Where the backups go"
      description="Any S3-compatible store: Wasabi, Backblaze, Cloudflare R2, or another MinIO. The connection is tested before it is saved."
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={pending}>
            Test and save
          </Button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        {error ? (
          <ErrorState
            message={error}
            action={
              <Button variant="outline" size="sm" onClick={save}>
                Try again
              </Button>
            }
          />
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Endpoint"
            placeholder="s3.wasabisys.com or 10.0.0.5:9000"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
          <Input
            label="Region (optional)"
            placeholder="auto"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
          <Input
            label="Access key"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
          />
          <Input
            label="Secret key"
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
        </div>
        <Input
          label="Bucket"
          placeholder="off-server-backups"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
        />
        <Switch
          label="Use HTTPS"
          description="Off only for a plain-HTTP MinIO inside your own network."
          checked={useSsl}
          onChange={setUseSsl}
        />
      </div>
    </Dialog>
  );
}

function ClearDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      pending={pending}
      title="Clear the off-server destination?"
      body="Backups go to the platform's own MinIO again — on this machine. The stored destination configuration is removed."
      confirmLabel="Clear destination"
      onConfirm={() => {
        startTransition(async () => {
          const result = await clearBackupDestinationAction();
          if (result.error) toast.error('The destination was not cleared.', result.error);
          else {
            toast.success('The destination was cleared.', 'Backups stay on the platform MinIO.');
            onClose();
          }
        });
      }}
    />
  );
}

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function bytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.ceil(n / 1024)} KB`;
}
