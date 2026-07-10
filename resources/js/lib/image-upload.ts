export type ImageDimensions = {
    width: number;
    height: number;
};

/**
 * Default ceiling for any image picked through `ImageUpload`. The server rules
 * are looser (2 MB for products, 10 MB for hero images); this keeps uploads
 * small enough to stay snappy on the storefront.
 */
export const IMAGE_UPLOAD_MAX_BYTES = 1024 * 1024;

export type ImageConstraints = {
    /** Maximum accepted file size, in bytes. */
    maxSizeBytes?: number;
    /** Exact pixel size the image must have. */
    requiredDimensions?: ImageDimensions;
};

/**
 * The subset of a `File` the rules care about. `dimensions` is only read when
 * the constraints demand an exact size, since measuring one costs a decode.
 */
export type ImageCandidate = {
    type: string;
    size: number;
    dimensions?: ImageDimensions;
};

export function formatFileSize(bytes: number): string {
    const megabytes = bytes / (1024 * 1024);

    if (megabytes >= 1) {
        return `${Number(megabytes.toFixed(megabytes % 1 === 0 ? 0 : 1))} MB`;
    }

    return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Why a chosen image cannot be uploaded, or null when it is acceptable. These
 * mirror the server-side rules so an editor gets feedback without a round trip;
 * the server remains the authority.
 */
export function imageRejectionReason(
    candidate: ImageCandidate,
    constraints: ImageConstraints = {},
): string | null {
    if (!candidate.type.startsWith('image/')) {
        return 'Only image files can be uploaded.';
    }

    if (constraints.maxSizeBytes && candidate.size > constraints.maxSizeBytes) {
        return `Image must be under ${formatFileSize(constraints.maxSizeBytes)}.`;
    }

    const required = constraints.requiredDimensions;

    if (required && candidate.dimensions) {
        const { width, height } = candidate.dimensions;

        if (width !== required.width || height !== required.height) {
            return `Image must be exactly ${required.width}x${required.height}px. Selected image is ${width}x${height}px.`;
        }
    }

    return null;
}
