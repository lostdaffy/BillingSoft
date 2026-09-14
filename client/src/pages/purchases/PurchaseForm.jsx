import { useParams, useSearchParams } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import DocumentForm from '../../components/documents/DocumentForm';
import { Button, EmptyState, ErrorState, PageHeader, PageLoader } from '../../components/ui';

export default function PurchaseForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isEdit = Boolean(id);
  const duplicateId = params.get('duplicate');
  const partyId = params.get('party');

  const { data, loading, error, reload } = useApi(async () => {
    const sourceId = id || duplicateId;
    const [doc, party] = await Promise.all([
      sourceId ? api.get(`/purchases/${sourceId}`).then((res) => res.data) : null,
      partyId ? api.get(`/clients/${partyId}`).then((res) => res.data).catch(() => null) : null
    ]);
    return { doc, party };
  }, [id, duplicateId, partyId]);

  const title = isEdit ? 'Edit Purchase Bill' : duplicateId ? 'Duplicate Purchase Bill' : 'New Purchase Bill';
  useDocumentTitle(title);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const doc = data.doc;
  if (isEdit && doc.status === 'CANCELLED') {
    return (
      <div className="card">
        <EmptyState
          icon={LockClosedIcon}
          title="This bill cannot be edited"
          description="Cancelled purchases must be restored before editing."
          action={<Button to={`/purchases/${id}`}>View Bill</Button>}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader title={title} subtitle={isEdit ? doc.billNumber || doc.purchaseNumber : undefined} backTo={isEdit ? `/purchases/${id}` : '/purchases'} />
      <DocumentForm key={`${id || 'new'}-${duplicateId || ''}-${partyId || ''}`} mode="PURCHASE" doc={doc} party={data.party} isEdit={isEdit} />
    </>
  );
}
