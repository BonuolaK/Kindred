import { useEffect, useRef, useState } from 'react';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const rtcTestSocket = new WebSocket(`${protocol}//${window.location.host}/rtctest`);

const MatchCall = () => {
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [userId, setUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    rtcTestSocket.onopen = () => {
      console.log('[RTC-TEST] Connected to /rtctest WebSocket');
    };

    rtcTestSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'rtc-signal') {
        const signalData = message.signalData;
        console.log('[RTC-TEST] Received rtc-signal:', signalData);

        if (!peerConnectionRef.current) {
          await setupPeer(false);
        }

        const peer = peerConnectionRef.current;

        if (signalData.type === 'offer') {
          await peer!.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await peer!.createAnswer();
          await peer!.setLocalDescription(answer);

          rtcTestSocket.send(JSON.stringify({
            type: 'rtc-signal',
            targetUserId: message.fromUserId,
            signalData: answer,
          }));
        } else if (signalData.type === 'answer') {
          await peer!.setRemoteDescription(new RTCSessionDescription(signalData));
        } else if (signalData.candidate) {
          await peer!.addIceCandidate(new RTCIceCandidate(signalData));
        }
      }
    };

    rtcTestSocket.onerror = (err) => {
      console.error('[RTC-TEST] WebSocket error:', err);
    };

    return () => {
      rtcTestSocket.close();
    };
  }, []);

  const registerUser = () => {
    if (userId) {
      rtcTestSocket.send(JSON.stringify({
        type: 'register',
        userId: parseInt(userId),
      }));
      setIsRegistered(true);
    }
  };

  const setupPeer = async (initiator: boolean) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peer.onicecandidate = (event) => {
      if (event.candidate && targetUserId) {
        rtcTestSocket.send(JSON.stringify({
          type: 'rtc-signal',
          targetUserId: parseInt(targetUserId),
          signalData: event.candidate,
        }));
      }
    };

    peer.ontrack = (event) => {
      console.log('[RTC-TEST] Receiving remote track');
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Get local microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    if (localAudioRef.current) {
      localAudioRef.current.srcObject = stream;
    }

    peerConnectionRef.current = peer;

    if (initiator) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      rtcTestSocket.send(JSON.stringify({
        type: 'rtc-signal',
        targetUserId: parseInt(targetUserId),
        signalData: offer,
      }));
    }
  };

  const startCall = async () => {
    if (targetUserId) {
      await setupPeer(true);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Kindred Test - Match Call</h1>

      {!isRegistered ? (
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Enter your User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ marginRight: '0.5rem' }}
          />
          <button onClick={registerUser}>Register</button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Enter Target User ID"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            style={{ marginRight: '0.5rem' }}
          />
          <button onClick={startCall}>Start Call</button>

          <div style={{ marginTop: '2rem' }}>
            <audio ref={localAudioRef} autoPlay muted controls style={{ marginRight: '1rem' }} />
            <audio ref={remoteAudioRef} autoPlay controls />
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchCall;
