import { auth, provider } from "../firebase-config.js";
import { signInWithPopup } from "firebase/auth";
import "../styles/Auth.css";
import Cookies from "universal-cookie";

const cookies = new Cookies();

export const Auth = ({ setIsAuth }) => {
 const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("Signed in user:", {
      name: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
    });

    cookies.set("auth-token", user.refreshToken);
    setIsAuth(true);
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="auth">
      <p> Sign In With Google To Continue </p>
      <button onClick={signInWithGoogle}> Sign In With Google </button>
    </div>
  );
};
