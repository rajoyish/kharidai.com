import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';

interface ImageLightboxProps {
    open: boolean;
    close: () => void;
    slides: { src: string; alt?: string }[];
    index?: number;
}

export default function ImageLightbox({
    open,
    close,
    slides,
    index = 0,
}: ImageLightboxProps) {
    return (
        <Lightbox
            open={open}
            close={close}
            slides={slides}
            index={index}
            plugins={[Fullscreen, Zoom]}
            // Screenshots of a settings screen are read, not glanced at, so the
            // zoom range is wider than the plugin's default 3x.
            zoom={{ maxZoomPixelRatio: 5, scrollToZoom: true }}
            carousel={{ finite: true }}
        />
    );
}
