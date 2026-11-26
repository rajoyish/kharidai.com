import { Icon } from 'lucide-react';
import type { IconNode, LucideIcon, LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

/** The outline of Lucide's `Receipt`, without its dollar sign. */
const RECEIPT_OUTLINE: IconNode = [
    [
        'path',
        {
            d: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z',
            key: 'receipt-outline',
        },
    ],
];

/**
 * Lucide's receipt with the Nepali rupee sign (रु.) where its dollar sign was.
 * Lucide has no NPR receipt (`ReceiptIndianRupee` shows ₹), so this keeps the
 * stock outline and swaps only the mark. Rendering through Lucide's own `Icon`
 * keeps the size and stroke of every other icon, and the component fits
 * wherever a `LucideIcon` is expected.
 *
 * The sign is filled text: a stroked outline would blur Devanagari at icon
 * sizes.
 */
export const ReceiptNpr = forwardRef<SVGSVGElement, LucideProps>(
    (props, ref) => (
        <Icon ref={ref} iconNode={RECEIPT_OUTLINE} {...props}>
            {/* Decorative: the label beside the icon names it, so screen
                readers must not announce the sign as part of that name. */}
            <text
                aria-hidden="true"
                x="12"
                y="15"
                textAnchor="middle"
                fontSize="12.5"
                fontWeight="700"
                fill="currentColor"
                stroke="none"
            >
                रु.
            </text>
        </Icon>
    ),
) as LucideIcon;

ReceiptNpr.displayName = 'ReceiptNpr';
