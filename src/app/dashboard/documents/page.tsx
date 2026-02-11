'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Document } from '@/lib/types/database';

const REQUIRED_DOCUMENT_TYPES = [
  'Government ID (front)',
  'Government ID (back)',
  'Proof of Income',
  'Proof of Address',
  'Bank Statement',
  'Sales Contract',
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('documents').select('*').eq('user_id', user.id).order('created_at');
    if (data) setDocuments(data as unknown as Document[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(type: string, file: File) {
    setUploading(type);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upload to Supabase Storage
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file);

    if (uploadError) {
      alert('Upload error: ' + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

    // Check if document already exists for this type
    const existing = documents.find((d) => d.type === type);
    if (existing) {
      await supabase.from('documents').update({
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        status: 'pending',
        reviewed_at: null,
        review_notes: null,
      }).eq('id', existing.id);
    } else {
      await supabase.from('documents').insert({
        user_id: user.id,
        type,
        status: 'pending',
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      });
    }

    await loadDocuments();
    setUploading(null);
  }

  function handleFileSelect(type: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          alert('File must be under 10 MB');
          return;
        }
        handleUpload(type, file);
      }
    };
    input.click();
  }

  const uploadedDocs = documents.filter((d) => d.file_url);
  const approvedCount = documents.filter((d) => d.status === 'approved').length;
  const neededTypes = REQUIRED_DOCUMENT_TYPES.filter(
    (type) => !documents.find((d) => d.type === type && d.file_url)
  );

  if (loading) return <div className="text-slate-400 py-8">Loading documents...</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Documents & ID Verification</h1>
      <p className="text-sm text-slate-500 mb-6">
        Upload and manage the documents required to reserve or purchase your lot.
      </p>

      {/* Progress bar */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-slate-500">Verification progress</span>
        <span className="text-sm">
          <span className="text-sky-600 font-bold">{approvedCount}</span>
          <span className="text-slate-400"> of {REQUIRED_DOCUMENT_TYPES.length} documents complete</span>
        </span>
      </div>
      <div className="bg-slate-100 rounded-full h-2.5 mb-8">
        <div
          className="bg-sky-600 h-2.5 rounded-full transition-all"
          style={{ width: `${(approvedCount / REQUIRED_DOCUMENT_TYPES.length) * 100}%` }}
        />
      </div>

      {/* Uploaded Documents */}
      {uploadedDocs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Uploaded Documents</h2>
          <div className="divide-y divide-slate-100">
            {uploadedDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-slate-700">{doc.type}</p>
                  {doc.file_name && (
                    <p className="text-xs text-slate-400 mt-0.5">{doc.file_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                      doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {doc.status === 'approved' ? 'Approved' :
                       doc.status === 'rejected' ? 'Rejected' :
                       'Pending review'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {doc.reviewed_at
                        ? `Last reviewed: ${new Date(doc.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Uploaded: ${new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                    {doc.status === 'rejected' && doc.review_notes && (
                      <button className="text-xs text-red-500 hover:underline mt-0.5">View reason</button>
                    )}
                  </div>
                  <button
                    onClick={() => handleFileSelect(doc.type)}
                    disabled={uploading === doc.type}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    {uploading === doc.type ? 'Uploading...' : 'Replace file'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">PDF, JPG, PNG. Max 10 MB each.</p>
        </div>
      )}

      {/* Documents Needed */}
      {neededTypes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Documents Needed</h2>
          <p className="text-sm text-slate-400 mb-4">Please upload the remaining documents to continue.</p>
          <div className="divide-y divide-slate-100">
            {neededTypes.map((type) => (
              <div key={type} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-slate-700">{type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Required
                  </span>
                  <button
                    onClick={() => handleFileSelect(type)}
                    disabled={uploading === type}
                    className="px-5 py-2 bg-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
                  >
                    {uploading === type ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">PDF, JPG, PNG. Max 10 MB each.</p>
        </div>
      )}
    </div>
  );
}
