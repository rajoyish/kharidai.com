import { useForm, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PageProps } from '@/types';

interface SupportChatProps {
    order: any;
    postUrl: string;
}

export function SupportChat({ order, postUrl }: SupportChatProps) {
    const { auth } = usePage<PageProps>().props;
    const { data, setData, post, processing, reset } = useForm({
        message: '',
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isLocalOnline, setIsLocalOnline] = useState(false);
    const [isGlobalAdminOnline, setIsGlobalAdminOnline] = useState(false);

    const isOnline = isLocalOnline || (!auth.user.is_admin && isGlobalAdminOnline);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [order.messages]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo) {
            try {
                const channel = window.Echo.join(`orders.${order.id}`)
                    .here((users: any[]) => {
                        setIsLocalOnline(
                            users.some((u) => u.is_admin !== auth.user.is_admin),
                        );
                    })
                    .joining((user: any) => {
                        if (user.is_admin !== auth.user.is_admin) {
setIsLocalOnline(true);
}
                    })
                    .leaving((user: any) => {
                        if (user.is_admin !== auth.user.is_admin) {
setIsLocalOnline(false);
}
                    })
                    .listen('OrderMessageCreated', () => {
                        router.reload({ only: ['order'] });
                    });

                let supportChannel: any;

                if (!auth.user.is_admin) {
                    supportChannel = window.Echo.join('support')
                        .here((users: any[]) => {
                            setIsGlobalAdminOnline(users.some((u) => u.is_admin));
                        })
                        .joining((user: any) => {
                            if (user.is_admin) {
setIsGlobalAdminOnline(true);
}
                        })
                        .leaving((user: any) => {
                            if (user.is_admin) {
setIsGlobalAdminOnline(false);
}
                        });
                }

                return () => {
                    if (window.Echo) {
                        channel.stopListening('OrderMessageCreated');
                        window.Echo.leave(`orders.${order.id}`);

                        if (supportChannel) {
                            window.Echo.leave('support');
                        }
                    }
                };
            } catch (error) {
                console.warn('Real-time chat is unavailable:', error);
            }
        }
    }, [order.id, auth.user.is_admin]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) {
e.preventDefault();
}

        post(postUrl, {
            preserveScroll: true,
            onSuccess: () => reset('message'),
        });
    };

    return (
        <div className="flex h-125 flex-col rounded-xl border bg-card p-6">
            <div className="mb-4 flex flex-shrink-0 items-start justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Support Chat</h2>
                    <a
                        href="https://wa.me/9779740820005"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1 text-sm text-green-600 hover:underline dark:text-green-500"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-whatsapp"
                            viewBox="0 0 16 16"
                        >
                            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
                        </svg>
                        WhatsApp Support
                    </a>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                    <div
                        className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                    ></div>
                    <span
                        className={
                            isOnline
                                ? 'font-medium text-green-600 dark:text-green-500'
                                : 'text-gray-500 dark:text-gray-400'
                        }
                    >
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2">
                {order.messages.map((msg: any) => {
                    const isMine = msg.user_id === auth.user.id;

                    return (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${!isMine ? 'items-start' : 'items-end'}`}
                        >
                            <span className="mx-1 mb-1 text-xs text-muted-foreground">
                                {!isMine
                                    ? (msg.user.is_admin ? 'Support Admin' : 'Customer')
                                    : 'You'}{' '}
                                -{' '}
                                {new Date(msg.created_at).toLocaleTimeString(
                                    [],
                                    {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    },
                                )}
                            </span>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                    !isMine
                                        ? 'rounded-tl-sm bg-secondary text-secondary-foreground'
                                        : 'rounded-tr-sm bg-primary text-primary-foreground'
                                }`}
                            >
                                {msg.message}
                            </div>
                        </div>
                    );
                })}
                {order.messages.length === 0 && (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No messages yet.
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form
                onSubmit={handleSendMessage}
                className="mt-auto flex flex-shrink-0 gap-2 border-t pt-4"
            >
                <Textarea
                    value={data.message}
                    onChange={(e) => setData('message', e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();

                            if (!processing && data.message.trim()) {
                                handleSendMessage();
                            }
                        }
                    }}
                    placeholder="Type your message..."
                    className="min-h-15 resize-none"
                />
                <Button
                    type="submit"
                    disabled={processing || !data.message.trim()}
                    className="h-15 px-8"
                >
                    Send
                </Button>
            </form>
        </div>
    );
}
