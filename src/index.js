/*

import 'dotenv/config'; 
import { generateImage } from "./stabilityClient.js";
import { xClient } from "./xClient.js"; // Yeni eklenen X Client import'u

async function main() {
  console.log("======================");
  console.log("🚀 Stability to X Bot");
  console.log("======================");

  // Üretilecek resim ve tweet metni için prompt
  const prompt = "A highly detailed, photorealistic image of a majestic orange tabby cat holding a gleaming silver sword. The cat stands on its hind legs, gripping the hilt of the sword firmly with its front paws. Its fur is rich and textured, with distinct stripes and whiskers. The cat's expression is serious and determined, with intelligent, amber eyes. It wears a subtly detailed, dark leather harness over its chest. The setting is a sun-dappled, ancient forest floor, with moss-covered rocks and shafts of light filtering through tall trees in the background, creating a sense of adventure and realism.";

  try {
    // 1. ADIM: Resmi Oluştur ve Kaydet
    const imagePath = await generateImage(prompt);
    console.log("🎉 Resim başarıyla oluşturuldu ve kaydedildi:", imagePath);
    console.log("Şimdi görsel X'e yükleniyor...");

    // 2. ADIM: Resmi X'e Medya Olarak Yükleme
    // xClient.v1.uploadMedia, dosya yolunu alıp medyayı yüklüyor ve bir ID döndürüyor.
    const mediaId = await xClient.v1.uploadMedia(imagePath);
    console.log("☁️ Medya başarıyla yüklendi. Media ID:", mediaId);

    // 3. ADIM: Tweet Metnini Hazırlama ve Gönderme
    // Prompt çok uzun olduğu için tweet metninde kısaltarak kullanıyoruz.
    const tweetText = `A brand new AI creation: ${prompt.slice(0, 200)}...\n\n#AIArt #Dachshund #StabilityAI #ImageGeneration`;

    await xClient.v2.tweet({
      text: tweetText,
      media: { media_ids: [mediaId] } // Yüklediğimiz medya ID'sini tweete ekliyoruz
    });

    console.log("\n✅ **Tweet başarıyla gönderildi!**");

  } catch (err) {
    console.error("\n❌ Hata:", err.message);
    if (err.data) {
        console.error("API Hatası Detayı:", JSON.stringify(err.data, null, 2));
    }
  }
}

main();


*/


import 'dotenv/config'; 
import { xClient } from "./xClient.js"; 
import fs from "fs";
import path from "path"; 
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// ES Module için __dirname oluşturma
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔑 Gemini API İstemcisini Başlatma
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// GÖRSELİN BULUNDUĞU KLASÖR TANIMI (src üstüne çık → output)
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// output klasörü yoksa uyarı ver ve çık
if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`ℹ️ Output klasörü bulunamadı: ${OUTPUT_DIR}`);
    console.log("Programı çalıştırmadan önce output klasörünü oluşturun ve görselleri buraya koyun.");
    process.exit(1);
}

// 🛠️ Resmi Base64 formatına dönüştürme
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

async function main() {
  console.log("======================");
  console.log("🚀 X Bot - Otomatik Galeri Modu");
  console.log("======================");

  try {
        console.log(`🔍 ${OUTPUT_DIR} klasörü taranıyor...`);
        
        const files = fs.readdirSync(OUTPUT_DIR).sort();
        const imageFiles = files.filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp')
        );

        if (imageFiles.length === 0) {
            console.log("ℹ️ Klasörde işlenecek görsel bulunamadı. Program sonlandırılıyor.");
            return;
        }
        
        const selectedFileName = imageFiles[0];
        const imagePath = path.join(OUTPUT_DIR, selectedFileName);
        const mimeType = `image/${path.extname(selectedFileName).slice(1)}`;
        
        console.log(`✅ İşlenecek görsel seçildi: ${imagePath}`);

        const imagePart = fileToGenerativePart(imagePath, mimeType);

        const systemInstruction = "Sen bir sosyal medya yöneticisisin. Sana gönderilen görseli analiz et. Yanıtın SADECE iki satır olmalıdır: ilk satırda görsele uygun, dikkat çekici tweet metni (maksimum 250 karakter); ikinci satırda ise bu metne uygun 5 adet popüler hashtag (virgül veya boşlukla ayrılmış, # işaretli) yer almalıdır. Başka hiçbir açıklama, giriş veya sonuç cümlesi KULLANMA. ve tamamen ingilizce olacak. flörtöz ve yaramazca yaz. emoji kullanma. ";

        const userPrompt = "Bu görsele dayanarak, tamamen ingilizce bir tweet metni ve 5 hashtag oluştur.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [imagePart, userPrompt], 
            config: { systemInstruction }
        });

        const fullResponseText = response.text.trim();
        const [tweetCaption, hashtagLine] = fullResponseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        if (!tweetCaption || !hashtagLine) {
            throw new Error(`API yanıt formatı geçersiz. Ham Yanıt: ${fullResponseText}`);
        }

        const finalTweetText = `${tweetCaption}\n\n${hashtagLine}`;
        console.log("✅ Gemini'den alınan Tweet metni ve Hashtag'ler:\n", finalTweetText);

        const mediaId = await xClient.v1.uploadMedia(imagePath);
        console.log("☁️ Medya başarıyla X'e yüklendi. Media ID:", mediaId);

        await xClient.v2.tweet({
          text: finalTweetText, 
          media: { media_ids: [mediaId] } 
        });

        console.log("\n✅ **Tweet başarıyla gönderildi!** Twitter hesabınızı kontrol edin.");

        fs.unlinkSync(imagePath);
        console.log(`🗑️ İşlenen görsel başarıyla silindi: ${imagePath}`);

  } catch (err) {
    console.error("\n❌ Hata:", err.message);
    if (err.data) {
        console.error("API Hatası Detayı:", JSON.stringify(err.data, null, 2));
    }
  }
}

main();
