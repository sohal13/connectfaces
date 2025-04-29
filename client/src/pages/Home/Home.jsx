import { useState } from 'react';
import { VideoIcon, UsersIcon, CalendarIcon, ShieldCheckIcon } from 'lucide-react';
import { ImCancelCircle } from "react-icons/im";
import toast, { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion';
import heroImg from '../../assets/heroimg.png';
import apiClient from '../../apiClient';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContextApi';


export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [meetingCode, setMeetingCode] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [password, setPassword] = useState('');

  const handleJoin = async () => {
    try {
      const res = await apiClient.post(`/room/join`, { roomId: meetingCode, password: password });
      const data = res.data;
      if (!data.sucess) {
        toast.success(data.message)
      }
      navigate(`/meeting/${data.data}`)
    } catch (error) {
      console.log(error);
      toast.error(error.message)
    }
  };

  const handleStartMeeting = async () => {
    try {
      const res = await apiClient.post(`/room/create`, { password: password });
      const data = res.data;
      if (data.status !== 200) {
        toast.error(data.message)
      }
      console.log(data);

      navigate(`/meeting/${data.data.roomId}`)
    } catch (error) {
      console.log(error);
      toast.error(error.message)
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-100 to-blue-100 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-0"
      >
        <h1 className="text-5xl font-black text-indigo-800 mb-4">ConnectFace</h1>
        <p className="text-gray-700 text-xl max-w-2xl mx-auto font-medium">
          Hellow👋 <span className='font-black'>{user?.user?.username}!!</span> Create or join HD group video calls in one click. Lightning fast. Ultra secure. Stunning quality.
        </p>
      </motion.div>

      <motion.img
        src={heroImg}
        alt="Video Call Illustration"
        className="w-full max-w-xl mb-0"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="flex flex-col md:flex-row items-center gap-4 w-full max-w-md"
      >
        <input
          type="text"
          placeholder="Enter meeting code"
          value={meetingCode}
          onChange={(e) => setMeetingCode(e.target.value)}
          className="flex-1 w-full px-4 py-2 border border-blue-300 rounded-xl shadow focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={handleJoin} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer">
          Join Meeting
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-6"
      >
        <button
          onClick={() => setShowPopup(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-full shadow-2xl transition-all hover:scale-105"
        >
          <VideoIcon className="inline-block mr-2 cursor-pointer" /> Start a New Meeting
        </button>
      </motion.div>

      {showPopup && (
        <div className="fixed inset-0 bg-gradient-to-br from-sky-100 via-white to-indigo-100  bg-opacity-50 flex items-center justify-center z-50 ">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-11/12 max-w-md text-center relative">
            <h2 className="text-xl font-bold text-indigo-800 mb-4">Start a Meeting</h2>
            <input
              type="text"
              placeholder="Optional password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-indigo-300 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <button
                onClick={() => password ? handleStartMeeting(true) : toast.error('Enter the Password To Start')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl shadow cursor-pointer"
              >
                Start
              </button>
              <button
                onClick={() => handleStartMeeting(false)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl shadow cursor-pointer"
              >
                Start without Password
              </button>
            </div>
            <button onClick={() => setShowPopup(false)} className="text-2xl text-red-500 rounded-full absolute top-0 right-0 cursor-pointer hover:bg-black"><ImCancelCircle /></button>
          </div>
          <Toaster position="top-center" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
        className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center w-full max-w-6xl"
      >
        <div className="bg-white p-6 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
          <UsersIcon className="text-indigo-600 mx-auto mb-3" size={36} />
          <h3 className="font-bold text-indigo-800 text-lg">Group Chats</h3>
          <p className="text-sm text-gray-600 mt-1">Talk to everyone with crystal clear audio and video.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
          <CalendarIcon className="text-indigo-600 mx-auto mb-3" size={36} />
          <h3 className="font-bold text-indigo-800 text-lg">Easy Scheduling</h3>
          <p className="text-sm text-gray-600 mt-1">Schedule and manage your meetings effortlessly.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
          <VideoIcon className="text-indigo-600 mx-auto mb-3" size={36} />
          <h3 className="font-bold text-indigo-800 text-lg">HD Video</h3>
          <p className="text-sm text-gray-600 mt-1">Enjoy lag-free meetings with top-notch quality.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
          <ShieldCheckIcon className="text-indigo-600 mx-auto mb-3" size={36} />
          <h3 className="font-bold text-indigo-800 text-lg">Secure & Private</h3>
          <p className="text-sm text-gray-600 mt-1">We prioritize your privacy with end-to-end encryption.</p>
        </div>
      </motion.div>

      <footer className="mt-16 text-center text-gray-500 text-xs sm:text-sm">
        Made with ❤️ by Sohal Rahaman
      </footer>
      <Toaster position="top-center" />
    </div>
  );
}
