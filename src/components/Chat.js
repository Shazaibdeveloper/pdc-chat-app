import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase-config";
import {
  collection,
  addDoc,
  where,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import EmojiPicker from "emoji-picker-react";
import "../styles/Chat.css";
const reactionOptions = ["👍", "❤️", "😂", "😮", "😢"];
const notificationSound = new Audio("/notification.mp3"); // Add your own sound file in public folder

export const Chat = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [selectedEmojiMap, setSelectedEmojiMap] = useState({});
const [reactionInfoMap, setReactionInfoMap] = useState({});
const [isTabActive, setIsTabActive] = useState(true);


  const typingRef = collection(db, "typing");
  const messagesRef = collection(db, "messages");
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const lastMessageRef = useRef(null);

useEffect(() => {
  const handleVisibilityChange = () => {
    setIsTabActive(!document.hidden);
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, []);


  useEffect(() => {
    const queryMessages = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );




    const unsubscribe = onSnapshot(queryMessages, (snapshot) => {
      const msgs = [];
     snapshot.docChanges().forEach((change) => {
  if (change.type === "added") {
    const newMsg = change.doc.data();
    if (newMsg.uid !== auth.currentUser.uid) {
     notificationSound.play().catch(() => {}); // Try play once so browser trusts it later

      if (!isTabActive) {
        document.title = `${newMsg.user} sent a message 💬`;

        setTimeout(() => {
          document.title = "React App";
        }, 3000);
      }
    }
  }
});


      snapshot.forEach((doc) => {
        msgs.push({ ...doc.data(), id: doc.id });
      });

      setMessages(msgs);
    });

    const typingQuery = query(typingRef, where("room", "==", room));
    const unsubscribeTyping = onSnapshot(typingQuery, (snapshot) => {
      const usersTyping = [];
      snapshot.forEach((doc) => {
        if (doc.id !== auth.currentUser.uid) {
          usersTyping.push(doc.data().user);
        }
      });
      setTypingUsers(usersTyping);
    });

    return () => {
      unsubscribe();
      unsubscribeTyping();
    };
  }, [room]);

  useEffect(() => {
  if (isTabActive) {
    document.title = "React App";
  }
}, [isTabActive]);

  const handleTyping = async (value) => {
    setNewMessage(value);
    const currentUser = auth.currentUser;

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    if (value.trim() !== "") {
      await setDoc(doc(db, "typing", currentUser.uid), {
        user: currentUser.displayName,
        room,
        timestamp: serverTimestamp(),
      });

      typingTimeout.current = setTimeout(async () => {
        await deleteDoc(doc(db, "typing", currentUser.uid));
      }, 3000);
    } else {
      await deleteDoc(doc(db, "typing", currentUser.uid));
    }
  };
 

const handleSubmit = async (event) => {
  event.preventDefault();
  if (newMessage.trim() === "") return;

  const currentUser = auth.currentUser;
  const userDocRef = doc(db, "users", currentUser.uid);
  const userSnapshot = await getDoc(userDocRef);

  let profileData = {
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL ?? "/pro.png",
  };

  if (userSnapshot.exists()) {
    const data = userSnapshot.data();
    profileData = {
      displayName: data.name || currentUser.displayName,
      photoURL: data.photoURL || "/pro.png",
    };
  }

  await addDoc(messagesRef, {
    text: newMessage,
    createdAt: serverTimestamp(),
    user: profileData.displayName,
    photoURL: profileData.photoURL,
    uid: currentUser.uid,
    room,
    reactions: {},
  });

  await deleteDoc(doc(db, "typing", currentUser.uid));
  setNewMessage("");
  setShowEmojiPicker(false);
};


  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    inputRef.current.focus();
  };

  const getShortName = (fullName) => {
    const parts = fullName.trim().split(" ");
    return parts.length >= 2 ? parts[parts.length - 1] : fullName;
  };

const handleReaction = async (messageId, emoji) => {
  const currentUser = auth.currentUser;
  const message = messages.find((msg) => msg.id === messageId);
  const currentReactions = message.reactions || {};

  // Remove user from all emojis first
  const updatedReactions = {};
  for (const key in currentReactions) {
    updatedReactions[key] = currentReactions[key].filter(
      (uid) => uid !== currentUser.uid
    );
  }

  const alreadyReactedWith = currentReactions[emoji]?.includes(currentUser.uid);

  // Toggle logic
  if (!alreadyReactedWith) {
    updatedReactions[emoji] = [...(updatedReactions[emoji] || []), currentUser.uid];

    // Show message only if user added emoji
   setReactionInfoMap((prev) => ({
  ...prev,
  [messageId]: {
    name: currentUser.displayName,
    uid: currentUser.uid,
    emoji,
  },
}));

  } else {
    // Remove reaction info if user unreacted
    setReactionInfoMap((prev) => {
      const newMap = { ...prev };
      delete newMap[messageId];
      return newMap;
    });
  }

  await updateDoc(doc(db, "messages", messageId), {
    reactions: updatedReactions,
  });

  setSelectedEmojiMap((prev) => ({
    ...prev,
    [messageId]: alreadyReactedWith ? null : emoji,
  }));
};




const renderReactions = (reactions = {}, messageId) => {
  if (hoveredMessageId !== messageId) return null;

  return (
    <div className="reactions">
      {reactionOptions.map((emoji) => {
        const count = reactions[emoji]?.length || 0;
        const reacted = reactions[emoji]?.includes(auth.currentUser.uid);

        return (
          <button
            key={emoji}
            className={`reaction-button ${reacted ? "active" : ""}`}
            onClick={() => handleReaction(messageId, emoji)}
          >
            {emoji} {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

const getUserShortName = (fullName) => {
  const parts = fullName.trim().split(" ");
  return parts.length >= 2 ? parts[parts.length - 1] : fullName;
};

const getReactedNames = (reactionUsers) => {
  return reactionUsers
    .map((uid) => {
      if (uid === auth.currentUser.uid) return "You";

      const user = messages
        .map((msg) => ({
          uid: msg.uid,
          user: msg.user,
        }))
        .find((u) => u.uid === uid);

      return user ? getShortName(user.user) : "Someone";
    })
    .join(", ");
};
  return (
    <div className="chat-app">
      <div className="header">
        <h1>Welcome to {room.toUpperCase()} room <span className="user-name">{getShortName(auth.currentUser?.displayName || "User")}</span></h1>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className="message"
            onMouseEnter={() => setHoveredMessageId(message.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <img
              src={
                message.photoURL && message.photoURL.startsWith("http")
                  ? message.photoURL
                  : "/pro.png"
              }
              alt="avatar"
              className="avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/pro.png";
              }}
            />
           <div className="react-container">
  <span className="user">{getShortName(message.user)}:</span>{" "}
  {message.text}
  {renderReactions(message.reactions, message.id)}

  {/* Show who reacted and with what */}
  
 {message.reactions &&
  Object.entries(message.reactions).map(([emoji, uids]) =>
    uids.length > 0 ? (
      <div className="reaction-info" key={emoji}>
        {getReactedNames(uids)} reacted with {emoji}
      </div>
    ) : null
  )}


</div>

          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="new-message-form">
        <div className="input-area">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            className="new-message-input"
            placeholder="Type your message here..."
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="emoji-button"
          >
            😊
          </button>
        </div>

        {showEmojiPicker && (
          <div className="emoji-picker">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};
