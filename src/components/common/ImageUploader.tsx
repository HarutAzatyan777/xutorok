import { useRef, useState } from 'react';
import { Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import {
  uploadRestaurantImage,
  validateImageFile,
} from '../../lib/firebase/storage';
import type { StorageMediaFolder } from '../../lib/firebase/paths';
import { useToast } from '../../app/providers/ToastProvider';

interface ImageUploaderProps {
  folder: StorageMediaFolder;
  itemId?: string;
  imageUrl?: string;
  imagePath?: string;
  onChange: (result: { imageUrl: string; imagePath: string }) => void;
  label?: string;
}

export function ImageUploader({
  folder,
  itemId,
  imageUrl,
  imagePath,
  onChange,
  label = 'Product Image',
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateImageFile(file);
      setUploading(true);
      const uploaded = await uploadRestaurantImage(file, folder, {
        itemId,
        previousImagePath: imagePath || undefined,
      });
      onChange(uploaded);
      showToast({
        variant: 'success',
        title: 'Image uploaded',
        description: `Stored under ${uploaded.imagePath}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload image.';
      showToast({
        variant: 'error',
        title: 'Image upload failed',
        description: msg,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-stone-700">{label}</span>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Preview Box */}
        <div className="relative flex h-32 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-stone-400">
              <ImageIcon className="h-7 w-7 stroke-[1.5]" />
              <span className="text-[11px] font-medium">No image</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
              onChange={(e) => void handleFileSelect(e)}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {imageUrl ? 'Replace Image' : 'Upload Image'}
            </button>

            {imageUrl && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => onChange({ imageUrl: '', imagePath: '' })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>

          <p className="text-xs text-stone-500">
            JPG, PNG, WebP, AVIF, or SVG up to 5 MB. Stored under{' '}
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[11px]">
              restaurants/xutorok/{folder}/
            </code>
            . Clean food photography without overlaid text/prices is recommended.
          </p>
        </div>
      </div>
    </div>
  );
}

