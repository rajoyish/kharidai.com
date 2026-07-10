import { Form, router, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';

import {
    dismiss as dismissMobileNumberPrompt,
    update as updateMobileNumber,
} from '@/actions/App/Http/Controllers/Settings/MobileNumberController';
import InputError from '@/components/input-error';
import { MobileNumberInput } from '@/components/mobile-number-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { PageProps } from '@/types';

/**
 * Banner prompting authenticated users who have no mobile number on file to
 * supply a WhatsApp-reachable one.
 *
 * Visibility is driven entirely by the `requiresMobileNumber` prop shared from
 * `HandleInertiaRequests`, so it re-evaluates on every Inertia response.
 * Dismissal is recorded in the Laravel session rather than the browser, because
 * a browser-side flag would outlive a logout and leave the next user of that
 * tab unprompted.
 */
export function MobileNumberPrompt() {
    const { requiresMobileNumber } = usePage<PageProps>().props;

    if (!requiresMobileNumber) {
        return null;
    }

    const dismiss = () => {
        router.post(
            dismissMobileNumberPrompt.url(),
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <div className="px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
            <div
                role="region"
                aria-label="Add your WhatsApp number"
                className="relative w-full max-w-xl rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40"
                data-test="mobile-number-prompt"
            >
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={dismiss}
                    aria-label="Dismiss"
                    data-test="mobile-number-prompt-dismiss"
                    className="absolute top-2 right-2 size-7 text-muted-foreground"
                >
                    <X className="size-4" />
                </Button>

                <p className="pr-9 font-medium">Add your WhatsApp number</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    We use it to reach you about your orders and support
                    requests.
                </p>

                <Form
                    {...updateMobileNumber.form()}
                    options={{ preserveScroll: true }}
                    className="mt-3"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                <div className="flex-1">
                                    <Label
                                        htmlFor="prompt_mobile_number"
                                        className="sr-only"
                                    >
                                        Mobile number
                                    </Label>

                                    <MobileNumberInput
                                        id="prompt_mobile_number"
                                        name="mobile_number"
                                        autoComplete="tel"
                                        required
                                        placeholder="98XXXXXXXX or +1 555 123 4567"
                                    />
                                </div>

                                <Button
                                    disabled={processing}
                                    data-test="mobile-number-prompt-submit"
                                >
                                    Save
                                </Button>
                            </div>

                            <InputError
                                className="mt-2"
                                message={errors.mobile_number}
                            />
                        </>
                    )}
                </Form>
            </div>
        </div>
    );
}
