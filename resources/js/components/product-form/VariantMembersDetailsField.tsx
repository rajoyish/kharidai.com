import NovelEditor from '@/components/ui/editor/novel-editor';
import { Label } from '@/components/ui/label';

type VariantMembersDetailsFieldProps = {
    value: string;
    onChange: (html: string) => void;
    error?: string;
};

/**
 * Members-only details for one variant of a digital product. Left empty, the
 * variant shows the product's own members-only details, so an admin only fills
 * this in for the variants whose terms differ.
 */
export function VariantMembersDetailsField({
    value,
    onChange,
    error,
}: VariantMembersDetailsFieldProps) {
    return (
        <div className="grid gap-2">
            <Label htmlFor="hidden_description">Members-only details</Label>
            <p className="text-sm text-muted-foreground">
                Shown to signed-in customers when they pick this variant. Leave
                empty to show the product&apos;s members-only details instead.
            </p>
            <NovelEditor
                initialValue={value}
                onChange={onChange}
                className="min-h-50"
                contentClassName="min-h-25"
            />
            {error && (
                <div className="text-sm font-medium text-destructive">
                    {error}
                </div>
            )}
        </div>
    );
}
