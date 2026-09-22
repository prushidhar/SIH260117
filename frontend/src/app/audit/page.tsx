import type { Metadata } from 'next';
import AuditLedgerView from '@/components/views/AuditLedgerView';

export const metadata: Metadata = {
  title: 'Merkle Audit Ledger',
};

export default function AuditPage() {
  return <AuditLedgerView />;
}
