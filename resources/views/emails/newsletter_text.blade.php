{{--
    Raw, not escaped: this is the text/plain part, where nothing renders markup.
    Blade's `{{ }}` would turn an ampersand in a name or subject into `&amp;` and
    deliver it that way, which is exactly what a personalised greeting like
    "Ram & Sons" hits.
--}}
{!! $subject !!}

{!! $bodyText !!}

--
{{ config('app.name') }}
{{ config('app.url') }}
