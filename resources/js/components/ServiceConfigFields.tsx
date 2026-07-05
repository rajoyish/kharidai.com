import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function ServiceConfigFields({ data, setData, errors }: any) {
    const strategyOptions = [
        { value: '', label: 'Select a pricing strategy' },
        { value: 'per_hour', label: 'Per hour' },
        { value: 'per_page', label: 'Per page (cover / inner)' },
        { value: 'tiered', label: 'Tiered packages' },
        { value: 'hybrid', label: 'Hybrid (tiers + hourly)' },
    ];

    const advanceTypeOptions = [
        { value: 'percent', label: 'Percentage of estimate' },
        { value: 'fixed', label: 'Fixed amount' },
    ];

    const updateConfig = (key: string, value: any) => {
        setData('pricing_config', { ...data.pricing_config, [key]: value });
    };

    const addTier = () => {
        const tiers = data.pricing_config?.tiers || [];
        updateConfig('tiers', [...tiers, { key: '', label: '', price_npr: '' }]);
    };

    const updateTier = (index: number, key: string, value: any) => {
        const tiers = [...(data.pricing_config?.tiers || [])];
        tiers[index] = { ...tiers[index], [key]: value };
        updateConfig('tiers', tiers);
    };

    const removeTier = (index: number) => {
        const tiers = [...(data.pricing_config?.tiers || [])];
        tiers.splice(index, 1);
        updateConfig('tiers', tiers);
    };

    const showTiers = data.pricing_strategy === 'tiered' || data.pricing_strategy === 'hybrid';
    const showHourlyRate = data.pricing_strategy === 'per_hour' || data.pricing_strategy === 'hybrid';
    const showPerPage = data.pricing_strategy === 'per_page';

    return (
        <div className="grid gap-6 rounded-lg border p-4 bg-muted/20 mt-4">
            <h3 className="font-medium">Service Configuration</h3>
            
            <div className="grid gap-2">
                <Label htmlFor="pricing_strategy">Pricing Strategy</Label>
                <select
                    id="pricing_strategy"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:outline-none"
                    value={data.pricing_strategy}
                    onChange={(e) => setData('pricing_strategy', e.target.value)}
                >
                    {strategyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {errors.pricing_strategy && <div className="text-sm text-destructive">{errors.pricing_strategy}</div>}
            </div>

            {data.pricing_strategy && (
                <div className="grid gap-4 border-l-2 pl-4 py-2 border-primary/20">
                    {showHourlyRate && (
                        <div className="grid gap-2">
                            <Label htmlFor="hourly_rate_npr">Hourly Rate (NPR)</Label>
                            <Input
                                id="hourly_rate_npr"
                                type="number"
                                min="0"
                                value={data.pricing_config?.hourly_rate_npr || ''}
                                onChange={(e) => updateConfig('hourly_rate_npr', e.target.value)}
                            />
                            {errors['pricing_config.hourly_rate_npr'] && <div className="text-sm text-destructive">{errors['pricing_config.hourly_rate_npr']}</div>}
                        </div>
                    )}

                    {showPerPage && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cover_rate_npr">Cover Page Rate (NPR)</Label>
                                <Input
                                    id="cover_rate_npr"
                                    type="number"
                                    min="0"
                                    value={data.pricing_config?.cover_rate_npr || ''}
                                    onChange={(e) => updateConfig('cover_rate_npr', e.target.value)}
                                />
                                {errors['pricing_config.cover_rate_npr'] && <div className="text-sm text-destructive">{errors['pricing_config.cover_rate_npr']}</div>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="inner_rate_npr">Inner Page Rate (NPR)</Label>
                                <Input
                                    id="inner_rate_npr"
                                    type="number"
                                    min="0"
                                    value={data.pricing_config?.inner_rate_npr || ''}
                                    onChange={(e) => updateConfig('inner_rate_npr', e.target.value)}
                                />
                                {errors['pricing_config.inner_rate_npr'] && <div className="text-sm text-destructive">{errors['pricing_config.inner_rate_npr']}</div>}
                            </div>
                        </div>
                    )}

                    {showTiers && (
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between">
                                <Label>Tiers / Packages</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addTier}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Tier
                                </Button>
                            </div>
                            {errors['pricing_config.tiers'] && <div className="text-sm text-destructive">{errors['pricing_config.tiers']}</div>}
                            
                            {(data.pricing_config?.tiers || []).map((tier: any, index: number) => (
                                <div key={index} className="flex items-start gap-2 border p-3 rounded-md bg-background">
                                    <div className="grid flex-1 gap-4 grid-cols-1 md:grid-cols-3">
                                        <div>
                                            <Label className="text-xs mb-1 block">Key (e.g. basic)</Label>
                                            <Input 
                                                value={tier.key} 
                                                onChange={(e) => updateTier(index, 'key', e.target.value)}
                                            />
                                            {errors[`pricing_config.tiers.${index}.key`] && <div className="text-xs text-destructive mt-1">{errors[`pricing_config.tiers.${index}.key`]}</div>}
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1 block">Label (e.g. Basic Package)</Label>
                                            <Input 
                                                value={tier.label} 
                                                onChange={(e) => updateTier(index, 'label', e.target.value)}
                                            />
                                            {errors[`pricing_config.tiers.${index}.label`] && <div className="text-xs text-destructive mt-1">{errors[`pricing_config.tiers.${index}.label`]}</div>}
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1 block">Price (NPR)</Label>
                                            <Input 
                                                type="number" min="0" 
                                                value={tier.price_npr} 
                                                onChange={(e) => updateTier(index, 'price_npr', e.target.value)}
                                            />
                                            {errors[`pricing_config.tiers.${index}.price_npr`] && <div className="text-xs text-destructive mt-1">{errors[`pricing_config.tiers.${index}.price_npr`]}</div>}
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive mt-5" onClick={() => removeTier(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {(data.pricing_config?.tiers || []).length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                                    No tiers added. Add at least one tier.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="grid gap-4">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="requires_brief"
                            checked={data.requires_brief}
                            onCheckedChange={(checked) => setData('requires_brief', checked)}
                        />
                        <Label htmlFor="requires_brief">Requires a project brief from client</Label>
                    </div>
                    {errors.requires_brief && <div className="text-sm text-destructive">{errors.requires_brief}</div>}

                    <div className="flex items-center gap-2">
                        <Switch
                            id="requires_contract"
                            checked={data.requires_contract}
                            onCheckedChange={(checked) => setData('requires_contract', checked)}
                        />
                        <Label htmlFor="requires_contract">Requires a signed contract before starting</Label>
                    </div>
                    {errors.requires_contract && <div className="text-sm text-destructive">{errors.requires_contract}</div>}
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="delivery_days">Estimated Delivery Time (Days)</Label>
                        <Input
                            id="delivery_days"
                            type="number"
                            min="0"
                            placeholder="e.g. 7"
                            value={data.delivery_days}
                            onChange={(e) => setData('delivery_days', e.target.value)}
                        />
                        {errors.delivery_days && <div className="text-sm text-destructive">{errors.delivery_days}</div>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="revisions">Included Revisions</Label>
                        <Input
                            id="revisions"
                            type="number"
                            min="0"
                            placeholder="e.g. 3"
                            value={data.revisions}
                            onChange={(e) => setData('revisions', e.target.value)}
                        />
                        {errors.revisions && <div className="text-sm text-destructive">{errors.revisions}</div>}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                    <Switch
                        id="requires_advance"
                        checked={data.requires_advance}
                        onCheckedChange={(checked) => setData('requires_advance', checked)}
                    />
                    <Label htmlFor="requires_advance">Requires an advance payment</Label>
                </div>
                {errors.requires_advance && <div className="text-sm text-destructive">{errors.requires_advance}</div>}

                {data.requires_advance && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-l-2 pl-4 py-2 border-primary/20">
                        <div className="grid gap-2">
                            <Label htmlFor="advance_type">Advance Type</Label>
                            <select
                                id="advance_type"
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:outline-none"
                                value={data.advance_type}
                                onChange={(e) => setData('advance_type', e.target.value)}
                            >
                                {advanceTypeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {errors.advance_type && <div className="text-sm text-destructive">{errors.advance_type}</div>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="advance_value">
                                {data.advance_type === 'percent' ? 'Advance Percentage (%)' : 'Advance Amount (NPR)'}
                            </Label>
                            <Input
                                id="advance_value"
                                type="number"
                                min="0"
                                max={data.advance_type === 'percent' ? '100' : undefined}
                                value={data.advance_value}
                                onChange={(e) => setData('advance_value', e.target.value)}
                            />
                            {errors.advance_value && <div className="text-sm text-destructive">{errors.advance_value}</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
