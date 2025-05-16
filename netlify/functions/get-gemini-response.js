// netlify/functions/get-gemini-response.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    // Chỉ cho phép phương thức POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // Lấy câu hỏi của người dùng và lịch sử chat từ body của request
        const { userMessage, history } = JSON.parse(event.body);
        
        // Lấy API key từ biến môi trường đã cài đặt trên Netlify
        const apiKey = process.env.GEMINI_API_KEY;

        // Kiểm tra xem API key có tồn tại không
        if (!apiKey) {
            console.error("Lỗi: Biến môi trường GEMINI_API_KEY chưa được cài đặt.");
            return { statusCode: 500, body: JSON.stringify({ error: "API key chưa được cấu hình trên server." }) };
        }

        // Kiểm tra xem userMessage có được gửi không
        if (!userMessage) {
            return { statusCode: 400, body: JSON.stringify({ error: "Thiếu tham số 'userMessage'." }) };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro", // Hoặc "gemini-1.5-flash-latest" nếu bạn muốn nhanh hơn và có thể ít chính xác hơn một chút
            // Cài đặt an toàn (tùy chọn, nhưng nên có)
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
        });

        // Tạo một session chat với lịch sử (nếu có)
        // Định dạng history: [{ role: "user", parts: [{text: "..."}] }, { role: "model", parts: [{text: "..."}] }]
        const chatSession = model.startChat({
            history: history || [], // Sử dụng lịch sử nếu có, không thì mảng rỗng
            generationConfig: {
                maxOutputTokens: 250, // Giới hạn số token trả về để tiết kiệm và nhanh hơn
                temperature: 0.7,    // Độ "sáng tạo" của câu trả lời (0.0 - 1.0)
            },
        });

        // Gửi tin nhắn của người dùng đến session chat
        const result = await chatSession.sendMessage(userMessage);
        const response = result.response;
        const text = response.text();

        // Trả về câu trả lời của bot
        return {
            statusCode: 200,
            body: JSON.stringify({ botResponse: text }),
        };

    } catch (error) {
        console.error("Lỗi khi gọi API Gemini:", error);
        // Trả về lỗi chung nếu có vấn đề
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Đã có lỗi xảy ra khi liên lạc với AI: " + error.message }),
        };
    }
};