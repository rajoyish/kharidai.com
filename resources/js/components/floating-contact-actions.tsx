import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export const whatsappHref = 'https://wa.me/9779740820005';
export const messengerHref = 'https://m.me/kharidai';

export function shouldShowScrollUp(
    scrollY: number,
    viewportHeight: number,
): boolean {
    return scrollY > viewportHeight * 0.5;
}

export function FloatingContactActions() {
    const [shouldScrollUp, setShouldScrollUp] = useState(false);

    useEffect(() => {
        const updateScrollAction = () => {
            setShouldScrollUp(
                shouldShowScrollUp(window.scrollY, window.innerHeight),
            );
        };

        updateScrollAction();

        window.addEventListener('scroll', updateScrollAction, {
            passive: true,
        });
        window.addEventListener('resize', updateScrollAction);

        return () => {
            window.removeEventListener('scroll', updateScrollAction);
            window.removeEventListener('resize', updateScrollAction);
        };
    }, []);

    const handleScrollAction = () => {
        if (shouldScrollUp) {
            window.scrollTo({ top: 0, behavior: 'smooth' });

            return;
        }

        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth',
        });
    };

    return (
        <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3 sm:right-6 sm:bottom-6">
            <Button
                asChild
                size="icon"
                className="size-12 rounded-full border border-white/20 bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-[#20bd5a]"
            >
                <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Chat with Kharidai on WhatsApp"
                    data-test="floating-whatsapp"
                >
                    <WhatsappIcon className="size-5" />
                </a>
            </Button>

            <Button
                asChild
                size="icon"
                className="size-12 rounded-full border border-white/20 bg-[#0084FF] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-[#0072db]"
            >
                <a
                    href={messengerHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Chat with Kharidai on Messenger"
                    data-test="floating-messenger"
                >
                    <MessengerIcon className="size-5" />
                </a>
            </Button>

            <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleScrollAction}
                aria-label={shouldScrollUp ? 'Scroll to top' : 'Scroll down'}
                data-test="floating-scroll-toggle"
                className="size-12 rounded-full border-border/60 bg-background/95 shadow-lg shadow-black/15 backdrop-blur transition-transform hover:scale-105 hover:bg-background"
            >
                <ArrowUp
                    className={`size-5 transition-transform duration-300 ${shouldScrollUp ? 'rotate-0' : 'rotate-180'}`}
                />
            </Button>
        </div>
    );
}

function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
        </svg>
    );
}

function MessengerIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M0 7.76C0 3.301 3.493 0 8 0s8 3.301 8 7.76-3.493 7.76-8 7.76c-.81 0-1.586-.107-2.316-.307a.64.64 0 0 0-.427.03l-1.588.702a.64.64 0 0 1-.898-.566l-.044-1.423a.64.64 0 0 0-.215-.456C.956 12.108 0 10.092 0 7.76m5.546-1.459-2.35 3.728c-.225.358.214.761.551.506l2.525-1.916a.48.48 0 0 1 .578-.002l1.869 1.402a1.2 1.2 0 0 0 1.735-.32l2.35-3.728c.226-.358-.214-.761-.551-.506L9.728 7.381a.48.48 0 0 1-.578.002L7.281 5.98a1.2 1.2 0 0 0-1.735.32z" />
        </svg>
    );
}
