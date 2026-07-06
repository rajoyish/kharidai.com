import { ServiceConfigFields } from '../ServiceConfigFields';
import { ProductTypeSection } from './product-type-theme';
import type { ProductTypeTheme } from './product-type-theme';

type ServiceProductFieldsProps = {
    theme: ProductTypeTheme;
    data: any;
    setData: (key: string, value: any) => void;
    errors: Record<string, string>;
};

/**
 * Type-specific fieldset for service products. Unlike digital and physical
 * products, services drive real payload fields (pricing strategy, delivery,
 * advance terms), so this component wraps the existing {@link ServiceConfigFields}
 * inputs in the themed section — the field logic itself is untouched.
 */
export function ServiceProductFields({
    theme,
    data,
    setData,
    errors,
}: ServiceProductFieldsProps) {
    return (
        <ProductTypeSection
            theme={theme}
            title="Service configuration"
            description="Define how this service is priced, scoped, and delivered."
        >
            <ServiceConfigFields
                data={data}
                setData={setData}
                errors={errors}
            />
        </ProductTypeSection>
    );
}
