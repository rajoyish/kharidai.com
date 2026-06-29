import {
    StarterKit,
    TaskItem,
    TaskList,
    TiptapImage,
    TiptapLink,
    TiptapUnderline,
    TextStyle,
    Color,
    HighlightExtension,
    HorizontalRule,
    Placeholder,
} from 'novel';
import { Markdown } from 'tiptap-markdown';

const placeholder = Placeholder.configure({
    placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
        }
        return 'Press "/" for commands, or start typing...';
    },
    includeChildren: true,
});

export const defaultExtensions = [
    StarterKit.configure({
        bulletList: {
            HTMLAttributes: {
                class: 'list-disc list-outside leading-3 -mt-2',
            },
        },
        orderedList: {
            HTMLAttributes: {
                class: 'list-decimal list-outside leading-3 -mt-2',
            },
        },
        listItem: {
            HTMLAttributes: {
                class: 'leading-normal -mb-2',
            },
        },
        blockquote: {
            HTMLAttributes: {
                class: 'border-l-4 border-primary border-stone-700',
            },
        },
        codeBlock: {
            HTMLAttributes: {
                class: 'rounded-md bg-stone-100 p-5 font-mono font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-100',
            },
        },
        code: {
            HTMLAttributes: {
                class: 'rounded-md bg-stone-200 px-1.5 py-1 font-mono font-medium text-stone-900 dark:bg-stone-800 dark:text-stone-100',
                spellcheck: 'false',
            },
        },
        horizontalRule: false,
        dropcursor: {
            color: '#DBEAFE',
            width: 4,
        },
    }),
    placeholder,
    TiptapLink.configure({
        HTMLAttributes: {
            class: 'text-stone-400 underline underline-offset-[3px] hover:text-stone-600 transition-colors cursor-pointer',
        },
    }),
    TiptapImage.configure({
        allowBase64: true,
        HTMLAttributes: {
            class: 'rounded-lg border border-stone-200',
        },
    }),
    TaskList.configure({
        HTMLAttributes: {
            class: 'not-prose pl-2',
        },
    }),
    TaskItem.configure({
        HTMLAttributes: {
            class: 'flex items-start my-4',
        },
        nested: true,
    }),
    TiptapUnderline,
    TextStyle,
    Color,
    HighlightExtension.configure({
        multicolor: true,
    }),
    HorizontalRule.configure({
        HTMLAttributes: {
            class: 'mt-4 mb-6 border-t border-stone-300 dark:border-stone-700',
        },
    }),
    Markdown,
];
