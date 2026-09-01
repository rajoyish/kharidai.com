import React from 'react';
import {
    EditorRoot,
    EditorContent,
    EditorCommand,
    EditorCommandEmpty,
    EditorCommandList,
    EditorCommandItem,
    handleCommandNavigation,
    EditorInstance,
    JSONContent,
} from 'novel';
import { store as storeMedia } from '@/actions/App/Http/Controllers/MediaController';
import { cn } from '@/lib/utils';
import { defaultExtensions } from './extensions';
import { slashCommand, suggestionItems } from './slash-command';

interface NovelEditorProps {
    initialValue?: string | JSONContent;
    onChange: (html: string) => void;
    className?: string;
    /** Extra classes for the inner ProseMirror content, e.g. a smaller min-height. */
    contentClassName?: string;
    /**
     * Handed the editor once it exists, so a control outside it can drive the
     * document. The editor's own context stops at EditorRoot, and a toolbar in a
     * sibling card cannot reach it any other way.
     */
    onReady?: (editor: EditorInstance) => void;
}

const uploadFileToMedia = async (file: File, view: any) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    try {
        const response = await fetch(storeMedia.url(), {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRF-TOKEN': token || '',
                'Accept': 'application/json',
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            const node = view.state.schema.nodes.image.create({ src: data.url, alt: file.name });
            const tr = view.state.tr.replaceSelectionWith(node);
            view.dispatch(tr);
        }
    } catch (error) {
        console.error('Image upload failed', error);
    }
};

export default function NovelEditor({
    initialValue,
    onChange,
    className,
    contentClassName,
    onReady,
}: NovelEditorProps) {
    const extensions = [...defaultExtensions, slashCommand];

    return (
        <EditorRoot>
            <EditorContent
                className={cn(
                    'w-full min-h-100 resize-y overflow-y-auto border border-input rounded-md bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                    className,
                )}
                initialContent={typeof initialValue === 'string' ? undefined : initialValue}
                onCreate={({ editor }) => {
                    if (typeof initialValue === 'string' && initialValue) {
                        editor.commands.setContent(initialValue);
                    }

                    onReady?.(editor);
                }}
                extensions={extensions}
                onUpdate={({ editor }) => {
                    onChange(editor.getHTML());
                }}
                editorProps={{
                    attributes: {
                        class: cn(
                            'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-50',
                            contentClassName,
                        ),
                    },
                    handlePaste: (view, event) => {
                        const items = Array.from(event.clipboardData?.items || []);
                        const image = items.find(item => item.type.startsWith('image/'));
                        if (image) {
                            const file = image.getAsFile();
                            if (file) {
                                event.preventDefault();
                                uploadFileToMedia(file, view);
                                return true;
                            }
                        }

                        const text = event.clipboardData?.getData('text/plain');
                        if (text) {
                            const markdownImageRegex = /^!\[([^\]]*)\]\(([^)]+)\)$/;
                            const match = text.trim().match(markdownImageRegex);
                            if (match) {
                                event.preventDefault();
                                const alt = match[1];
                                const src = match[2];
                                const node = view.state.schema.nodes.image.create({ src, alt });
                                const tr = view.state.tr.replaceSelectionWith(node);
                                view.dispatch(tr);
                                return true;
                            }
                        }

                        return false;
                    },
                    handleDrop: (view, event, slice, moved) => {
                        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                            const file = event.dataTransfer.files[0];
                            if (file.type.startsWith('image/')) {
                                event.preventDefault();
                                uploadFileToMedia(file, view);
                                return true;
                            }
                        }
                        return false;
                    },
                    handleDOMEvents: {
                        keydown: (_view, event) => handleCommandNavigation(event),
                    },
                }}
            >
                <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
                    <EditorCommandEmpty className="px-2 text-muted-foreground">
                        No results
                    </EditorCommandEmpty>
                    <EditorCommandList>
                        {suggestionItems.map((item) => (
                            <EditorCommandItem
                                value={item.title}
                                onCommand={(val) => item.command!(val)}
                                onMouseDown={(e) => e.preventDefault()}
                                className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent-surface aria-selected:bg-accent-surface"
                                key={item.title}
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.description}
                                    </p>
                                </div>
                            </EditorCommandItem>
                        ))}
                    </EditorCommandList>
                </EditorCommand>
            </EditorContent>
        </EditorRoot>
    );
}
