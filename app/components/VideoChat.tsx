// app/components/VideoChat.tsx
import { useEffect } from "react";

export default function VideoChat() {
    useEffect(() => {
        const signalingServer = new WebSocket('ws://omeletchat.pages.dev:3000');
        let localStream: any;
        let peerConnection: any;

        signalingServer.onmessage = async (message) => {
            const data = JSON.parse(message.data);
            if (data.offer) {
                await handleOffer(data.offer);
            } else if (data.answer) {
                await handleAnswer(data.answer);
            } else if (data.iceCandidate) {
                await handleIceCandidate(data.iceCandidate);
            }
        };

        async function handleOffer(offer: RTCSessionDescriptionInit) {
            console.log('Received offer:', offer);
            await createPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            signalingServer.send(JSON.stringify({ answer }));
        }

        async function handleAnswer(answer: RTCSessionDescriptionInit) {
            console.log('Received answer:', answer);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }

        async function handleIceCandidate(candidate: RTCIceCandidateInit | undefined) {
            console.log('Received ICE candidate:', candidate);
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }

        async function createPeerConnection() {
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' } // Use Google's STUN server
                ]
            };

            peerConnection = new RTCPeerConnection(configuration);

            localStream.getTracks().forEach((track: any) => {
                peerConnection.addTrack(track, localStream);
            });

            peerConnection.ontrack = (event: { streams: (MediaProvider | null)[]; }) => {
                const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
                remoteVideo.srcObject = event.streams[0];
            };

            peerConnection.onicecandidate = (event: { candidate: any; }) => {
                if (event.candidate) {
                    signalingServer.send(JSON.stringify({ iceCandidate: event.candidate }));
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                if (peerConnection.iceConnectionState === 'disconnected') {
                    handleDisconnect();
                }
            };
        }

        async function setupMediaStream() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
                localVideo.srcObject = localStream;
                document.getElementById('status')!.textContent = 'Waiting for someone to connect...';
                enableChat();
            } catch (err) {
                console.error('Error accessing media devices:', err);
                document.getElementById('status')!.textContent = 'Failed to access camera/microphone';
            }
        }

        function handleDisconnect() {
            const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
            remoteVideo.srcObject = null;
            document.getElementById('status')!.textContent = 'Disconnected. Click "Skip" to find someone new.';
            document.getElementById('endChat')!.setAttribute('disabled', 'true');
        }

        function enableChat() {
            document.getElementById('skipBtn')!.removeAttribute('disabled');
            document.getElementById('endChat')!.removeAttribute('disabled');
        }

        document.getElementById('skipBtn')!.addEventListener('click', () => {
            setupMediaStream();
            signalingServer.send(JSON.stringify({ skip: true }));
        });

        document.getElementById('endChat')!.addEventListener('click', () => {
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
            remoteVideo.srcObject = null;
            document.getElementById('status')!.textContent = 'Chat ended. Click "Skip" to find someone new.';
            document.getElementById('endChat')!.setAttribute('disabled', 'true');
        });

        // Start the media stream on component mount
        setupMediaStream();
    }, []);

    return (
        <div>
            <h1 className="logo">Omel<span>e</span>t</h1>
            <div className="video-container">
                <div className="video-wrapper">
                    <video id="localVideo" autoPlay muted playsInline></video>
                </div>
                <div className="video-wrapper">
                    <video id="remoteVideo" autoPlay playsInline></video>
                </div>
            </div>
            <div className="status" id="status">Initializing...</div>
            <div className="controls">
                <button className="btn btn-primary" id="skipBtn" disabled>Skip</button>
                <button className="btn btn-danger" id="endChat" disabled>End Chat</button>
            </div>
            <style jsx>{`
                /* Include your CSS styles here */
                .video-container {
                    max-width: 1200px;
                    margin: 2rem auto;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                .video-wrapper {
                    position: relative;
                    padding-top: 75%;
                    background: #000;
                    border-radius: 5px;
                    overflow: hidden;
                }
                .video-wrapper video {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .status {
                    text-align: center;
                    color: #333;
                    margin: 1rem 0;
                    font-style: italic;
                }
                .controls {
                    text-align: center;
                }
                .btn {
                    padding: 0.8rem 2rem;
                    font-size: 1.1rem;
                    border: none;
                    border-radius: 25px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin: 0.5rem;
                }
                .btn-primary {
                    background: #ffb700;
                    color: #fff;
                }
                .btn-primary:hover {
                    background: #ff7b00;
                }
                .btn-danger {
                    background: #ff4444;
                    color: #fff;
                }
                .btn-danger:hover {
                    background: darkred;
                }
                .logo {
                    text-align: center;
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #ffb700;
                }
            `}</style>
        </div>
    );
}
