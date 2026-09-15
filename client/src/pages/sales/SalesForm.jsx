import { useParams, useSearchParams } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import api from '../../lib/api';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { SALES_TYPES, documentLabel } from '../../lib/constants';
import DocumentForm from '../../components/documents/DocumentForm';
import { Button, EmptyState, ErrorState, PageHeader, PageLoader } from '../../components/ui';

export default function SalesForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isEdit = Boolean(id);
  const duplicateId = params.get('duplicate');
  const partyId = params.get('party');
  const requestedType = params.get('type');
  // ?type=BILL opens the "Bill (Without Tax)" format, which is an invoice with inclusive pricing.
  const requestedBill = requestedType === 'BILL';
  const docType = requestedBill ? 'INVOICE' : SALES_TYPES[requestedType] ? requestedType : 'INVOICE';

  const { data, loading, error, reload } = useApi(async () => {
    const sourceId = id || duplicateId;
    const [doc, party] = await Promise.all([
      sourceId ? api.get(`/invoices/${sourceId}`).then((res) => res.data) : null,
      partyId ? api.get(`/clients/${partyId}`).then((res) => res.data).catch(() => null) : null
    ]);
    return { doc, party };
  }, [id, duplicateId, partyId]);

  const doc = data?.doc;
  const effectiveType = doc?.invoiceType || docType;
  const label = doc ? documentLabel(doc) : requestedBill ? 'Bill' : SALES_TYPES[effectiveType]?.label || 'Document';
  const title = isEdit ? `Edit ${label}` : duplicateId ? `Duplicate ${label}` : `New ${label}`;
  useDocumentTitle(title);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const backTo = isEdit ? `/sales/${id}` : effectiveType === 'INVOICE' ? '/sales' : '/quotations';

  if (isEdit && ['CONVERTED', 'CANCELLED'].includes(doc.status)) {
    return (
      <div className="card">
        <EmptyState
          icon={LockClosedIcon}
          title="This document cannot be edited"
          description={doc.status === 'CONVERTED' ? 'It has already been converted into an invoice.' : 'Cancelled invoices must be restored before editing.'}
          action={<Button to={`/sales/${id}`}>View Document</Button>}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader title={title} subtitle={isEdit ? doc.invoiceNumber : undefined} backTo={backTo} />
      <DocumentForm
        key={`${id || 'new'}-${duplicateId || ''}-${requestedType || ''}-${partyId || ''}`}
        mode="SALE"
        doc={doc}
        docType={effectiveType}
        taxMode={requestedBill ? 'INCLUSIVE' : undefined}
        party={data.party}
        isEdit={isEdit}
      />
    </>
  );
}
