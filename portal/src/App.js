import React, { useEffect, useState } from 'react';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from 'firebase';
import PayTest from './Payments/PayTest';
import { firebaseConfig } from './config';
import './Styles/firebaseui-styling.global.css';
import './Styles/local.css';

// Configure Firebase.
firebase.initializeApp(firebaseConfig );

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  // Configure FirebaseUI.
  const uiConfig = {
    // Popup signin flow rather than redirect flow.
    signInFlow: 'popup',
    // We will display Google and Facebook as auth providers.
    signInOptions: [
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    callbacks: {
      signInSuccessWithAuthResult: () => { },
      uiShown: () => {
        setCurrentUser({});
      },
    },
  };

  useEffect(() => {
    const unregisterAuthObserver = firebase.auth().onAuthStateChanged(firebaseUser => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        firebase
          .firestore()
          .collection('stripe_customers')
          .doc(firebaseUser.uid)
          .onSnapshot((snapshot) => {
            if (snapshot.data()) {
              setCustomerData(snapshot.data());
              // startDataListeners();
            } else {
              console.warn(
                `No Stripe customer found in Firestore for user: ${firebaseUser.uid}`
              );
            }
          });
      } else {
        setCurrentUser({});
      }
      // } else {
      //   document.getElementById('content').style.display = 'none';
      //   firebaseUI.start('#firebaseui-auth-container', firebaseUiConfig);
      // }

    });
    return () => unregisterAuthObserver(); // Make sure we un-register Firebase observers when the component unmounts.
  }, []);


  // if(loading) {
  //   return(<span>loading...</span>)
  // }
  if (!currentUser) {
    return (<span>loading...</span>)
  }
  if (currentUser && Object.keys(currentUser).length === 0 && currentUser.constructor === Object) {
    return (
      <div className="app">
        <h1>My App</h1>
        <p>Please sign-in:</p>
        <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
      </div>
    );
  }
  return (
    <div className="app">
      <div>
        <h1>My App</h1>
        <p>Welcome {firebase.auth().currentUser.displayName}! You are now signed-in!</p>
        <a onClick={() => firebase.auth().signOut()}>Sign-out</a>

        <PayTest customerData={customerData} currentUser={currentUser} />
      </div>
    </div>
  );
}

export default App;
