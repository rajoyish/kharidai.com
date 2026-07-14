@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
{{--
    A PNG, not the app-logo.tsx SVG it was rendered from: Gmail and Outlook strip
    <svg> from email outright, so the logo has to be a raster image. Rendered at 2x
    (420x96) and displayed at 210x48 so it stays sharp on retina screens.

    Referenced by cid, not by URL: a URL would have to be publicly reachable for
    Gmail's image proxy to fetch it, which http://localhost never is — the logo
    would arrive broken in every email sent from a dev machine. The cid resolves
    against an image embedded in the message itself, so it renders identically
    from localhost and from production.

    AppServiceProvider embeds that image into every outgoing message, so this cid
    resolves for any mail we send without each Mailable having to remember to.
--}}
<img src="cid:logo" width="210" height="48" alt="{{ config('app.name') }}" style="max-width: 210px; height: auto; border: none;">
</a>
</td>
</tr>
