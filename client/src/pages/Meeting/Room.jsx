import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from 'react-hot-toast'
import Peer from "simple-peer";
import { useSocket } from "../../context/SocketContext";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaCopy, FaShareAlt, FaBars, FaTimes } from "react-icons/fa";
import { useUser } from "../../context/UserContextApi";

const Room = () => {
    const { id: roomID } = useParams();
    const { user } = useUser();
    const userData = user?.user;
    const socket = useSocket();
    const navigate = useNavigate();
    const [peers, setPeers] = useState([]);
    const [roomFull, setRoomFull] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [users, setUsers] = useState([]); // To store users in the room
    const userVideoRef = useRef();
    const peersRef = useRef({});
    // console.log("User data:", users);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            if (!stream) {
                console.error("Stream is undefined");
                return;
            }
            userVideoRef.current.srcObject = stream;

            // Emit the join room event with roomID and userData
            socket.emit("join room", roomID, userData);

            // Handle the list of all users in the room
            const handleAllUsers = (users) => {
                setUsers(users); // Update the users state
                const peers = [];
                users.forEach((user) => {
                    if (!peersRef.current[user.socketId]) {
                        const peer = createPeer(user.socketId, socket.id, stream); // Pass user.socketId
                        peersRef.current[user.socketId] = { peer, id: user.socketId }; // Store peer in peersRef as an object
                        peers.push({ peer, id: user.socketId }); // Add peer to the peers array
                    }
                });
                setPeers(peers); // Update the peers state
            };

            // Handle a new user joining the room

            const handleUserJoined = (payload) => {
                setUsers((prevUsers) => [...prevUsers, payload.user]); // Update the users state
                //console.log(`User joined: ${JSON.stringify(payload)}`);
                toast.success(`User joined: ${JSON.stringify(payload?.user?.username)}`);
                const peer = addPeer(payload.signal, payload.callerID, stream);
                // Store the peer in peersRef using the callerID as the key
                peersRef.current[payload.callerID] = {
                    peer,
                    id: payload.callerID,
                };
                // Update the peers state
                setPeers((prevPeers) => [
                    ...prevPeers,
                    { peer, id: payload.callerID },
                ]);
            };

            // Handle receiving a returned signal
            const handleReceivingReturnedSignal = (payload) => {
                console.log(`Receiving returned signal from user: ${payload.id}`);
                const peerObj = peersRef.current[payload.id]; // Retrieve the peer object
                if (peerObj && peerObj.peer) {
                    peerObj.peer.signal(payload.signal); // Access the actual Peer instance and call .signal()
                } else {
                    console.error(`Peer not found for user: ${payload.id}`);
                }
            };

            // Handle a user leaving the room
            const handleUserLeft = ({ socketId, username }) => {
                console.log(`User left: ${username} (${socketId})`);
                toast.success(`${username} has left the room.`);
                // Remove the user from the `users` state
                setUsers((prevUsers) => prevUsers.filter((user) => user.username !== username));
                cleanupPeer(socketId);
            };

            // Handle the room being full
            const handleRoomFull = () => {
                setRoomFull(true);
                toast.error("Room is full. Please try again later.");
            };

            // Handle socket disconnection
            const handleSocketDisconnect = () => {
                console.log("Socket disconnected. Cleaning up all peers.");
                Object.keys(peersRef.current).forEach((peerID) => {
                    if (peersRef.current[peerID]) {
                        cleanupPeer(peerID);
                    }
                });
            };

            // Socket event listeners
            socket.on("all users", handleAllUsers);
            socket.on("user joined", handleUserJoined);
            socket.on("receiving returned signal", handleReceivingReturnedSignal);
            socket.on("user-left", handleUserLeft);
            socket.on("room full", handleRoomFull);
            socket.on("disconnect", handleSocketDisconnect);

            // Cleanup on component unmount
            return () => {
                socket.off("all users", handleAllUsers);
                socket.off("user joined", handleUserJoined);
                socket.off("receiving returned signal", handleReceivingReturnedSignal);
                socket.off("user-left", handleUserLeft);
                socket.off("room full", handleRoomFull);
                socket.off("disconnect", handleSocketDisconnect);

                // Cleanup all peers
                Object.keys(peersRef.current).forEach((peerID) => cleanupPeer(peerID));
            };
        }).catch((err) => {
            console.error("Error accessing media devices:", err);
        });
    }, [roomID, socket]);

    const cleanupPeer = (peerID) => {
        console.log(`Cleaning up peer: ${peerID}`);
        const peerObj = peersRef.current[peerID]; // Access the peer directly using the key
        if (peerObj) {
            peerObj.peer.destroy(); // Destroy the peer connection
            delete peersRef.current[peerID]; // Remove the peer from peersRef
            setPeers((prevPeers) => prevPeers.filter((p) => p.id !== peerID)); // Update the peers state
        }
    };


    const createPeer = (userToSignal, callerID, stream) => {
        console.log(`Creating peer for user: ${userToSignal}`, `caller Id =`, callerID);
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", (signal) => {
            if (!signal) {
                console.error("Signal is undefined");
                return;
            }
            console.log(`Sending signal to user: ${userToSignal}`);
            socket.emit("sending signal", { userToSignal, callerID, userData, signal });
        });

        peer.on("close", () => {
            console.log(`Peer connection closed for user: ${userToSignal}`);
            cleanupPeer(userToSignal);
        });

        peer.on("stream", (remoteStream) => {
            setPeers((prevPeers) => [
                ...prevPeers.filter((p) => p.id !== userToSignal), // Prevent duplicate
                { peer, stream: remoteStream, id: userToSignal }
            ]);
        });


        peersRef.current[userToSignal] = peer;
        return peer;
    };

    const addPeer = (incomingSignal, callerID, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on("signal", (signal) => {
            if (!signal) {
                console.error("Signal is undefined");
                return;
            }
            socket.emit("returning signal", { signal, callerID });
        });

        peer.on("stream", (remoteStream) => {
            setPeers((prevPeers) => [
                ...prevPeers.filter((p) => p.id !== callerID), // Prevent duplicate
                { peer, stream: remoteStream, id: callerID }
            ]);
        });

        peer.on("close", () => {
            console.log(`Peer connection closed for user: ${callerID}`);
            cleanupPeer(callerID);
        });


        peer.signal(incomingSignal);
        peersRef.current[callerID] = peer;
        return peer;
    };

    const toggleMute = () => {
        setIsMuted((prev) => !prev);
        userVideoRef.current.srcObject.getAudioTracks()[0].enabled = isMuted;
    };

    const toggleVideo = () => {
        setIsVideoOff((prev) => !prev);
        userVideoRef.current.srcObject.getVideoTracks()[0].enabled = isVideoOff;
    };

    const leaveCall = () => {
        cleanupPeer(socket.id)
        navigate("/");
        window.location.reload();

    };

    const copyMeetingID = () => {
        navigator.clipboard.writeText(roomID);
        toast.success("Meeting ID copied to clipboard!");
    };

    const shareMeeting = () => {
        const shareData = {
            title: "Join My Meeting",
            text: `Join my meeting using this ID: ${roomID}`,
            url: window.location.href,
        };
        navigator.share(shareData).catch((err) => console.error("Error sharing:", err));
    };

    if (roomFull) {
        return <div>Room is full, please try again later.</div>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 font-sans">
            {/* Top Bar */}
            <div className="sticky top-0 z-50 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 shadow-md">
                <div className="flex items-center space-x-3">
                    <span className="font-semibold text-lg">📞 Meeting ID:</span>
                    <span className="bg-indigo-800 px-3 py-1 rounded-md text-sm shadow-md">{roomID}</span>
                    <button onClick={copyMeetingID} className="hover:text-yellow-300 transition">
                        <FaCopy />
                    </button>
                    <button onClick={shareMeeting} className="hover:text-yellow-300 transition">
                        <FaShareAlt />
                    </button>
                </div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:text-yellow-300 transition text-2xl">
                    {sidebarOpen ? <FaTimes /> : <FaBars />}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 relative">
                {/* Sidebar */}
                {sidebarOpen && (
                    <div className="fixed inset-y-0 left-0 w-72 bg-white bg-opacity-60 backdrop-blur-lg rounded-r-3xl p-4 shadow-2xl z-100 overflow-y-auto transition-transform duration-300
                     bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100">
                        <div className="flex justify-between items-center mb-4 bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-400 p-2 rounded-tr-2xl">
                            <h2 className="text-xl font-bold text-gray-800">👥 Users in Room</h2>
                            
                        </div>
                        <ul className="space-y-3">
                            {users.map((user) => (
                                <li key={user?.username} className="flex justify-between items-center p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition shadow-sm">
                                    <span className="font-medium text-gray-700">{user?.username}</span>
                                    <div className="flex space-x-2">
                                        <button className="text-red-500 hover:text-red-700"><FaPhoneSlash /></button>
                                        <button className="text-yellow-500 hover:text-yellow-700"><FaMicrophone /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Video Flex Layout */}
                <div className="flex flex-wrap justify-center items-center gap-4 p-2 w-full">
                    {/* User's own video */}
                    <video
                        muted
                        ref={userVideoRef}
                        autoPlay
                        playsInline
                        className="rounded-3xl shadow-xl object-cover border-4 border-indigo-400 hover:scale-105 transition
               w-[calc(50%-16px)] sm:w-[calc(25%-16px)]"
                    />
                    {/* Other users' videos */}
                    {peers.map(({ id, stream }) => (
                        <video
                            key={id}
                            autoPlay
                            playsInline
                            ref={(videoElement) => {
                                if (videoElement && stream) {
                                    videoElement.srcObject = stream;
                                }
                            }}
                            className="rounded-3xl shadow-xl object-cover border-4 border-indigo-400 hover:scale-105 transition
                 w-[calc(50%-16px)] sm:w-[calc(25%-16px)]"
                        />
                    ))}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="sticky bottom-0 z-50 flex items-center justify-center space-x-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 shadow-inner">
                <div
                    onClick={toggleMute}
                    className="bg-white rounded-full flex p-3 border-2 border-pink-400 cursor-pointer hover:shadow-xl hover:scale-110 transition">
                    <button className="text-2xl text-green-500 hover:text-red-500 transition">
                        {isMuted ? <FaMicrophoneSlash className="text-red-500" /> : <FaMicrophone />}
                    </button>
                </div>
                <div
                    onClick={toggleVideo}
                    className="bg-white rounded-full flex  p-3 border-2 border-pink-400 cursor-pointer hover:shadow-xl hover:scale-110 transition">
                    <button className="text-2xl text-green-500 hover:text-red-500 transition">
                        {isVideoOff ? <FaVideoSlash className="text-red-500" /> : <FaVideo />}
                    </button>
                </div>
                <div
                    onClick={leaveCall}
                    className="bg-white rounded-full flex  p-3 border-2 border-red-500 cursor-pointer hover:shadow-xl hover:scale-110 transition">
                    <button className="text-2xl text-red-600 hover:text-red-800 transition">
                        <FaPhoneSlash />
                    </button>
                </div>
            </div>

            <Toaster position="top-center" />
        </div>


    );
};

export default Room;
