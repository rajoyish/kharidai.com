<x-mail::message>
{{--
    Raw, not escaped: the body is HTML the admin composed in the blog editor, and
    `{{ }}` inside a markdown mailable runs it through EncodedHtmlString, which
    would deliver the tags as visible text. The markdown layout passes raw HTML
    through untouched, so what the editor produced is what the mailbox renders.

    The body is admin-authored and admin-only — the composer sits behind the admin
    middleware — so this is not a path untrusted input can reach.
--}}
{!! $bodyHtml !!}
</x-mail::message>
