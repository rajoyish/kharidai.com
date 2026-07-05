import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ServiceBriefForm({
    brief,
    setBrief,
}: {
    brief: string;
    setBrief: (value: string) => void;
}) {
    return (
        <div className="mb-6 rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Service Requirements</h3>
            <p className="mb-4 text-sm text-muted-foreground">
                Please provide any specific requirements, ideas, or files you want us to know about before we start working on your service.
            </p>
            <div className="grid gap-2">
                <Label htmlFor="brief">Brief Information <span className="text-destructive">*</span></Label>
                <Textarea
                    id="brief"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Describe your requirements here..."
                    rows={5}
                    required
                />
            </div>
        </div>
    );
}
