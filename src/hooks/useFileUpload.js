import { useState } from 'react';
import { storage } from '@/api/supabaseClient';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadFile = async (file) => {
    setUploading(true);
    setError(null);
    try {
      const { file_url } = await storage.uploadFile(file);
      return file_url;
    } catch (e) {
      setError('Erro ao enviar arquivo. Tente novamente.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error };
}
