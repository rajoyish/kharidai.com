<?php

namespace App\Http\Controllers;

use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Media::latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|image|max:10240', // 10MB max
        ]);

        $file = $request->file('file');
        $path = $file->store('media', 'public');

        if ($path === false) {
            abort(500, 'Failed to store the uploaded file.');
        }

        $media = Media::create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'url' => Storage::disk('public')->url($path),
            'disk' => 'public',
        ]);

        return response()->json($media);
    }

    public function destroy(Media $media): JsonResponse
    {
        Storage::disk($media->disk)->delete($media->file_path);
        $media->delete();

        return response()->json(['success' => true]);
    }
}
