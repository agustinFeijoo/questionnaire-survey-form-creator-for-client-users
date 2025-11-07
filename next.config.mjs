/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_SECRET: "theSecurityForOnlineTaxmanIsVeryImportantForHackersToNotHackUs",
    NEXTAUTH_URL: "https://app.onlinetaxman.com",
    XAPIKEY: "Xa7PQmNt9Vh13-ZKDwUExaGqJ8lLMzv2-RtNHbyAOfk",
    AUTH_SECRET: "theSecurityForOnlineTaxmanIsVeryImportantForHackersToNotHackUsAuthSecret",
    ENCRYPTION_KEY: "OTM55678901234567890123456789012",
    STATIC_IV: "1237567890123666",
    NEXT_PUBLIC_APIKEY: "AIzaSyDGdQz8qPA4EpXS7vYf6ZAHKo3n5p3ri_M",
    NEXT_PUBLIC_AUTHDOMAIN: "onlinetaxman-c6d0f.firebaseapp.com",
    NEXT_PUBLIC_PROJECTID: "onlinetaxman-c6d0f",
    NEXT_PUBLIC_STORAGEBUCKET: "onlinetaxman-c6d0f.appspot.com",
    NEXT_PUBLIC_MESSAGINGSENDERID: "265362408287",
    NEXT_PUBLIC_APPID: "1:265362408287:web:f4e5cc7b859de453f1acea",
    //NEXT_PUBLIC_RECAPTCHA_SITE_KEY_APP_CHECK:"6LdB8AIrAAAAACxUf3Y_fiIeNiwtz6_H7U9b4sUH",
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY_APP_CHECK:"6Lf-QAUrAAAAAC27v143F0SpzXCMeCvGb9OLMYSM",

    // 👇 Add this line
    NEXT_PUBLIC_ALLOWED_DEV_ORIGIN: "http://186.123.144.96"
  }
};

export default nextConfig;
