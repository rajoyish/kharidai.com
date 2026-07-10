import { ImageUp, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    IMAGE_UPLOAD_MAX_BYTES,
    imageRejectionReason,
} from '@/lib/image-upload';
import type { ImageDimensions } from '@/lib/image-upload';
import { cn } from '@/lib/utils';

type ImageUploadProps = {
    /** Id given to the underlying file input, for label association. */
    id: string;
    /** The pending file held in the Inertia form state, or null when none. */
    value: File | null;
    onChange: (file: File | null) => void;
    /**
     * Fully resolved URL of the image already stored on the server. Shown until
     * a new file is chosen, and restored when a pending file is removed.
     */
    initialPreviewUrl?: string | null;
    error?: string;
    /** Enforced client-side before the file reaches the form state. */
    requiredDimensions?: ImageDimensions;
    /** Enforced client-side, in bytes. Defaults to 1 MB. */
    maxSizeBytes?: number;
    /** Tailwind aspect ratio for the drop zone and preview. */
    aspectClassName?: string;
    accept?: string;
    /** Copy shown under the icon in the empty state. */
    hint?: ReactNode;
    disabled?: boolean;
};

/**
 * Reads the intrinsic size of a file so a mis-sized image can be rejected
 * before it reaches the server, giving editors feedback without a round trip.
 */
function readImageDimensions(file: File): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not read the selected image.'));
        };
        image.src = objectUrl;
    });
}

/**
 * A single image picker with click-to-browse, drag-and-drop, and a live preview
 * of the pending file. It owns the object URL for that preview — including its
 * revocation — so callers only ever hold the `File` in their form state.
 */
export function ImageUpload({
    id,
    value,
    onChange,
    initialPreviewUrl = null,
    error,
    requiredDimensions,
    maxSizeBytes = IMAGE_UPLOAD_MAX_BYTES,
    aspectClassName = 'aspect-1200/630',
    accept = 'image/*',
    hint,
    disabled = false,
}: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Nested children fire dragleave as the pointer crosses them, so track the
    // depth rather than toggling on the first leave event.
    const dragDepth = useRef(0);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
        null,
    );

    // Mirrors `pendingPreviewUrl` so the unmount cleanup can revoke the live URL
    // without re-subscribing an effect on every selection.
    const pendingPreviewUrlRef = useRef<string | null>(null);

    /**
     * Minting the URL here rather than in an effect keeps the blob's lifetime
     * tied to the selection event that created it: the previous one is revoked
     * the moment it stops being rendered, and a render that React discards
     * never allocates one at all.
     */
    const replacePendingPreview = (file: File | null) => {
        if (pendingPreviewUrlRef.current) {
            URL.revokeObjectURL(pendingPreviewUrlRef.current);
        }

        pendingPreviewUrlRef.current = file ? URL.createObjectURL(file) : null;
        setPendingPreviewUrl(pendingPreviewUrlRef.current);
    };

    useEffect(() => {
        return () => {
            if (pendingPreviewUrlRef.current) {
                URL.revokeObjectURL(pendingPreviewUrlRef.current);
            }
        };
    }, []);

    // `value` stays the source of truth for whether a pending file exists, so a
    // caller clearing it externally falls back to the stored image immediately.
    const previewUrl = (value && pendingPreviewUrl) || initialPreviewUrl;

    const resetFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const reject = (reason: string) => {
        toast.error(reason);
        resetFileInput();
    };

    const acceptFile = async (file: File) => {
        // Check type and size before decoding, so a non-image never reaches the
        // image reader and gets reported as an unreadable file.
        const cheapRejection = imageRejectionReason(
            { type: file.type, size: file.size },
            { maxSizeBytes },
        );

        if (cheapRejection) {
            reject(cheapRejection);

            return;
        }

        if (!requiredDimensions) {
            replacePendingPreview(file);
            onChange(file);

            return;
        }

        try {
            const dimensions = await readImageDimensions(file);
            const rejection = imageRejectionReason(
                { type: file.type, size: file.size, dimensions },
                { requiredDimensions },
            );

            if (rejection) {
                reject(rejection);

                return;
            }

            replacePendingPreview(file);
            onChange(file);
        } catch {
            reject('Could not read the selected image.');
        }
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            void acceptFile(file);
        }
    };

    const handleDragEnter = (event: DragEvent) => {
        event.preventDefault();

        if (disabled) {
            return;
        }

        dragDepth.current += 1;
        setIsDraggingOver(true);
    };

    const handleDragOver = (event: DragEvent) => {
        // Without this the browser opens the dropped file in a new tab.
        event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent) => {
        event.preventDefault();
        dragDepth.current -= 1;

        if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDraggingOver(false);
        }
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        dragDepth.current = 0;
        setIsDraggingOver(false);

        if (disabled) {
            return;
        }

        const file = event.dataTransfer.files?.[0];

        if (file) {
            void acceptFile(file);
        }
    };

    const clearSelectedImage = () => {
        resetFileInput();
        replacePendingPreview(null);
        onChange(null);
    };

    const openFilePicker = () => fileInputRef.current?.click();

    return (
        <div className="grid gap-2.5">
            <input
                id={id}
                type="file"
                ref={fileInputRef}
                onChange={handleInputChange}
                className="hidden"
                accept={accept}
                disabled={disabled}
            />

            <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {previewUrl ? (
                    <div
                        className={cn(
                            'group relative overflow-hidden rounded-lg border transition-colors',
                            isDraggingOver &&
                                'border-ring ring-[3px] ring-ring/50',
                        )}
                    >
                        <img
                            src={previewUrl}
                            alt="Selected image preview"
                            className={cn(
                                'w-full object-cover',
                                aspectClassName,
                            )}
                        />
                        <div
                            className={cn(
                                'absolute inset-0 flex items-center justify-center gap-2 bg-black/60 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
                                isDraggingOver ? 'opacity-100' : 'opacity-0',
                            )}
                        >
                            {isDraggingOver ? (
                                <span className="flex items-center gap-2 text-sm font-medium text-white">
                                    <UploadCloud className="size-5" />
                                    Drop to replace
                                </span>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={openFilePicker}
                                        disabled={disabled}
                                    >
                                        <ImageUp className="size-4" />
                                        Replace
                                    </Button>
                                    {value && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={clearSelectedImage}
                                        >
                                            <Trash2 className="size-4" />
                                            Remove
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={disabled}
                        className={cn(
                            'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-center transition-colors hover:border-ring hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                            aspectClassName,
                            isDraggingOver && 'border-ring bg-muted/60',
                        )}
                    >
                        <UploadCloud
                            className={cn(
                                'size-7 transition-colors',
                                isDraggingOver
                                    ? 'text-foreground'
                                    : 'text-muted-foreground',
                            )}
                        />
                        <span className="text-sm font-medium">
                            {isDraggingOver
                                ? 'Drop to upload'
                                : 'Choose image or drag and drop'}
                        </span>
                        {hint && (
                            <span className="text-xs text-muted-foreground">
                                {hint}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {value && (
                <p className="truncate text-xs text-muted-foreground">
                    {value.name}
                </p>
            )}

            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
        </div>
    );
}
