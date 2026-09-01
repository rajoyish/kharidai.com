import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export type NewsletterPlaceholder = {
    /** The tag as it is written in the body, braces included. */
    tag: string;
    description: string;
};

type NewsletterPlaceholdersProps = {
    placeholders: NewsletterPlaceholder[];
    onInsert: (tag: string) => void;
};

/**
 * The tag vocabulary, listed beside the editor and clickable straight into it.
 *
 * The list comes from the server rather than being written out here, so the tags
 * an admin is offered are exactly the ones the send knows how to resolve.
 */
export function NewsletterPlaceholders({
    placeholders,
    onInsert,
}: NewsletterPlaceholdersProps) {
    if (placeholders.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Available placeholders</CardTitle>
                <CardDescription>
                    Click one to drop it at the cursor. Each is replaced with
                    that person's own details as the newsletter goes out.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-0.5">
                {placeholders.map((placeholder) => (
                    <button
                        key={placeholder.tag}
                        type="button"
                        /*
                         * Keeps the editor's cursor where the admin left it. The
                         * default mousedown blurs the editor first, and the tag
                         * would land at the top of the body instead of in the
                         * sentence being written.
                         */
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onInsert(placeholder.tag)}
                        className="grid gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <code className="justify-self-start rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                            {placeholder.tag}
                        </code>
                        <span className="text-xs text-muted-foreground">
                            {placeholder.description}
                        </span>
                    </button>
                ))}
            </CardContent>
        </Card>
    );
}
