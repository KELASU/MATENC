import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Fstore } from '../../FirebaseConfig';

export const addFavorite = async (uid, type, item) => {
  const ref = doc(Fstore, 'users', uid);
  try {
    await updateDoc(ref, {
      [`favorites.${type}`]: arrayUnion(item),
    });
  } catch (e) {
    console.error(`Error adding to favorites (${type}):`, e);
  }
};

export const removeFavorite = async (uid, type, item) => {
  const ref = doc(Fstore, 'users', uid);
  try {
    await updateDoc(ref, {
      [`favorites.${type}`]: arrayRemove(item),
    });
  } catch (e) {
    console.error(`Error removing from favorites (${type}):`, e);
  }
};
