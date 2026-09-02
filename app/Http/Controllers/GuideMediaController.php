<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\StoresSeoFriendlyImages;
use App\Models\GuideMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The private half of the media gallery, for images inside delivery guides.
 *
 * Uploads land on the `local` disk, which has no URL and no symlink out of the
 * web root, so the only way back to a file is `show()` below — and that asks
 * the policy first. The admin actions are registered under `/admin`; `show` is
 * not, because the buyer who paid for the guide has to reach it too.
 */
class GuideMediaController extends Controller
{
    use StoresSeoFriendlyImages;

    /**
     * The disk these files live on. Anything web-readable defeats the point.
     */
    private const DISK = 'local';

    private const DIRECTORY = 'guide-media';

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage', GuideMedia::class) === true, 403);

        return response()->json(GuideMedia::latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage', GuideMedia::class) === true, 403);

        $request->validate([
            'file' => 'required|image|max:10240', // 10MB max
        ]);

        $file = $request->file('file');
        $path = $this->storeImageWithSeoName($file, self::DIRECTORY, null, self::DISK);

        if ($path === false) {
            abort(500, 'Failed to store the uploaded file.');
        }

        return response()->json(GuideMedia::create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'disk' => self::DISK,
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize() ?: 0,
        ]));
    }

    public function destroy(Request $request, GuideMedia $guideMedia): JsonResponse
    {
        abort_unless($request->user()?->can('manage', GuideMedia::class) === true, 403);

        Storage::disk($guideMedia->disk)->delete($guideMedia->file_path);
        $guideMedia->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Serve the file to someone entitled to see it.
     *
     * `private` on the way out, because the response is one person's to cache.
     * A shared cache that kept a copy would answer the next request for the
     * same URL from anybody, which is the leak this whole path exists to close.
     */
    public function show(Request $request, GuideMedia $guideMedia): StreamedResponse
    {
        abort_unless($request->user()?->can('view', $guideMedia) === true, 403);

        $disk = Storage::disk($guideMedia->disk);

        abort_unless($disk->exists($guideMedia->file_path), 404);

        return $disk->response($guideMedia->file_path, $guideMedia->file_name, [
            'Content-Type' => $guideMedia->mime_type,
            'Cache-Control' => 'private, max-age=300, no-transform',
        ], 'inline');
    }
}
