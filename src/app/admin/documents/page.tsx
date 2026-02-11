'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DocRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  review_notes: string | null;
  profile: { full_name: string | null; email: string | null } | null;
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const loadDocuments = useCallback(async () => {
    const supabase = createClient();
    const { data } = filter !== 'all'
      ? await supabase.from('documents').select('*').eq('status', filter).order('created_at', { ascending: false })
      : await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (data) {
      const rows = data as unknown as DocRow[];
      const userIds = [...new Set(rows.map((d) => d.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profileMap = new Map<string, DocRow['profile']>((profiles || []).map((p: unknown) => {
        const prof = p as { id: string; full_name: string | null; email: string | null };
        return [prof.id, prof];
      }));
      setDocuments(rows.map((d) => ({ ...d, profile: profileMap.get(d.user_id) || null })));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  async function reviewDocument(id: string, status: 'approved' | 'rejected', notes?: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('documents').update({
      status,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else await loadDocuments();
  }

  if (loading) return <div className="text-slate-400 py-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Document Review</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">File</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Uploaded</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">{doc.profile?.full_name || doc.profile?.email || doc.user_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{doc.type}</td>
                <td className="px-4 py-3 text-sm">
                  {doc.file_url ? (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline text-xs">{doc.file_name || 'View file'}</a>
                  ) : <span className="text-slate-400 text-xs">No file</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                    doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{doc.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {doc.status === 'pending' && (
                    <div className="flex gap-1">
                      <button onClick={() => reviewDocument(doc.id, 'approved')} className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded">Approve</button>
                      <button onClick={() => {
                        const notes = prompt('Rejection reason:');
                        if (notes !== null) reviewDocument(doc.id, 'rejected', notes);
                      }} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No documents found</div>}
      </div>
    </div>
  );
}
