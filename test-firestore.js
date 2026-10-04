const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "apptito-44c72"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    console.log("Fetching doc...");
    await getDoc(doc(db, 'petralab_users', 'studente_demo'));
    console.log("Success!");
  } catch (e) {
    console.error("Error code:", e.code);
    console.error("Error message:", e.message);
  }
}
run();
