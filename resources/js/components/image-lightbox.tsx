import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';

interface ImageLightboxProps {
    open: boolean;
    close: () => void;
    slides: { src: string }[];
}

export default function ImageLightbox({
    open,
    close,
    slides,
}: ImageLightboxProps) {
    return (
        <Lightbox open={open} close={close} slides={slides} plugins={[Zoom]} />
    );
}
