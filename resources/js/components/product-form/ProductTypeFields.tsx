import { DigitalProductFields } from './DigitalProductFields';
import { PhysicalProductFields } from './PhysicalProductFields';
import { getProductTypeTheme } from './product-type-theme';
import { ServiceProductFields } from './ServiceProductFields';

type ProductTypeFieldsProps = {
    type: string;
    data: any;
    setData: (key: string, value: any) => void;
    errors: Record<string, string>;
};

/**
 * Renders only the fieldset relevant to the currently selected product type.
 * Swapping is driven purely by `type`, so changing the dropdown instantly
 * mounts the matching component and unmounts the others — no shared inputs
 * leak between types.
 */
export function ProductTypeFields({
    type,
    data,
    setData,
    errors,
}: ProductTypeFieldsProps) {
    const theme = getProductTypeTheme(type);

    switch (type) {
        case 'physical':
            return <PhysicalProductFields theme={theme} />;
        case 'service':
            return (
                <ServiceProductFields
                    theme={theme}
                    data={data}
                    setData={setData}
                    errors={errors}
                />
            );
        case 'digital':
        default:
            return <DigitalProductFields theme={theme} />;
    }
}
