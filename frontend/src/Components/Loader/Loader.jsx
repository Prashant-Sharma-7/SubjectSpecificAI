import { Player } from "@lottiefiles/react-lottie-player";
import "./Loader.css";

export default function Loader({ text = "Loading..." }) {
    return (
        <div className="loader-container">
            <div className="loader-box">
                
                <Player
                    autoplay
                    loop
                    src="/loadingHand.json"
                    className="loader-animation"
                />
                <p className="loader-text">{text}</p>
            </div>
        </div>
    );
}