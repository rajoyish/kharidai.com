import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { WhatsappIcon } from '@/components/whatsapp-contact-action';

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

function MessengerIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
            {...props}
        >
            <path d="M0 7.76C0 3.301 3.493 0 8 0s8 3.301 8 7.76-3.493 7.76-8 7.76c-.81 0-1.586-.107-2.316-.307a.64.64 0 0 0-.427.03l-1.588.702a.64.64 0 0 1-.898-.566l-.044-1.423a.64.64 0 0 0-.215-.456C.956 12.108 0 10.092 0 7.76m5.546-1.459-2.35 3.728c-.225.358.214.761.551.506l2.525-1.916a.48.48 0 0 1 .578-.002l1.869 1.402a1.2 1.2 0 0 0 1.735-.32l2.35-3.728c.226-.358-.214-.761-.551-.506L9.728 7.381a.48.48 0 0 1-.578.002L7.281 5.98a1.2 1.2 0 0 0-1.735.32z" />
        </svg>
    );
}
