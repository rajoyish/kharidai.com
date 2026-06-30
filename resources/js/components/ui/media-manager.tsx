import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentTitle,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Copy, Loader2, Trash2, UploadCloud } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Media {
    id: number;
    file_name: string;
    url: string;
}

export function MediaManager() {
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        try {
            const response = await fetch('/admin/media');
            const data = await response.json();
            setMediaList(data);
        } catch {
            toast.error('Failed to load media');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = document.head
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');

            const response = await fetch('/admin/media', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': token || '',
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Upload failed');
            }

            const newMedia = await response.json();
            setMediaList((currentMediaList) => [newMedia, ...currentMediaList]);
            toast.success('Image uploaded successfully');

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            const token = document.head
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');
            const response = await fetch(`/admin/media/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token || '',
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            setMediaList((currentMediaList) =>
                currentMediaList.filter((media) => media.id !== id),
            );
            toast.success('Image deleted');
        } catch {
            toast.error('Failed to delete image');
        }
    };

    const handleCopy = (media: Media) => {
        const absoluteUrl = new URL(media.url, window.location.origin).href;
        const markdownFormat = `![${media.file_name}](${absoluteUrl})`;
        navigator.clipboard.writeText(markdownFormat);
        toast.success('Markdown image link copied to clipboard');
    };

    return (
        <div className="mt-3 rounded-lg border bg-card text-card-foreground">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-none">
                        Media Gallery
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {mediaList.length} {mediaList.length === 1 ? 'image' : 'images'}
                    </p>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />
                <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                >
                    {isUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <UploadCloud className="size-4" />
                    )}
                    Upload Image
                </Button>
            </div>

            <div className="p-3 sm:p-4">
                {isLoading ? (
                    <div className="flex gap-3 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                                key={index}
                                className="h-24 w-24 shrink-0 rounded-lg"
                            />
                        ))}
                    </div>
                ) : mediaList.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                        No images uploaded yet.
                    </div>
                ) : (
                    <TooltipProvider>
                        <AttachmentGroup className="max-h-72 flex-wrap content-start gap-2 overflow-y-auto pr-1">
                            {mediaList.map((media) => (
                                <Attachment
                                    key={media.id}
                                    size="xs"
                                    orientation="vertical"
                                    className="w-[92px] sm:w-[104px]"
                                >
                                    <AttachmentMedia
                                        variant="image"
                                        className="w-full! rounded-md"
                                    >
                                        <img
                                            src={media.url}
                                            alt={media.file_name}
                                            loading="lazy"
                                        />
                                    </AttachmentMedia>
                                    <AttachmentContent>
                                        <AttachmentTitle>
                                            {media.file_name}
                                        </AttachmentTitle>
                                        <AttachmentDescription>
                                            Image
                                        </AttachmentDescription>
                                    </AttachmentContent>
                                    <AttachmentActions className="top-1 right-1 gap-1 opacity-100">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AttachmentAction
                                                    type="button"
                                                    size="icon"
                                                    variant="secondary"
                                                    className="size-7 bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
                                                    onClick={() =>
                                                        handleCopy(media)
                                                    }
                                                >
                                                    <Copy className="size-3.5" />
                                                    <span className="sr-only">
                                                        Copy Markdown
                                                    </span>
                                                </AttachmentAction>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Copy Markdown
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AttachmentAction
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    className="size-7 shadow-sm"
                                                    onClick={() =>
                                                        handleDelete(media.id)
                                                    }
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    <span className="sr-only">
                                                        Delete
                                                    </span>
                                                </AttachmentAction>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Delete
                                            </TooltipContent>
                                        </Tooltip>
                                    </AttachmentActions>
                                </Attachment>
                            ))}
                        </AttachmentGroup>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
}
