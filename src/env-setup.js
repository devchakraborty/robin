import firebase from 'firebase'
import FB from 'fb'

['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_DATABASE_URL', 'FIREBASE_STORAGE_BUCKET'].forEach((key) => {
  if (process.env[key] == null) {
    throw new Error(`Missing env var ${key}.`)
  }
})

firebase.initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
})

FB.setAccessToken(process.env.FB_ACCESS_TOKEN)
