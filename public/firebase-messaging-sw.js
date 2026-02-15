importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDZzHeUNUEsR7FjYlBENbFb0Jd8c0OA9xA",
    authDomain: "gauravs-personal-drive.firebaseapp.com",
    projectId: "gauravs-personal-drive",
    storageBucket: "gauravs-personal-drive.firebasestorage.app",
    messagingSenderId: "866894779077",
    appId: "1:866894779077:web:299e9991c1572f957956ac"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
