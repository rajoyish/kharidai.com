import { Copy, Images, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const galleryGridClassName =
    'grid max-h-[60vh] w-full grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] content-start gap-3 overflow-x-hidden overflow-y-auto pr-1';

interface Media {
    id: number;
    file_name: string;
    url: string;
}

export function MediaManager() {
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [hasLoadedMedia, setHasLoadedMedia] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMedia = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch('/admin/media');
            const data = await response.json();
            setMediaList(data);
        } catch {
            toast.error('Failed to load media');
        } finally {
            setHasLoadedMedia(true);
            setIsLoading(false);
        }
    }, []);

    const handleOpenChange = (open: boolean) => {
        if (open && !hasLoadedMedia && !isLoading) {
            void fetchMedia();
        }
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
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
            setHasLoadedMedia(true);
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
        <Dialog onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start sm:w-fit"
                >
                    <Images className="size-4" />
                    <span className="min-w-0 truncate">Media Gallery</span>
                    {hasLoadedMedia && (
                        <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:ml-1">
                            {mediaList.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
                <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
                    <DialogTitle>Media Gallery</DialogTitle>
                    <DialogDescription>
                        {isLoading
                            ? 'Loading images...'
                            : `${mediaList.length} ${mediaList.length === 1 ? 'image' : 'images'}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h3 className="text-sm font-medium leading-none">
                                Attachments
                            </h3>
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

                    {isLoading || !hasLoadedMedia ? (
                        <div className={galleryGridClassName}>
                            {Array.from({ length: 8 }).map((_, index) => (
                                <Skeleton
                                    key={index}
                                    className="aspect-square w-full rounded-lg"
                                />
                            ))}
                        </div>
                    ) : mediaList.length === 0 ? (
                        <div className="flex h-36 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                            No images uploaded yet.
                        </div>
                    ) : (
                        <TooltipProvider>
                            <AttachmentGroup className={galleryGridClassName}>
                                {mediaList.map((media) => (
                                    <Attachment
                                        key={media.id}
                                        size="xs"
                                        orientation="vertical"
                                        className="w-full! min-w-0 has-data-[slot=attachment-content]:w-full!"
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
                                                            handleDelete(
                                                                media.id,
                                                            )
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
            </DialogContent>
        </Dialog>
    );
}
