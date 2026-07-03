import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';

interface ImageLightboxProps {
    open: boolean;
    close: () => void;
    slides: { src: string }[];
    index?: number;
}

export default function ImageLightbox({
    open,
    close,
    slides,
    index = 0,
}: ImageLightboxProps) {
    return (
        <Lightbox open={open} close={close} slides={slides} index={index} plugins={[Zoom]} />
    );
}
