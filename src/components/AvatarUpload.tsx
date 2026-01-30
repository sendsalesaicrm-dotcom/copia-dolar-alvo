import React, { useState, useRef } from 'react';
import { User, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showError, showSuccess, showLoading, dismissToast } from '../utils/toast';

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  onUploadSuccess: (newUrl: string) => void;
}

const BUCKET_NAME = 'avatars';

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ userId, avatarUrl, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showError('O arquivo deve ter no máximo 5MB.');
        return;
    }

    setUploading(true);
    const toastId = showLoading('Enviando imagem...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 1. Upload the file
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite existing file
        });

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      const newAvatarUrl = publicUrlData.publicUrl;

      // 3. Update the profile table with the new URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      dismissToast(toastId);
      showSuccess('Foto de perfil atualizada com sucesso!');
      onUploadSuccess(newAvatarUrl);

    } catch (error) {
      dismissToast(toastId);
      console.error('Upload error:', error);
      showError('Falha ao enviar a foto de perfil.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    }
  };

  const handleAvatarClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-24 h-24 group">
        {/* Avatar Display */}
        <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center border-4 border-border shadow-md">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <User className="w-12 h-12 text-muted-foreground" />
          )}
        </div>

        {/* Upload Overlay */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full cursor-pointer disabled:cursor-not-allowed"
          aria-label="Upload new avatar"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-primary-foreground" />
          )}
        </button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={uploading}
      />
      <p className="text-xs text-muted-foreground">Clique para alterar (Max 5MB)</p>
    </div>
  );
};