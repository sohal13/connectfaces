import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Users } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useUser } from '../../context/UserContextApi';
import toast, { Toaster } from 'react-hot-toast';
import Peer from 'simple-peer';
import apiClient from '../../apiClient';

export default function Meeting() {
    const socket = useSocket();
    const { user } = useUser();
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const userId = user?.user?.id;

    const [copied, setCopied] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [users, setUsers] = useState([]);
    const userVideoRef = useRef(); // Local video stream
    const peersRef = useRef([]); // Keep track of peers
    const [remoteStreams, setRemoteStreams] = useState([]); // Store remote streams for rendering

    // Check if the roomId is valid
    useEffect(() => {
        const checkRoomId = async () => {
            try {
                const response = await apiClient.get(`/room/${roomId}`);
                const data = response.data;
                if (!data.success) {
                    toast.error("Invalid room ID");
                    navigate("/");
                }
            } catch (error) {
                console.error("Error checking room ID:", error?.response?.data?.message);
                toast.error(error?.response?.data?.message || "Error checking room ID");
                navigate("/");
            }
        };
        checkRoomId();
    }, [roomId]);

    // Handle socket events and signaling
    useEffect(() => {
        if (!socket || !roomId || !userId) return;

        // Emit "join-room" event
        socket.emit("join-room", { roomId, userId });

        // Listen for "user-joined" event
        socket.on("user-joined", ({ userId, username, socketId }) => {
            toast.success(`${username} joined the room`);
        });

        // Listen for "room-users" event
        socket.on("room-users", (users) => {
            setUsers(users);
            users.forEach(({ userId: peerId, socketId }) => {
                socket.on("room-users", (users) => {
                    console.log("Room users received:", users); // Debugging
                    users.forEach(({ userId: peerId, socketId }) => {
                        console.log("Setting up peer for:", { peerId, socketId }); // Debugging
                        if (peerId !== userId) {
                            const existingPeer = peersRef.current.find(p => p.peerId === peerId);
                            if (!existingPeer) {
                                const peer = createPeer(socketId, userVideoRef.current.srcObject);
                                peersRef.current.push({ peerId, peer });
                            }
                        }
                    });
                });
                if (peerId !== userId) {
                    const existingPeer = peersRef.current.find(p => p.peerId === peerId);
                    if (!existingPeer) {
                        const peer = createPeer(socketId, userVideoRef.current.srcObject);
                        peersRef.current.push({ peerId, peer });
                    }
                }
            });
        });

        // Handle WebRTC signaling
        socket.on("signal", ({ from, signal }) => {
            console.log("Received signal from:", from, signal); // Debugging
            let peer = peersRef.current.find(p => p.peerId === from);
            if (peer) {
                peer.peer.signal(signal);
            } else {
                console.error("Peer not found for userId:", from);
                peer = addPeer(signal, from, userVideoRef.current.srcObject); // Call addPeer
                peersRef.current.push({ peerId: from, peer });
            }
        });

        // Handle user leaving
        socket.on("user-left", (peerId) => {
            console.log("User left:", peerId);
            peersRef.current = peersRef.current.filter(p => p.peerId !== peerId);
            setRemoteStreams(prevStreams => prevStreams.filter(stream => stream.peerId !== peerId));
        });

        // Cleanup listeners on component unmount
        return () => {
            socket.off("user-joined");
            socket.off("room-users");
            socket.off("signal");
            socket.off("user-left");
        };
    }, [socket, roomId, userId]);

    // Initialize local video stream
    useEffect(() => {
        const initializeLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                    },
                });
                console.log("Local stream initialized:", stream); // Debugging
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = stream;
                    userVideoRef.current.muted = true;
                }
            } catch (err) {
                console.error("Error accessing media devices:", err);
                toast.error("Failed to access camera or microphone.");
            }
        };

        initializeLocalStream();
    }, []);

    // Create a new peer connection
    const createPeer = (socketId, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            console.log("Sending signal to socketId:", socketId, signal); // Debugging
            socket.emit("signal", { to: socketId, from: socket.id, signal });
        });

        peer.on("stream", remoteStream => {
            console.log("Received remote stream:", remoteStream); // Debugging
            setRemoteStreams(prevStreams => [
                ...prevStreams,
                { peerId: socketId, stream: remoteStream },
            ]);
        });

        peer.on("error", err => {
            console.error("Peer error:", err);
        });

        return peer;
    };
    console.log(remoteStreams);

    // Add a peer when receiving a signal
    const addPeer = (signal, socketId, stream) => {
        console.log("Adding peer for socketId:", socketId); // Debugging
        const peer = new Peer({
            initiator: false, // Non-initiator mode
            trickle: false,
            stream,
        });
    
        peer.on("signal", signal => {
            console.log("Sending signal to socketId:", socketId, signal); // Debugging
            socket.emit("signal", { to: socketId, from: socket.id, signal });
        });
    
        peer.on("stream", remoteStream => {
            console.log("Received remote stream:", remoteStream); // Debugging
            setRemoteStreams(prevStreams => [
                ...prevStreams,
                { peerId: socketId, stream: remoteStream },
            ]);
        });
    
        peer.on("error", err => {
            console.error("Peer error:", err);
        });
    
        peer.signal(signal); // Pass the received signaling data to the peer
        return peer;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
            <div className="flex justify-between items-center px-2 py-2 bg-white shadow">
                <h2 className="text-sm font-semibold text-indigo-700">
                    MeetingID: <span className="text-lg">{roomId}</span>
                </h2>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 ${copied ? "bg-green-600" : "bg-indigo-600"
                            } hover:bg-indigo-700 text-white px-4 py-2 rounded-lg`}
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={() => setShowSidebar(prev => !prev)}
                        className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                    >
                        <Users size={18} />
                    </button>
                </div>
            </div>

            {/* Local video */}
            <video ref={userVideoRef} autoPlay muted className="w-full h-auto" />

            {/* Remote videos */}
            <div className="grid grid-cols-2 gap-4">
                {remoteStreams.map(({ peerId, stream }, index) => (
                    <video
                        key={peerId || index}
                        autoPlay
                        playsInline
                        ref={video => {
                            if (video) {
                                video.srcObject = stream;
                            }
                        }}
                        className="w-full h-auto"
                    />
                ))}
            </div>

            <Toaster position="top-center" reverseOrder={false} />
        </div>
    );
}