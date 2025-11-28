// xClient.js
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
import path from "path";

// .env dosyasının ana klasörden yüklenmesini garanti et
dotenv.config({ path: path.resolve('../.env') });

// API Key kontrolü (Anahtarların .env'de var olduğundan emin ol)
const requiredKeys = ["X_APP_KEY", "X_APP_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"];
const missingKeys = requiredKeys.filter(key => !process.env[key]);

if (missingKeys.length > 0) {
console.error(`❌ X API keyleri eksik: ${missingKeys.join(", ")}`);
process.exit(1);
}

// X (Twitter) Client'ı oluşturuyoruz
const client = new TwitterApi({
appKey: process.env.X_APP_KEY,
appSecret: process.env.X_APP_SECRET,
accessToken: process.env.X_ACCESS_TOKEN,
accessSecret: process.env.X_ACCESS_SECRET,
});

// Yazma yetkisi olan client'ı dışa aktarıyoruz
export const xClient = client.readWrite;
