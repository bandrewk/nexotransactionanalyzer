[![Node.js CI](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/bandrewk/nexotransactionanalyzer/actions/workflows/node.js.yml)
# nexo-ta.com

Web analyzer app for the Nexo.io crypto platform. Upload and analyze your exported transaction `.csv` files.

Version >= 2.0 is using Typescript and React.

## Build

If you'd like to host the app in your own environment here's how:

```
git clone https://github.com/bandrewk/nexotransactionanalyzer
cd nexotransactionanalyzer
npm install
npm start
```

Edit the `firebase.tsx` file in `./src/`:

```
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "<Your data>",
  authDomain: "<Your data>",
  projectId: "<Your data>",
  storageBucket: "<Your data>",
  messagingSenderId: "<Your data>",
  appId: "<Your data>",
  measurementId: "<Your data>",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const storage = getFirestore(app);

// Dummy to get firebase executed
export const initFirebase = () => {
  console.log(`Initializing firebase..`);
};
```

You`ll need to create a database that contains all available currencies like this:

![Firebase database layout](https://static.nexo-ta.com/database.png)

I will try to supply an importable database in the future or switch to some more shareable type.

## Support development

ETH: 0x6aa9da4a0f149a140f6813cbd84e1ee2df05e76e  
BTC: bc1q5sl35at30wtftl4je7p0pwwxhwtekfe23602tj  
RVN: RCJ92C29iZimha5H4Lw3GwKQQNiCMdd5dh

## Deprecated versions

V1: [v1.nexo-ta.com](https://v1.nexo-ta.com/)
