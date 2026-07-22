import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { useUploadAvatar } from "../../features/user/hooks/use-user";
import { useAuth } from "../../context/auth-context";

interface AvatarUploadProps {
  currentUrl?: string | null;
  name: string;
}

export function AvatarUpload({ currentUrl, name }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadAvatar, isPending } = useUploadAvatar();
  const { updateUser } = useAuth();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clear preview when currentUrl updates externally (meaning upload finished and data refetched)
  useEffect(() => {
    setPreviewUrl(null);
  }, [currentUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Trigger upload
      uploadAvatar(file, {
        onSuccess: (data) => {
          updateUser({ profilePictureUrl: data.profile_picture_url });
        },
        onSettled: () => {
          // Cleanup object url to avoid memory leaks
          URL.revokeObjectURL(objectUrl);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      });
    }
  };

  const displayUrl = previewUrl || currentUrl;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 relative group">
        {displayUrl ? (
          <img src={displayUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-display font-bold text-primary">{initial}</span>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-white">photo_camera</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <h4 className="font-bold text-on-surface text-sm">Foto Profil</h4>
        <p className="text-xs text-on-surface-variant max-w-xs">
          Format yang didukung: JPG, JPEG, PNG. Ukuran maksimal: 2MB.
        </p>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg, image/png, image/jpg"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isPending}
            className="mt-1"
          >
            {currentUrl ? "Ubah Foto" : "Unggah Foto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
