const NEPAL_COUNTRY_CODE = '977';
const NEPAL_NATIONAL_LENGTH = 10;

export function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
            {...props}
        >
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
        </svg>
    );
}

/**
 * Build a wa.me link, or null when the number is unusable. Numbers are stored
 * country-code first (e.g. `9779740820005`), but rows written before that
 * normalization may still hold a bare 10-digit Nepali number.
 */
function buildWhatsappHref(
    mobileNumber: string | null | undefined,
): string | null {
    const digits = (mobileNumber ?? '').replace(/\D/g, '');

    if (digits.length === 0) {
        return null;
    }

    const withCountryCode =
        digits.length === NEPAL_NATIONAL_LENGTH
            ? `${NEPAL_COUNTRY_CODE}${digits}`
            : digits;

    return `https://wa.me/${withCountryCode}`;
}

/**
 * A WhatsApp icon linking to a chat with `name`. When no usable number exists
 * it renders a muted, unclickable placeholder of identical size, so table rows
 * keep their height and columns stay aligned.
 */
export function WhatsappContactAction({
    name,
    mobileNumber,
}: {
    name: string;
    mobileNumber: string | null;
}) {
    const href = buildWhatsappHref(mobileNumber);
    const iconClasses =
        'inline-flex size-8 items-center justify-center rounded-md transition-colors';

    if (href === null) {
        return (
            <span
                aria-disabled="true"
                title={`No mobile number on file for ${name}`}
                className={`${iconClasses} cursor-not-allowed text-muted-foreground/40`}
                data-test="whatsapp-contact-disabled"
            >
                <WhatsappIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">WhatsApp unavailable for {name}</span>
            </span>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            title={`Contact ${name} on WhatsApp`}
            className={`${iconClasses} text-[#25D366] hover:bg-muted hover:text-[#20bd5a]`}
            data-test="whatsapp-contact-link"
        >
            <WhatsappIcon className="size-4" aria-hidden="true" />
            <span className="sr-only">Contact {name} on WhatsApp</span>
        </a>
    );
}
