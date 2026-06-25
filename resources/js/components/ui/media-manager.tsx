import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, Trash2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        } catch (error) {
            toast.error('Failed to load media');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch('/admin/media', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': token || '',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Upload failed');
            }
            
            const newMedia = await response.json();
            setMediaList([newMedia, ...mediaList]);
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
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(`/admin/media/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': token || '',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Delete failed');
            
            setMediaList(mediaList.filter(m => m.id !== id));
            toast.success('Image deleted');
        } catch (error) {
            toast.error('Failed to delete image');
        }
    };

    const handleCopy = (media: Media) => {
        // Construct absolute URL
        const absoluteUrl = new URL(media.url, window.location.origin).href;
        // Construct markdown image format
        const markdownFormat = `![${media.file_name}](${absoluteUrl})`;
        navigator.clipboard.writeText(markdownFormat);
        toast.success('Markdown image link copied to clipboard');
    };

    return (
        <div className="flex flex-col space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow mt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold leading-none tracking-tight">Media Gallery</h3>
                    <p className="text-sm text-muted-foreground mt-1">Upload images to use in your product description</p>
                </div>
                <div>
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
                    >
                        {isUploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <UploadCloud className="mr-2 h-4 w-4" />
                        )}
                        Upload Image
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 max-h-[400px] overflow-y-auto pr-2 mt-4">
                {isLoading ? (
                    <div className="col-span-full flex h-24 items-center justify-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : mediaList.length === 0 ? (
                    <div className="col-span-full flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                        No images uploaded yet.
                    </div>
                ) : (
                    mediaList.map((media) => (
                        <div key={media.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                            <img 
                                src={media.url} 
                                alt={media.file_name} 
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                                <Button 
                                    type="button"
                                    size="sm" 
                                    variant="secondary" 
                                    onClick={() => handleCopy(media)}
                                    title="Copy Markdown"
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Link
                                </Button>
                                <Button 
                                    type="button"
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => handleDelete(media.id)}
                                    title="Delete"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
